import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // 'developer' | 'manager'
  teamId: integer("team_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const teams = sqliteTable("teams", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  managerId: integer("manager_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const dailyLogs = sqliteTable("daily_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  tasks: text("tasks").notNull(),
  hours: integer("hours").notNull(),
  minutes: integer("minutes").notNull(),
  mood: integer("mood").notNull(), // 1-5 scale
  blockers: text("blockers"),
  challenges: text("challenges"),
  learnings: text("learnings"),
  tasksCompleted: text("tasks_completed"),
  productivityScore: integer("productivity_score"),
  hoursWorked: integer("hours_worked"),
  reviewStatus: text("review_status").notNull().default('pending'), // 'pending' | 'reviewed'
  managerFeedback: text("manager_feedback"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  reviewedBy: integer("reviewed_by"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'log_reminder' | 'log_reviewed' | 'log_re_edited'
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  team: one(teams, {
    fields: [users.teamId],
    references: [teams.id],
  }),
  dailyLogs: many(dailyLogs),
  notifications: many(notifications),
  reviewedLogs: many(dailyLogs, {
    relationName: "reviewer",
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  manager: one(users, {
    fields: [teams.managerId],
    references: [users.id],
  }),
  members: many(users),
}));

export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  user: one(users, {
    fields: [dailyLogs.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [dailyLogs.reviewedBy],
    references: [users.id],
    relationName: "reviewer",
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  teamId: true,
}).extend({
  confirmPassword: z.string().min(6),
  teamCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
});

export const insertDailyLogSchema = createInsertSchema(dailyLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewStatus: true,
  managerFeedback: true,
  reviewedAt: true,
  reviewedBy: true,
  userId: true,
  challenges: true,
  learnings: true,
  tasksCompleted: true,
  productivityScore: true,
  hoursWorked: true,
}).extend({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  tasks: z.string().min(1, "Tasks cannot be empty"),
  hours: z.number().min(0).max(24),
  minutes: z.number().min(0).max(59),
  mood: z.number().min(1).max(5),
  blockers: z.string().optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const logReviewSchema = z.object({
  feedback: z.string(),
  isReviewed: z.boolean(),
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = z.infer<typeof insertDailyLogSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type LogReview = z.infer<typeof logReviewSchema>;
