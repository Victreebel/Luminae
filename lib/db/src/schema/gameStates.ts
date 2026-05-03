import { pgTable, integer, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gameStatesTable = pgTable("game_states", {
  roomId: uuid("room_id").primaryKey(),
  state: jsonb("state").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGameStateSchema = createInsertSchema(gameStatesTable);
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type GameState = typeof gameStatesTable.$inferSelect;
