import { z } from "zod";
import { CreateRoomBody } from "@workspace/api-zod";
import { DEFAULT_VICTORY_REQUIREMENT } from "@workspace/game-types";

export const UpdateRoomSettingsBody = z.object({
  sessionToken: z.string(),
  eventFrequency: z.enum(["off", "standard", "frequent"]).optional(),
  cinematicMode: z.union([z.literal("standard"), z.literal("epic")]).optional(),
  gameMode: z.union([z.literal("standard"), z.literal("custom")]).optional(),
  blueprintPolicy: z.union([z.literal("none"), z.literal("owned")]).optional(),
});
export const PublicCreateRoomBody = CreateRoomBody.extend({
  eventFrequency: z.enum(["off", "standard", "frequent"]).default("standard"),
  victoryRequirement: z.union([z.literal(15), z.literal(20), z.literal(25)])
    .default(DEFAULT_VICTORY_REQUIREMENT),
  gameMode: z.union([z.literal("standard"), z.literal("custom")]).default("standard"),
  blueprintPolicy: z.union([z.literal("none"), z.literal("owned")]).optional(),
}).superRefine((value, context) => {
  const policy = value.blueprintPolicy ?? (value.gameMode === "custom" ? "owned" : "none");
  if (value.gameMode === "standard" && policy !== "none") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["blueprintPolicy"],
      message: "Standard rooms cannot enable Blueprints",
    });
  }
  if (
    value.gameMode === "standard" &&
    value.victoryRequirement !== DEFAULT_VICTORY_REQUIREMENT
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["victoryRequirement"],
      message: `Standard rooms require ${DEFAULT_VICTORY_REQUIREMENT} Eminence; use a custom room for a shorter match`,
    });
  }
});
