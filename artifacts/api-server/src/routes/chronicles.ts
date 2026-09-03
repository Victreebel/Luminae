import { randomBytes } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { Router, type IRouter, type Request } from 'express';
import {
  accountChroniclePrimaryOutcomesTable,
  accountCampaignFactsTable,
  db,
  gameStatesTable,
  playersTable,
  roomsTable,
} from '@workspace/db';
import {
  DEFAULT_VICTORY_REQUIREMENT,
  RECURRENCE_CHRONICLE_ID,
  RECURRENCE_SCENARIO_ID,
  TRACE_CHRONICLE_ID,
  TRACE_SCENARIO_ID,
  TRIANGULATION_CHRONICLE_ID,
  TRIANGULATION_SCENARIO_ID,
  type ChronicleRunKind,
  type RecurrenceChronicleSession,
  type TraceChronicleSession,
  type TriangulationChronicleSession,
} from '@workspace/game-types';
import { accountAuth } from '../lib/accountAuth';
import { getEquippedLuminaryArrivalSound } from '../lib/accountCosmetics';
import { ensureAccountProgressBackfilled } from '../lib/accountProgress';
import { runAiTurnsIfNeeded } from '../lib/aiTurnRunner';
import { pickUniqueAvatar } from '../lib/avatarAssignment';
import { readCampaignProgress } from '../lib/campaignChronicles';
import {
  configureRecurrenceScenario,
  configureTraceScenario,
  configureTriangulationScenario,
  initializeGame,
  normalizeState,
} from '../lib/gameEngine';

const router: IRouter = Router();

function generateInviteCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

async function readActiveTraceSession(accountId: string): Promise<TraceChronicleSession | null> {
  const [membership] = await db
    .select({ room: roomsTable, player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(and(
      eq(playersTable.accountId, accountId),
      eq(playersTable.isAi, false),
      eq(roomsTable.scenarioId, TRACE_SCENARIO_ID),
      eq(roomsTable.status, 'playing'),
    ))
    .limit(1);
  if (!membership) return null;
  const [stateRow] = await db
    .select({ state: gameStatesTable.state })
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, membership.room.id))
    .limit(1);
  const trace = stateRow ? normalizeState(stateRow.state).traceScenario : null;
  if (!trace) return null;
  return {
    roomId: membership.room.id,
    inviteCode: membership.room.inviteCode,
    playerId: membership.player.id,
    sessionToken: membership.player.sessionToken,
    resumed: true,
    scenarioId: TRACE_SCENARIO_ID,
    runKind: trace.runKind,
  };
}

async function readActiveRecurrenceSession(accountId: string): Promise<RecurrenceChronicleSession | null> {
  const [membership] = await db
    .select({ room: roomsTable, player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(and(
      eq(playersTable.accountId, accountId),
      eq(playersTable.isAi, false),
      eq(roomsTable.scenarioId, RECURRENCE_SCENARIO_ID),
      eq(roomsTable.status, 'playing'),
    ))
    .limit(1);
  if (!membership) return null;
  const [stateRow] = await db
    .select({ state: gameStatesTable.state })
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, membership.room.id))
    .limit(1);
  const recurrence = stateRow ? normalizeState(stateRow.state).recurrenceScenario : null;
  if (!recurrence) return null;
  return {
    roomId: membership.room.id,
    inviteCode: membership.room.inviteCode,
    playerId: membership.player.id,
    sessionToken: membership.player.sessionToken,
    resumed: true,
    scenarioId: RECURRENCE_SCENARIO_ID,
    runKind: recurrence.runKind,
  };
}

async function readActiveTriangulationSession(accountId: string): Promise<TriangulationChronicleSession | null> {
  const [membership] = await db
    .select({ room: roomsTable, player: playersTable })
    .from(playersTable)
    .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
    .where(and(
      eq(playersTable.accountId, accountId),
      eq(playersTable.isAi, false),
      eq(roomsTable.scenarioId, TRIANGULATION_SCENARIO_ID),
      eq(roomsTable.status, 'playing'),
    ))
    .limit(1);
  if (!membership) return null;
  const [stateRow] = await db
    .select({ state: gameStatesTable.state })
    .from(gameStatesTable)
    .where(eq(gameStatesTable.roomId, membership.room.id))
    .limit(1);
  const scenario = stateRow ? normalizeState(stateRow.state).triangulationScenario : null;
  if (!scenario) return null;
  return {
    roomId: membership.room.id,
    inviteCode: membership.room.inviteCode,
    playerId: membership.player.id,
    sessionToken: membership.player.sessionToken,
    resumed: true,
    scenarioId: TRIANGULATION_SCENARIO_ID,
    runKind: scenario.runKind,
  };
}

