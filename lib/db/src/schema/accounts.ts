import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
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
  lumeBalance: integer("lume_balance").notNull().default(0),
  lifetimeEarnedLume: integer("lifetime_earned_lume").notNull().default(0),
  lifetimePurchasedLume: integer("lifetime_purchased_lume").notNull().default(0),
  lifetimeGrantedLume: integer("lifetime_granted_lume").notNull().default(0),
  lifetimeSpentLume: integer("lifetime_spent_lume").notNull().default(0),
  lifetimeRefundedLume: integer("lifetime_refunded_lume").notNull().default(0),
  dailyClaimStreak: integer("daily_claim_streak").notNull().default(0),
  lastDailyClaimDate: text("last_daily_claim_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountEngagementSchema = createInsertSchema(accountEngagementTable);
export type InsertAccountEngagement = z.infer<typeof insertAccountEngagementSchema>;
export type AccountEngagement = typeof accountEngagementTable.$inferSelect;

export const accountLumeTransactionsTable = pgTable(
  "account_lume_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    category: text("category").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after"),
    idempotencyKey: text("idempotency_key").notNull(),
    externalReference: text("external_reference"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idempotencyIdx: uniqueIndex("account_lume_transactions_idempotency_idx").on(table.idempotencyKey),
  }),
);

export const insertAccountLumeTransactionSchema = createInsertSchema(accountLumeTransactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAccountLumeTransaction = z.infer<typeof insertAccountLumeTransactionSchema>;
export type AccountLumeTransaction = typeof accountLumeTransactionsTable.$inferSelect;

export const accountInvestigationProgressTable = pgTable(
  "account_investigation_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    investigationId: text("investigation_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    discoveries: text("discoveries").array().notNull().default([]),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    completionLumeAwarded: integer("completion_lume_awarded").notNull().default(0),
    quizAnswers: jsonb("quiz_answers").$type<Record<string, string> | null>(),
    quizScore: integer("quiz_score"),
    quizOfferedQuestionCount: integer("quiz_offered_question_count"),
    quizLumeAwarded: integer("quiz_lume_awarded").notNull().default(0),
    quizSubmittedAt: timestamp("quiz_submitted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountInvestigationIdx: uniqueIndex("account_investigation_progress_account_investigation_idx")
      .on(table.accountId, table.investigationId),
  }),
);

export const insertAccountInvestigationProgressSchema = createInsertSchema(accountInvestigationProgressTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAccountInvestigationProgress = z.infer<typeof insertAccountInvestigationProgressSchema>;
export type AccountInvestigationProgress = typeof accountInvestigationProgressTable.$inferSelect;

export const accountNativePurchasesTable = pgTable(
  "account_native_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    packId: text("pack_id").notNull(),
    productId: text("product_id").notNull(),
    purchaseToken: text("purchase_token").notNull(),
    providerOrderId: text("provider_order_id"),
    lumeAmount: integer("lume_amount").notNull(),
    status: text("status").notNull().default("pending"),
    grantTransactionId: uuid("grant_transaction_id").references(() => accountLumeTransactionsTable.id),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    grantedAt: timestamp("granted_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    lastError: text("last_error"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    providerTokenIdx: uniqueIndex("account_native_purchases_provider_token_idx")
      .on(table.provider, table.purchaseToken),
  }),
);

export const insertAccountNativePurchaseSchema = createInsertSchema(accountNativePurchasesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertAccountNativePurchase = z.infer<typeof insertAccountNativePurchaseSchema>;
export type AccountNativePurchase = typeof accountNativePurchasesTable.$inferSelect;

export const accountBlocksTable = pgTable(
  "account_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerAccountId: uuid("blocker_account_id").notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    blockedAccountId: uuid("blocked_account_id").notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pairIdx: uniqueIndex("account_blocks_pair_idx")
      .on(table.blockerAccountId, table.blockedAccountId),
  }),
);

export const moderationReportsTable = pgTable("moderation_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterAccountId: uuid("reporter_account_id").notNull()
    .references(() => accountsTable.id, { onDelete: "cascade" }),
  reportedAccountId: uuid("reported_account_id")
    .references(() => accountsTable.id, { onDelete: "set null" }),
  roomId: uuid("room_id"),
  reportedPlayerId: uuid("reported_player_id"),
  category: text("category").notNull(),
  evidenceText: text("evidence_text"),
  evidenceTimestamp: timestamp("evidence_timestamp", { withTimezone: true }),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
});

export const moderationEventsTable = pgTable("moderation_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
  roomId: uuid("room_id"),
  playerId: uuid("player_id"),
  eventType: text("event_type").notNull(),
  detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accountDeletionRequestsTable = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull()
      .references(() => accountsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    executeAfter: timestamp("execute_after", { withTimezone: true }).notNull(),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    accountIdx: uniqueIndex("account_deletion_requests_account_idx").on(table.accountId),
  }),
);

