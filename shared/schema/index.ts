import { pgTable, text, serial, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Table Definitions
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(),
  teamId: integer("team_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  managerId: integer("manager_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dailyLogs = pgTable("daily_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  tasks: text("tasks").notNull(),
  hours: integer("hours").notNull(),
  minutes: integer("minutes").notNull(),
  mood: integer("mood").notNull(),
  blockers: text("blockers"),
  reviewStatus: text("review_status").default("pending").notNull(),
  managerFeedback: text("manager_feedback"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(1),
  role: z.enum(["developer", "manager"]),
}).omit({
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