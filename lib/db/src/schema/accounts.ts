import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountsTable = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  email: text("email").unique(),
  passwordHash: text("password_hash").notNull(),
  skipCinematics: boolean("skip_cinematics").notNull().default(false),
  abridgedAnims: boolean("abridged_anims").notNull().default(false),
  hintsEnabled: boolean("hints_enabled").notNull().default(true),
  muted: boolean("muted").notNull().default(false),
  hintsSeen: text("hints_seen").array().notNull().default([]),
  tutorialSeen: boolean("tutorial_seen").notNull().default(false),
  tutorialCompleted: boolean("tutorial_completed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;

export const accountSessionsTable = pgTable("account_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountSessionSchema = createInsertSchema(accountSessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAccountSession = z.infer<typeof insertAccountSessionSchema>;
export type AccountSession = typeof accountSessionsTable.$inferSelect;

export const friendshipsTable = pgTable("friendships", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterId: uuid("requester_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  addresseeId: uuid("addressee_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // pending | accepted | declined
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFriendshipSchema = createInsertSchema(friendshipsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Friendship = typeof friendshipsTable.$inferSelect;

export const passwordResetTokensTable = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokensTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokensTable.$inferSelect;

export const challengesTable = pgTable("challenges", {
  id: uuid("id").primaryKey().defaultRandom(),
  challengerAccountId: uuid("challenger_account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  challengedAccountId: uuid("challenged_account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
  roomId: uuid("room_id").notNull(),
  status: text("status").notNull().default("pending"), // pending | accepted | declined | expired
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;

export const accountEntitlementsTable = pgTable(
  "account_entitlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    source: text("source").notNull().default("test_purchase"),
    receiptId: text("receipt_id").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    accountItemIdx: uniqueIndex("account_entitlements_account_item_idx").on(table.accountId, table.itemId),
    receiptIdx: uniqueIndex("account_entitlements_receipt_idx").on(table.receiptId),
  }),
);

export const insertAccountEntitlementSchema = createInsertSchema(accountEntitlementsTable).omit({
  id: true,
  grantedAt: true,
});
export type InsertAccountEntitlement = z.infer<typeof insertAccountEntitlementSchema>;
export type AccountEntitlement = typeof accountEntitlementsTable.$inferSelect;

export const accountEngagementTable = pgTable("account_engagement", {
  accountId: uuid("account_id").primaryKey().references(() => accountsTable.id, { onDelete: "cascade" }),
  cosmeticBalance: integer("cosmetic_balance").notNull().default(0),
  dailyClaimStreak: integer("daily_claim_streak").notNull().default(0),
  lastDailyClaimDate: text("last_daily_claim_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountEngagementSchema = createInsertSchema(accountEngagementTable);
export type InsertAccountEngagement = z.infer<typeof insertAccountEngagementSchema>;
export type AccountEngagement = typeof accountEngagementTable.$inferSelect;

export const accountCosmeticLoadoutItemsTable = pgTable(
  "account_cosmetic_loadout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    scopeKey: text("scope_key").notNull().default("global"),
    itemId: text("item_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountSlotScopeIdx: uniqueIndex("account_cosmetic_loadout_items_account_slot_scope_idx")
      .on(table.accountId, table.slot, table.scopeKey),
  }),
);

export const accountBlueprintClearanceTable = pgTable("account_blueprint_clearance", {
  accountId: uuid("account_id").primaryKey().references(() => accountsTable.id, { onDelete: "cascade" }),
  qualifyingWins: integer("qualifying_wins").notNull().default(0),
  status: text("status").notNull().default("classified"),
  challengeRoomId: uuid("challenge_room_id"),
  warningSeenAt: timestamp("warning_seen_at", { withTimezone: true }),
  cipherDeactivatedAt: timestamp("cipher_deactivated_at", { withTimezone: true }),
  thresholdApproach: text("threshold_approach"),
  thresholdDialoguePath: text("threshold_dialogue_path").array().notNull().default([]),
  thresholdDialogueResolution: text("threshold_dialogue_resolution"),
  covenantBrokenAt: timestamp("covenant_broken_at", { withTimezone: true }),
  decryptionKeyBypassActiveAt: timestamp("decryption_key_bypass_active_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  vaultRevealSeenAt: timestamp("vault_reveal_seen_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountBlueprintUnlocksTable = pgTable(
  "account_blueprint_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    blueprintId: text("blueprint_id").notNull(),
    source: text("source").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountBlueprintIdx: uniqueIndex("account_blueprint_unlocks_account_blueprint_idx")
      .on(table.accountId, table.blueprintId),
  }),
);

export const accountBlueprintLoadoutsTable = pgTable(
  "account_blueprint_loadouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    slotIndex: integer("slot_index").notNull(),
    blueprintId: text("blueprint_id").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountModeSlotIdx: uniqueIndex("account_blueprint_loadouts_account_mode_slot_idx")
      .on(table.accountId, table.mode, table.slotIndex),
  }),
);

export const accountBlueprintStatsTable = pgTable(
  "account_blueprint_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    blueprintId: text("blueprint_id").notNull(),
    manifestations: integer("manifestations").notNull().default(0),
    triggers: integer("triggers").notNull().default(0),
    armedMatchFinishes: integer("armed_match_finishes").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountBlueprintIdx: uniqueIndex("account_blueprint_stats_account_blueprint_idx")
      .on(table.accountId, table.blueprintId),
  }),
);

export const accountMatchRollupsTable = pgTable(
  "account_match_rollups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    roomId: uuid("room_id").notNull(),
    matchInstanceId: text("match_instance_id").notNull(),
    playerId: uuid("player_id").notNull(),
    result: text("result").notNull(),
    eminence: integer("eminence").notNull().default(0),
    totalPlayers: integer("total_players").notNull().default(0),
    qualifyingBlueprintWin: boolean("qualifying_blueprint_win").notNull().default(false),
    civilizationIdentitySnapshot: jsonb("civilization_identity_snapshot").$type<Record<string, unknown> | null>(),
    finishedAt: timestamp("finished_at", { withTimezone: true }).notNull(),
  },
  (table) => ({
    accountMatchInstanceIdx: uniqueIndex("account_match_rollups_account_match_instance_idx")
      .on(table.accountId, table.matchInstanceId),
  }),
);

export const accountArchiveSummaryTable = pgTable("account_archive_summary", {
  accountId: uuid("account_id").primaryKey().references(() => accountsTable.id, { onDelete: "cascade" }),
  backfillVersion: integer("backfill_version").notNull().default(0),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  ties: integer("ties").notNull().default(0),
  totalEminence: integer("total_eminence").notNull().default(0),
  totalForges: integer("total_forges").notNull().default(0),
  totalAlliances: integer("total_alliances").notNull().default(0),
  highestKardashevType: integer("highest_kardashev_type").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountCivilizationIdentityTable = pgTable("account_civilization_identity", {
  accountId: uuid("account_id").primaryKey().references(() => accountsTable.id, { onDelete: "cascade" }),
  lineage: text("lineage"),
  affinity: text("affinity"),
  signatureArtifactId: text("signature_artifact_id"),
  signatureLuminaryId: text("signature_luminary_id"),
  signatureBlueprintId: text("signature_blueprint_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountCivilizationIdentitySchema = createInsertSchema(accountCivilizationIdentityTable);
export type InsertAccountCivilizationIdentity = z.infer<typeof insertAccountCivilizationIdentitySchema>;
export type AccountCivilizationIdentity = typeof accountCivilizationIdentityTable.$inferSelect;

export const accountArchiveArtifactStatsTable = pgTable(
  "account_archive_artifact_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    artifactId: text("artifact_id").notNull(),
    encounterCount: integer("encounter_count").notNull().default(0),
    forgeCount: integer("forge_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountArtifactIdx: uniqueIndex("account_archive_artifact_stats_account_artifact_idx")
      .on(table.accountId, table.artifactId),
  }),
);

export const accountArchiveLuminaryStatsTable = pgTable(
  "account_archive_luminary_stats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    luminaryId: text("luminary_id").notNull(),
    allianceCount: integer("alliance_count").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountLuminaryIdx: uniqueIndex("account_archive_luminary_stats_account_luminary_idx")
      .on(table.accountId, table.luminaryId),
  }),
);

export const accountCampaignProgressTable = pgTable(
  "account_campaign_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").notNull(),
    currentNodeId: text("current_node_id").notNull().default("first_contact"),
    tutorialCompletedAt: timestamp("tutorial_completed_at", { withTimezone: true }),
    firstContactStance: text("first_contact_stance"),
    lastOnboardingClaimId: uuid("last_onboarding_claim_id"),
    backfillVersion: integer("backfill_version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountCampaignIdx: uniqueIndex("account_campaign_progress_account_campaign_idx")
      .on(table.accountId, table.campaignId),
  }),
);

export const accountCampaignNodesTable = pgTable(
  "account_campaign_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").notNull(),
    nodeId: text("node_id").notNull(),
    status: text("status").notNull().default("locked"),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountCampaignNodeIdx: uniqueIndex("account_campaign_nodes_account_node_idx")
      .on(table.accountId, table.campaignId, table.nodeId),
  }),
);

export const accountCampaignChoicesTable = pgTable(
  "account_campaign_choices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").notNull(),
    claimId: uuid("claim_id").notNull(),
    choiceId: text("choice_id").notNull(),
    value: text("value").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountCampaignChoiceClaimIdx: uniqueIndex("account_campaign_choices_claim_idx")
      .on(table.accountId, table.campaignId, table.claimId, table.choiceId),
  }),
);

export const accountCampaignPresentationsTable = pgTable(
  "account_campaign_presentations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    campaignId: text("campaign_id").notNull(),
    presentationId: text("presentation_id").notNull(),
    kind: text("kind").notNull(),
    ordinal: integer("ordinal").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountCampaignPresentationIdx: uniqueIndex("account_campaign_presentations_account_presentation_idx")
      .on(table.accountId, table.campaignId, table.presentationId),
  }),
);

export const firstPartyEventsTable = pgTable("first_party_events", {
  id: uuid("id").primaryKey(),
  accountId: uuid("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
  anonymousSessionId: uuid("anonymous_session_id"),
  eventName: text("event_name").notNull(),
  chapterId: text("chapter_id"),
  beatId: text("beat_id"),
  actionId: text("action_id"),
  outcome: text("outcome"),
  ordinal: integer("ordinal"),
  durationMs: integer("duration_ms"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});