export const telemetryEventsTable = pgTable(
  "telemetry_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").references(() => accountsTable.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    eventName: text("event_name").notNull(),
    platform: text("platform").notNull(),
    clientBuild: text("client_build"),
    detail: jsonb("detail").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    receivedAtIdx: index("telemetry_events_received_at_idx").on(table.receivedAt),
    onboardingFunnelIdx: index("telemetry_events_funnel_idx").on(table.eventName, table.occurredAt),
  }),
);

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
  thresholdRupturedAt: timestamp("threshold_ruptured_at", { withTimezone: true }),
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
    civilizationRecord: jsonb("civilization_record").$type<Record<string, unknown> | null>(),
    lumeEarned: integer("lume_earned").notNull().default(0),
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
  totalLume: integer("total_lume").notNull().default(0),
  totalForges: integer("total_forges").notNull().default(0),
  totalAlliances: integer("total_alliances").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

export const accountChronicleUnlocksTable = pgTable(
  "account_chronicle_unlocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    chronicleId: text("chronicle_id").notNull(),
    source: text("source").notNull(),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => ({
    accountChronicleIdx: uniqueIndex("account_chronicle_unlocks_account_chronicle_idx")
      .on(table.accountId, table.chronicleId),
  }),
);

export const accountChroniclePrimaryOutcomesTable = pgTable(
  "account_chronicle_primary_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    chronicleId: text("chronicle_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    roomId: uuid("room_id"),
    matchInstanceId: text("match_instance_id").notNull(),
    outcomeId: text("outcome_id").notNull(),
    result: text("result").notNull(),
    lumeEarned: integer("lume_earned").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountChronicleIdx: uniqueIndex("account_chronicle_primary_outcomes_account_chronicle_idx")
      .on(table.accountId, table.chronicleId),
    accountMatchIdx: uniqueIndex("account_chronicle_primary_outcomes_account_match_idx")
      .on(table.accountId, table.matchInstanceId),
  }),
);

export const accountChronicleRehearsalsTable = pgTable(
  "account_chronicle_rehearsals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    primaryOutcomeId: uuid("primary_outcome_id").notNull()
      .references(() => accountChroniclePrimaryOutcomesTable.id, { onDelete: "cascade" }),
    chronicleId: text("chronicle_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    roomId: uuid("room_id"),
    matchInstanceId: text("match_instance_id").notNull(),
    outcomeId: text("outcome_id").notNull(),
    result: text("result").notNull(),
    preparednessObjectiveMet: boolean("preparedness_objective_met").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountMatchIdx: uniqueIndex("account_chronicle_rehearsals_account_match_idx")
      .on(table.accountId, table.matchInstanceId),
  }),
);

export const accountChronicleHistoricalRecordsTable = pgTable(
  "account_chronicle_historical_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    primaryOutcomeId: uuid("primary_outcome_id").notNull()
      .references(() => accountChroniclePrimaryOutcomesTable.id, { onDelete: "cascade" }),
    chronicleId: text("chronicle_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    recordKind: text("record_kind").notNull(),
    recordKey: text("record_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    primaryRecordIdx: uniqueIndex("account_chronicle_historical_records_primary_record_idx")
      .on(table.primaryOutcomeId, table.recordKey),
  }),
);

export const accountCalibrationInsightsTable = pgTable(
  "account_calibration_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    chronicleId: text("chronicle_id").notNull(),
    sourceKind: text("source_kind").notNull(),
    sourceRecordId: uuid("source_record_id").notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountChronicleIdx: uniqueIndex("account_calibration_insights_account_chronicle_idx")
      .on(table.accountId, table.chronicleId),
  }),
);

export const accountCampaignFactsTable = pgTable(
  "account_campaign_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind").notNull(),
    sourceRecordId: uuid("source_record_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    factKey: text("fact_key").notNull(),
    value: jsonb("value").$type<string | number | boolean | null>().notNull(),
    visibility: text("visibility").notNull(),
    supersedesFactId: uuid("supersedes_fact_id"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceFactIdx: uniqueIndex("account_campaign_facts_source_fact_idx")
      .on(table.accountId, table.sourceKind, table.sourceRecordId, table.factKey),
  }),
);

export const accountCampaignDimensionContributionsTable = pgTable(
  "account_campaign_dimension_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind").notNull(),
    sourceRecordId: uuid("source_record_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    dimension: text("dimension").notNull(),
    direction: text("direction").notNull(),
    magnitude: integer("magnitude").notNull(),
    rationaleKey: text("rationale_key").notNull(),
    visibility: text("visibility").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceContributionIdx: uniqueIndex("account_campaign_dimension_contributions_source_idx")
      .on(table.accountId, table.sourceKind, table.sourceRecordId, table.dimension, table.rationaleKey),
  }),
);

export const accountLumiiRelationshipMemoriesTable = pgTable(
  "account_lumii_relationship_memories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id, { onDelete: "cascade" }),
    sourceKind: text("source_kind").notNull(),
    sourceRecordId: uuid("source_record_id").notNull(),
    definitionVersion: integer("definition_version").notNull(),
    memoryKey: text("memory_key").notNull(),
    valence: integer("valence").notNull().default(0),
    detail: jsonb("detail").$type<string | number | boolean | null>(),
    visibility: text("visibility").notNull(),
    simulation: boolean("simulation").notNull().default(false),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sourceMemoryIdx: uniqueIndex("account_lumii_relationship_memories_source_memory_idx")
      .on(table.accountId, table.sourceKind, table.sourceRecordId, table.memoryKey),
  }),
);