function priorTriangulationMemoryLines(
  facts: readonly { factKey: string; value: unknown }[],
): string[] {
  const lines: string[] = [];
  const trace = facts.find((fact) => fact.factKey === 'chronicle.trace.v1:guidance_method')?.value;
  if (trace === 'expose_all_routes') lines.push('At Vey, you made uncertainty public.');
  else if (trace === 'withhold_alternatives') lines.push('At Vey, you limited uncertainty before it could become action.');
  else if (trace === 'force_helm_lock') lines.push('At Vey, you made one safe path easier than refusal.');
  const recurrence = facts.find((fact) => fact.factKey === 'chronicle.recurrence.v1:custody_method')?.value;
  if (recurrence === 'publish_complete_index') lines.push('At Eido, you let the dangerous answer become common.');
  else if (recurrence === 'seal_operational_grammar') lines.push('At Eido, you preserved the warning and removed the method.');
  else if (recurrence === 'establish_dual_custody') lines.push('At Eido, you made the answer depend on another voice.');
  return lines;
}

router.get(
  '/chronicles/progress',
  accountAuth,
  async (req: Request, res): Promise<void> => {
    await ensureAccountProgressBackfilled(req.account!.id);
    res.json(await readCampaignProgress(req.account!.id));
  },
);

router.post(
  '/chronicles/trace/start',
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);

    const active = await readActiveTraceSession(account.id);
    if (active) {
      res.json(active);
      return;
    }
    const luminaryArrivalSound = await getEquippedLuminaryArrivalSound(account.id);

    const session = await db.transaction(async (tx): Promise<TraceChronicleSession> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${account.id}:${TRACE_SCENARIO_ID}`}))`);

      const [existing] = await tx
        .select({ room: roomsTable, player: playersTable })
        .from(playersTable)
        .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
        .where(and(
          eq(playersTable.accountId, account.id),
          eq(playersTable.isAi, false),
          eq(roomsTable.scenarioId, TRACE_SCENARIO_ID),
          eq(roomsTable.status, 'playing'),
        ))
        .limit(1);
      if (existing) {
        const [stateRow] = await tx
          .select({ state: gameStatesTable.state })
          .from(gameStatesTable)
          .where(eq(gameStatesTable.roomId, existing.room.id))
          .limit(1);
        const runKind = stateRow?.state
          ? normalizeState(stateRow.state).traceScenario?.runKind ?? 'primary'
          : 'primary';
        return {
          roomId: existing.room.id,
          inviteCode: existing.room.inviteCode,
          playerId: existing.player.id,
          sessionToken: existing.player.sessionToken,
          resumed: true,
          scenarioId: TRACE_SCENARIO_ID,
          runKind,
        };
      }

      const [primary] = await tx
        .select({ id: accountChroniclePrimaryOutcomesTable.id })
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, account.id),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, TRACE_CHRONICLE_ID),
        ))
        .limit(1);
      const runKind: ChronicleRunKind = primary ? 'rehearsal' : 'primary';

      const [room] = await tx
        .insert(roomsTable)
        .values({
          inviteCode: generateInviteCode(),
          status: 'playing',
          maxPlayers: 2,
          victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
          cinematicMode: 'standard',
          gameMode: 'campaign',
          scenarioId: TRACE_SCENARIO_ID,
          blueprintPolicy: 'none',
          turnTimerSeconds: null,
        })
        .returning();

      const architectAvatar = pickUniqueAvatar(null, []);
      const [architect] = await tx
        .insert(playersTable)
        .values({
          roomId: room.id,
          accountId: account.id,
          name: account.username,
          sessionToken: generateSessionToken(),
          isHost: true,
          orderIndex: 0,
          isConnected: false,
          isAi: false,
          avatarId: architectAvatar,
        })
        .returning();
      const [keelborn] = await tx
        .insert(playersTable)
        .values({
          roomId: room.id,
          name: 'Keelborn Convoy',
          sessionToken: `ai-${generateSessionToken()}`,
          isHost: false,
          orderIndex: 1,
          isConnected: true,
          isAi: true,
          aiDifficulty: 'hard',
          avatarId: pickUniqueAvatar(null, [architectAvatar]),
        })
        .returning();

      await tx
        .update(roomsTable)
        .set({ hostPlayerId: architect.id, updatedAt: new Date() })
        .where(eq(roomsTable.id, room.id));

      const state = initializeGame(
        [
          { id: architect.id, name: architect.name, luminaryArrivalSound },
          { id: keelborn.id, name: keelborn.name },
        ],
        2,
        15,
        'standard',
      );
      state.turnTimerSeconds = null;
      state.turnDeadline = null;
      configureTraceScenario(state, architect.id, keelborn.id, runKind);
      await tx.insert(gameStatesTable).values({
        roomId: room.id,
        state: state as unknown as Record<string, unknown>,
        version: state.version,
      });

      return {
        roomId: room.id,
        inviteCode: room.inviteCode,
        playerId: architect.id,
        sessionToken: architect.sessionToken,
        resumed: false,
        scenarioId: TRACE_SCENARIO_ID,
        runKind,
      };
    });

    res.status(session.resumed ? 200 : 201).json(session);
    void runAiTurnsIfNeeded(session.roomId);
  },
);

