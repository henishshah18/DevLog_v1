import { users, teams, dailyLogs, notifications, type User, type InsertUser, type Team, type InsertTeam, type DailyLog, type InsertDailyLog, type Notification, type InsertNotification } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";
import session from "express-session";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Team operations
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamByCode(code: string): Promise<Team | undefined>;
  getTeamById(id: number): Promise<Team | undefined>;
  updateTeamManager(teamId: number, managerId: number): Promise<void>;
  updateUserTeam(userId: number, teamId: number): Promise<void>;
  generateTeamCode(): Promise<string>;
  getTeamMembers(teamId: number): Promise<User[]>;

  // Daily log operations
  createDailyLog(log: InsertDailyLog): Promise<DailyLog>;
  getDailyLog(id: number): Promise<DailyLog | undefined>;
  getUserDailyLogs(userId: number): Promise<DailyLog[]>;
  getTeamDailyLogs(teamId: number): Promise<(DailyLog & { user: User })[]>;
  updateDailyLog(id: number, updates: Partial<DailyLog>): Promise<DailyLog | undefined>;
  deleteDailyLog(id: number): Promise<void>;
  updateLogReview(logId: number, reviewedBy: number, feedback: string, isReviewed: boolean): Promise<void>;

  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;

  // Reports and analytics
  getUsersWithoutTodayLog(date: string): Promise<User[]>;
  getProductivityData(userId: number, startDate: string, endDate: string): Promise<DailyLog[]>;

  sessionStore: session.Store;

  getAvailableTeams(): Promise<{ id: number; name: string; code: string }[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Session store will be set up in auth.ts
    this.sessionStore = {} as session.Store;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    let teamId: number | null = null;

    // If user is a manager, create a new team
    if (insertUser.role === "manager") {
      const teamCode = await this.generateTeamCode();
      const now = new Date();
      const [team] = await db
        .insert(teams)
        .values({
          name: `${insertUser.fullName}'s Team`,
          code: teamCode,
          managerId: 0, // Will be updated after user creation
          createdAt: now,
        })
        .returning();
      teamId = team.id;
    }
    // If user is a developer and has team code, validate and get team
    else if (insertUser.teamCode) {
      const team = await this.getTeamByCode(insertUser.teamCode);
      if (!team) {
        throw new Error("Invalid team code");
      }
      teamId = team.id;
    }

    // Create the user
    const now = new Date();
    const [user] = await db
      .insert(users)
      .values({
        email: insertUser.email,
        password: insertUser.password,
        fullName: insertUser.fullName,
        role: insertUser.role,
        teamId: teamId,
        createdAt: now,
      })
      .returning();

    // If user is a manager, update the team's managerId
    if (insertUser.role === "manager" && teamId) {
      await this.updateTeamManager(teamId, user.id);
    }

    return user;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db
      .insert(teams)
      .values(team)
      .returning();
    return newTeam;
  }

  async getTeamByCode(code: string): Promise<Team | undefined> {
    // Normalize the code by trimming whitespace and converting to uppercase
    const normalizedCode = code.trim().toUpperCase();
    const [team] = await db
      .select()
      .from(teams)
      .where(sql`UPPER(${teams.code}) = ${normalizedCode}`);
    return team || undefined;
  }

  async getTeamById(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async updateUserTeam(userId: number, teamId: number): Promise<void> {
    await db.update(users).set({ teamId }).where(eq(users.id, userId));
  }

  async updateTeamManager(teamId: number, managerId: number): Promise<void> {
    await db
      .update(teams)
      .set({ managerId })
      .where(eq(teams.id, teamId));
  }

  async generateTeamCode(): Promise<string> {
    // Get the count of existing teams
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(teams);
    
    // Generate the next code in sequence (1-based)
    const nextNumber = (result?.count || 0) + 1;
    return `TEAM-${nextNumber.toString().padStart(6, '0')}`;
  }

  async getTeamMembers(teamId: number): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.teamId, teamId));
  }

  async createDailyLog(log: InsertDailyLog): Promise<DailyLog> {
    const now = new Date();
    const [newLog] = await db
      .insert(dailyLogs)
      .values({
        ...log,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return newLog;
  }

  async getDailyLog(id: number): Promise<DailyLog | undefined> {
    const [log] = await db.select().from(dailyLogs).where(eq(dailyLogs.id, id));
    return log || undefined;
  }

  async getUserDailyLogs(userId: number): Promise<DailyLog[]> {
    return await db
      .select()
      .from(dailyLogs)
      .where(eq(dailyLogs.userId, userId))
      .orderBy(desc(dailyLogs.date));
  }

  async getTeamDailyLogs(teamId: number): Promise<(DailyLog & { user: User })[]> {
    const teamMembers = await this.getTeamMembers(teamId);
    const memberIds = teamMembers.map(member => member.id);
    
    if (memberIds.length === 0) return [];

    const logs = await db
      .select({
        id: dailyLogs.id,
        userId: dailyLogs.userId,
        date: dailyLogs.date,
        tasks: dailyLogs.tasks,
        hours: dailyLogs.hours,
        minutes: dailyLogs.minutes,
        mood: dailyLogs.mood,
        blockers: dailyLogs.blockers,
        challenges: dailyLogs.challenges,
        learnings: dailyLogs.learnings,
        tasksCompleted: dailyLogs.tasksCompleted,
        productivityScore: dailyLogs.productivityScore,
        hoursWorked: dailyLogs.hoursWorked,
        reviewStatus: dailyLogs.reviewStatus,
        managerFeedback: dailyLogs.managerFeedback,
        reviewedAt: dailyLogs.reviewedAt,
        reviewedBy: dailyLogs.reviewedBy,
        createdAt: dailyLogs.createdAt,
        updatedAt: dailyLogs.updatedAt,
        user: users,
      })
      .from(dailyLogs)
      .innerJoin(users, eq(dailyLogs.userId, users.id))
      .where(sql`${dailyLogs.userId} IN (${sql.join(memberIds, sql`,`)})`)
      .orderBy(desc(dailyLogs.createdAt));

    return logs;
  }

  async updateDailyLog(id: number, updates: Partial<DailyLog>): Promise<DailyLog | undefined> {
    const [updatedLog] = await db
      .update(dailyLogs)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(dailyLogs.id, id))
      .returning();
    return updatedLog || undefined;
  }

  async deleteDailyLog(id: number): Promise<void> {
    await db.delete(dailyLogs).where(eq(dailyLogs.id, id));
  }

  async updateLogReview(logId: number, reviewedBy: number, feedback: string, isReviewed: boolean): Promise<void> {
    await db
      .update(dailyLogs)
      .set({
        managerFeedback: feedback,
        reviewStatus: isReviewed ? "reviewed" : "pending",
        reviewedBy: isReviewed ? reviewedBy : null,
        reviewedAt: isReviewed ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(dailyLogs.id, logId));
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values({
        ...notification,
        createdAt: new Date(),
      })
      .returning();
    return newNotification;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async getUsersWithoutTodayLog(date: string): Promise<User[]> {
    const usersWithLogs = await db
      .select({ userId: dailyLogs.userId })
      .from(dailyLogs)
      .where(eq(dailyLogs.date, date));

    const userIdsWithLogs = usersWithLogs.map(log => log.userId);

    if (userIdsWithLogs.length === 0) {
      return await db
        .select()
        .from(users)
        .where(eq(users.role, "developer"));
    }

    return await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.role, "developer"),
          sql`${users.id} NOT IN (${userIdsWithLogs.join(',')})`
        )
      );
  }

  async getProductivityData(userId: number, startDate: string, endDate: string): Promise<DailyLog[]> {
    return await db
      .select()
      .from(dailyLogs)
      .where(
        and(
          eq(dailyLogs.userId, userId),
          sql`${dailyLogs.date} >= ${startDate}`,
          sql`${dailyLogs.date} <= ${endDate}`
        )
      )
      .orderBy(dailyLogs.date);
  }

  async getAvailableTeams(): Promise<{ id: number; name: string; code: string }[]> {
    return await db
      .select({
        id: teams.id,
        name: teams.name,
        code: teams.code
      })
      .from(teams)
      .orderBy(teams.name);
  }
}

export const storage = new DatabaseStorage();
