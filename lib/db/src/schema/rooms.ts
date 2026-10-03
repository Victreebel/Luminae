import { check, pgTable, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roomsTable = pgTable("rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  inviteCode: text("invite_code").notNull().unique(),
  hostPlayerId: text("host_player_id"),
  status: text("status").notNull().default("lobby"), // lobby | playing | finished
  maxPlayers: integer("max_players").notNull().default(4),
  turnTimerSeconds: integer("turn_timer_seconds"),
  victoryRequirement: integer("victory_requirement").notNull().default(20),
  cinematicMode: text("cinematic_mode").notNull().default("standard"),
  eventFrequency: text("event_frequency", { enum: ["off", "standard", "frequent"] }).notNull().default("standard"),
  gameMode: text("game_mode").notNull().default("standard"),
  scenarioId: text("scenario_id"),
  blueprintPolicy: text("blueprint_policy").notNull().default("none"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("rooms_event_frequency_check", sql`${table.eventFrequency} IN ('off', 'standard', 'frequent')`),
]);

export const insertRoomSchema = createInsertSchema(roomsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Room = typeof roomsTable.$inferSelect;