router.post(
  '/chronicles/recurrence/start',
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);

    const active = await readActiveRecurrenceSession(account.id);
    if (active) {
      res.json(active);
      return;
    }
    const luminaryArrivalSound = await getEquippedLuminaryArrivalSound(account.id);
    const progress = await readCampaignProgress(account.id);
    const recurrenceProgress = progress.openingChronicles.find(
      (chronicle) => chronicle.chronicleId === RECURRENCE_CHRONICLE_ID,
    );
    if (!recurrenceProgress || recurrenceProgress.state === 'locked' || recurrenceProgress.state === 'pending_release') {
      res.status(409).json({ error: 'Complete The Trace before entering The Recurrence' });
      return;
    }

    const session = await db.transaction(async (tx): Promise<RecurrenceChronicleSession> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${account.id}:${RECURRENCE_SCENARIO_ID}`}))`);

      const [existing] = await tx
        .select({ room: roomsTable, player: playersTable })
        .from(playersTable)
        .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
        .where(and(
          eq(playersTable.accountId, account.id),
          eq(playersTable.isAi, false),
          eq(roomsTable.scenarioId, RECURRENCE_SCENARIO_ID),
          eq(roomsTable.status, 'playing'),
        ))
        .limit(1);
      if (existing) {
        const [stateRow] = await tx
          .select({ state: gameStatesTable.state })
          .from(gameStatesTable)
          .where(eq(gameStatesTable.roomId, existing.room.id))
          .limit(1);
        const runKind = stateRow?.state
          ? normalizeState(stateRow.state).recurrenceScenario?.runKind ?? 'primary'
          : 'primary';
        return {
          roomId: existing.room.id,
          inviteCode: existing.room.inviteCode,
          playerId: existing.player.id,
          sessionToken: existing.player.sessionToken,
          resumed: true,
          scenarioId: RECURRENCE_SCENARIO_ID,
          runKind,
        };
      }

      const [tracePrimary] = await tx
        .select({ id: accountChroniclePrimaryOutcomesTable.id })
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, account.id),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, TRACE_CHRONICLE_ID),
        ))
        .limit(1);
      if (!tracePrimary) {
        throw Object.assign(new Error('Complete The Trace before entering The Recurrence'), { status: 409 });
      }

      const [primary] = await tx
        .select({ id: accountChroniclePrimaryOutcomesTable.id })
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, account.id),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, RECURRENCE_CHRONICLE_ID),
        ))
        .limit(1);
      const runKind: ChronicleRunKind = primary ? 'rehearsal' : 'primary';

      const [room] = await tx.insert(roomsTable).values({
        inviteCode: generateInviteCode(),
        status: 'playing',
        maxPlayers: 2,
        victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
        cinematicMode: 'standard',
        gameMode: 'campaign',
        scenarioId: RECURRENCE_SCENARIO_ID,
        blueprintPolicy: 'none',
        turnTimerSeconds: null,
      }).returning();

      const architectAvatar = pickUniqueAvatar(null, []);
      const [architect] = await tx.insert(playersTable).values({
        roomId: room.id,
        accountId: account.id,
        name: account.username,
        sessionToken: generateSessionToken(),
        isHost: true,
        orderIndex: 0,
        isConnected: false,
        isAi: false,
        avatarId: architectAvatar,
      }).returning();
      const [oru] = await tx.insert(playersTable).values({
        roomId: room.id,
        name: 'Oru Current',
        sessionToken: `ai-${generateSessionToken()}`,
        isHost: false,
        orderIndex: 1,
        isConnected: true,
        isAi: true,
        aiDifficulty: 'hard',
        avatarId: pickUniqueAvatar(null, [architectAvatar]),
      }).returning();

      await tx.update(roomsTable)
        .set({ hostPlayerId: architect.id, updatedAt: new Date() })
        .where(eq(roomsTable.id, room.id));

      const state = initializeGame(
        [
          { id: architect.id, name: architect.name, luminaryArrivalSound },
          { id: oru.id, name: oru.name },
        ],
        2,
        15,
        'standard',
      );
      state.turnTimerSeconds = null;
      state.turnDeadline = null;
      configureRecurrenceScenario(state, architect.id, oru.id, runKind);
      await tx.insert(gameStatesTable).values({
        roomId: room.id,
        state: state as unknown as Record<string, unknown>,
        version: state.version,
      });

      return {
        roomId: room.id,
        inviteCode: room.inviteCode,
        playerId: architect.id,
        sessionToken: architect.sessionToken,
        resumed: false,
        scenarioId: RECURRENCE_SCENARIO_ID,
        runKind,
      };
    });

    res.status(session.resumed ? 200 : 201).json(session);
    void runAiTurnsIfNeeded(session.roomId);
  },
);

