import { pgTable, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull(),
  name: text("name").notNull(),
  sessionToken: text("session_token").notNull().unique(),
  isHost: boolean("is_host").notNull().default(false),
  orderIndex: integer("order_index").notNull().default(0),
  isConnected: boolean("is_connected").notNull().default(false),
  isAi: boolean("is_ai").notNull().default(false),
  aiDifficulty: text("ai_difficulty"),
  avatarId: text("avatar_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
