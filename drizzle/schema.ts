import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }).unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const inviteBindings = mysqlTable("inviteBindings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  inviterUserId: int("inviterUserId").notNull(),
  inviteCode: varchar("inviteCode", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const referralRewards = mysqlTable("referralRewards", {
  id: int("id").autoincrement().primaryKey(),
  inviterUserId: int("inviterUserId").notNull(),
  inviteeUserId: int("inviteeUserId").notNull(),
  source: varchar("source", { length: 64 }).notNull().default("team_profit"),
  rateBps: int("rateBps").notNull().default(500),
  baseAmount: decimal("baseAmount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  rewardAmount: decimal("rewardAmount", { precision: 18, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type InviteBinding = typeof inviteBindings.$inferSelect;
export type InsertInviteBinding = typeof inviteBindings.$inferInsert;
export type ReferralReward = typeof referralRewards.$inferSelect;
export type InsertReferralReward = typeof referralRewards.$inferInsert;