router.post(
  '/chronicles/triangulation/start',
  accountAuth,
  async (req: Request, res): Promise<void> => {
    const account = req.account!;
    await ensureAccountProgressBackfilled(account.id);

    const active = await readActiveTriangulationSession(account.id);
    if (active) {
      res.json(active);
      return;
    }
    const luminaryArrivalSound = await getEquippedLuminaryArrivalSound(account.id);
    const progress = await readCampaignProgress(account.id);
    const entry = progress.openingChronicles.find(
      (chronicle) => chronicle.chronicleId === TRIANGULATION_CHRONICLE_ID,
    );
    const developmentPreview = process.env.NODE_ENV !== 'production';
    if (!entry || entry.state === 'locked' || (entry.state === 'pending_release' && !developmentPreview)) {
      res.status(409).json({
        error: entry?.state === 'pending_release'
          ? 'The Triangulation is awaiting release validation'
          : 'Complete The Recurrence before entering The Triangulation',
      });
      return;
    }

    const session = await db.transaction(async (tx): Promise<TriangulationChronicleSession> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`${account.id}:${TRIANGULATION_SCENARIO_ID}`}))`);

      const [existing] = await tx
        .select({ room: roomsTable, player: playersTable })
        .from(playersTable)
        .innerJoin(roomsTable, eq(playersTable.roomId, roomsTable.id))
        .where(and(
          eq(playersTable.accountId, account.id),
          eq(playersTable.isAi, false),
          eq(roomsTable.scenarioId, TRIANGULATION_SCENARIO_ID),
          eq(roomsTable.status, 'playing'),
        ))
        .limit(1);
      if (existing) {
        const [stateRow] = await tx.select({ state: gameStatesTable.state })
          .from(gameStatesTable)
          .where(eq(gameStatesTable.roomId, existing.room.id))
          .limit(1);
        return {
          roomId: existing.room.id,
          inviteCode: existing.room.inviteCode,
          playerId: existing.player.id,
          sessionToken: existing.player.sessionToken,
          resumed: true,
          scenarioId: TRIANGULATION_SCENARIO_ID,
          runKind: stateRow?.state
            ? normalizeState(stateRow.state).triangulationScenario?.runKind ?? 'primary'
            : 'primary',
        };
      }

      const [recurrencePrimary] = await tx.select({ id: accountChroniclePrimaryOutcomesTable.id })
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, account.id),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, RECURRENCE_CHRONICLE_ID),
        ))
        .limit(1);
      if (!recurrencePrimary) {
        throw Object.assign(new Error('Complete The Recurrence before entering The Triangulation'), { status: 409 });
      }
      const [primary] = await tx.select({ id: accountChroniclePrimaryOutcomesTable.id })
        .from(accountChroniclePrimaryOutcomesTable)
        .where(and(
          eq(accountChroniclePrimaryOutcomesTable.accountId, account.id),
          eq(accountChroniclePrimaryOutcomesTable.chronicleId, TRIANGULATION_CHRONICLE_ID),
        ))
        .limit(1);
      const runKind: ChronicleRunKind = primary ? 'rehearsal' : 'primary';
      const facts = await tx.select({
        factKey: accountCampaignFactsTable.factKey,
        value: accountCampaignFactsTable.value,
      }).from(accountCampaignFactsTable)
        .where(eq(accountCampaignFactsTable.accountId, account.id));

      const [room] = await tx.insert(roomsTable).values({
        inviteCode: generateInviteCode(),
        status: 'playing',
        maxPlayers: 3,
        victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
        cinematicMode: 'standard',
        gameMode: 'campaign',
        scenarioId: TRIANGULATION_SCENARIO_ID,
        blueprintPolicy: 'none',
        turnTimerSeconds: null,
      }).returning();

      const usedAvatars: string[] = [];
      const architectAvatar = pickUniqueAvatar(null, usedAvatars);
      usedAvatars.push(architectAvatar);
      const [architect] = await tx.insert(playersTable).values({
        roomId: room.id, accountId: account.id, name: account.username,
        sessionToken: generateSessionToken(), isHost: true, orderIndex: 0,
        isConnected: false, isAi: false, avatarId: architectAvatar,
      }).returning();
      const myriaAvatar = pickUniqueAvatar(null, usedAvatars);
      usedAvatars.push(myriaAvatar);
      const [myria] = await tx.insert(playersTable).values({
        roomId: room.id, name: 'Myriad Groves', sessionToken: `ai-${generateSessionToken()}`,
        isHost: false, orderIndex: 1, isConnected: true, isAi: true,
        aiDifficulty: 'hard', avatarId: myriaAvatar,
      }).returning();
      const vesperAvatar = pickUniqueAvatar(null, usedAvatars);
      const [vesper] = await tx.insert(playersTable).values({
        roomId: room.id, name: 'Vesper Choir', sessionToken: `ai-${generateSessionToken()}`,
        isHost: false, orderIndex: 2, isConnected: true, isAi: true,
        aiDifficulty: 'hard', avatarId: vesperAvatar,
      }).returning();

      await tx.update(roomsTable)
        .set({ hostPlayerId: architect.id, updatedAt: new Date() })
        .where(eq(roomsTable.id, room.id));

      const state = initializeGame([
        { id: architect.id, name: architect.name, luminaryArrivalSound },
        { id: myria.id, name: myria.name },
        { id: vesper.id, name: vesper.name },
      ], 3, 15, 'standard');
      state.turnTimerSeconds = null;
      state.turnDeadline = null;
      configureTriangulationScenario(
        state,
        architect.id,
        myria.id,
        vesper.id,
        runKind,
        priorTriangulationMemoryLines(facts),
      );
      await tx.insert(gameStatesTable).values({
        roomId: room.id,
        state: state as unknown as Record<string, unknown>,
        version: state.version,
      });

      return {
        roomId: room.id,
        inviteCode: room.inviteCode,
        playerId: architect.id,
        sessionToken: architect.sessionToken,
        resumed: false,
        scenarioId: TRIANGULATION_SCENARIO_ID,
        runKind,
      };
    });

    res.status(session.resumed ? 200 : 201).json(session);
    void runAiTurnsIfNeeded(session.roomId);
  },
);

export default router;
