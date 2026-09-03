/**
 * ActivationDirectorRouter
 *
 * Routes a single PendingLuminaryActivationEvent to the appropriate director
 * component.  This file is intentionally kept separate from the large game.tsx
 * so that Babel processes its JSX cleanly (no 500 KB deoptimisation).
 *
 * ─── Adding a new named director ─────────────────────────────────────────────
 *
 *   Add ONE entry to DIRECTOR_REGISTRY below — that is the only change needed.
 *   The entry declares:
 *     • `luminaryId` + `effectType`  — the routing key
 *     • `renderEffect`               — returns the JSX for that director
 *
 * Current routing table
 *   branded summon effects   → LuminaryActivationCinematic, then shared branding director
 *   lum_ember  + end_of_turn → CinderMandateBurnDirector
 *   all others               → LuminaryActivationCinematic
 *
 * Scroll ownership is deliberately absent from this registry. The game-level
 * Luminary sequence lease freezes the board before any director mounts and is
 * the only layer permitted to release it.
 */
import { useState, type ReactElement } from 'react';
import { useReducedMotion } from 'framer-motion';
import { ArtifactBrandingDirector } from './CinderMandateBrandingDirector';
import type { CinderMandateBrandingActions } from './CinderMandateBrandingDirector';
import { CinderMandateBurnDirector } from './CinderMandateBurnDirector';
import type { CinderMandateBurnActions, DirectorBurnSlot } from './CinderMandateBurnDirector';
import { LuminaryActivationCinematic } from './LuminaryActivationCinematic';
import { VictoryRequirementChangeOverlay } from './VictoryRequirementChangeOverlay';
import { PhoenixArchiveReturnDirector } from './PhoenixArchiveReturnDirector';
import {
  PaleMerchantReturnDirector,
  type PaleMerchantAffinityReturn,
} from './PaleMerchantReturnDirector';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import {
  IronHarbingerResetDirector,
  type IronHarbingerResetActions,
  type IronHarbingerResetSlot,
} from './IronHarbingerResetDirector';
import {
  FinalHungerAssimilationDirector,
  type AssimilationDirectorActions,
  type AssimilationVisualSlot,
} from './FinalHungerAssimilationDirector';
import { SeededAffinityImbueDirector } from './SeededAffinityImbueDirector';
import { VerdantOracleGainDirector } from './VerdantOracleGainDirector';
import { SeedBeyondSeasonsEffect } from './SeedBeyondSeasonsEffect';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';
import type { LuminaryPlaybackMode } from '@/lib/luminaryPresentationPacing';
import type {
  PendingLuminaryActivationEvent,
  Luminary,
  GamePlayerState,
  GameState,
} from '@workspace/api-client-react';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ActivationDirectorRouterProps {
  evt: PendingLuminaryActivationEvent;
  lum: Luminary | undefined;
  triggeringPlayer: GamePlayerState | undefined;
  state: GameState | null;
  /** Player accessibility preference. This alone may omit full-motion reveals. */
  abridgedAnims: boolean;
  playbackMode: LuminaryPlaybackMode;
  activationTimelineRate: number;
  pendingBurnSlots: DirectorBurnSlot[];
  queuePosition: number;
  queueTotal: number;
  onResolutionStart?: () => void;
  prepareResolution?: () => Promise<void>;

  brandingActions: CinderMandateBrandingActions;
  onBrandingComplete: (skipped?: boolean) => void;

  burnActions: CinderMandateBurnActions;
  onBurnComplete: () => void;

  ironHarbingerSlots: IronHarbingerResetSlot[];
  ironHarbingerActions: IronHarbingerResetActions;

  phoenixRefillSlots: string[];
  onRevealPhoenixRefills: (
    slotKeys: string[],
    staggerMs: number,
    immediate: boolean,
  ) => void;

  assimilationSlot: AssimilationVisualSlot | null;
  assimilationActions: AssimilationDirectorActions;

  onCinematicComplete: (skipped: boolean) => void;
}

// ─── Director registry ────────────────────────────────────────────────────────

/**
 * A single entry in the director registry.
 *
 * `render` receives the full router props and returns the director JSX.
 */
interface DirectorEntry {
  luminaryId: string;
  effectType: string;
  forceCamera?: boolean;
  managesActivation?: boolean;
  renderEffect: (props: ActivationDirectorRouterProps) => ReactElement;
}

/**
 * The canonical registry of all named directors.
 *
 * The generic `LuminaryActivationCinematic` fallback is NOT listed here;
 * unmatched events use it automatically.
 */
const DIRECTOR_REGISTRY: readonly DirectorEntry[] = [
  // ── Verdant Oracle — one clear Well-to-owner Affinity transfer ───────────
  {
    luminaryId: 'lum_verdant',
    effectType: 'summon',
    renderEffect: ({
      evt,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      onCinematicComplete,
    }) => (
      <VerdantOracleGainDirector
        playerId={evt.triggeringPlayerId}
        playerName={triggeringPlayer?.playerName}
        amount={evt.affinityAmount ?? 0}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        onComplete={onCinematicComplete}
      />
    ),
  },

  // ── Pale Merchant — global half-supply Affinity return ───────────────────
  {
    luminaryId: 'lum_pale',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: ({
      evt,
      state,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      onCinematicComplete,
    }) => {
      const authoritative = Array.isArray(evt.affinityReturns)
        ? evt.affinityReturns
        : evt.affinityType
          ? [{
              playerId: evt.triggeringPlayerId,
              affinityType: evt.affinityType,
              affinityAmount: evt.affinityAmount ?? 2,
            }]
          : [];
      const returns: PaleMerchantAffinityReturn[] = authoritative.map((result) => ({
        playerId: result.playerId,
        playerName: state?.players?.find((player) => player.playerId === result.playerId)?.playerName,
        affinity: result.affinityType as AffinityKey,
        amount: result.affinityAmount,
      }));
      return (
        <PaleMerchantReturnDirector
          returns={returns}
          triggeringPlayerName={triggeringPlayer?.playerName}
          reducedMotion={abridgedAnims}
          playbackMode={playbackMode}
          timelinePlaybackRate={activationTimelineRate}
          queuePosition={queuePosition}
          queueTotal={queueTotal}
          onComplete={onCinematicComplete}
        />
      );
    },
  },

  // ── Iron Harbinger — full Forge return, Archive shuffle, and redeal ──────
  {
    luminaryId: 'lum_forge',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: ({
      evt,
      state,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      ironHarbingerSlots,
      ironHarbingerActions,
      onCinematicComplete,
    }) => (
      <IronHarbingerResetDirector
        targetCardIds={evt.targetCardIds ?? []}
        capturedSlots={ironHarbingerSlots}
        state={state}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        actions={ironHarbingerActions}
        onComplete={onCinematicComplete}
      />
    ),
  },

  // ── Final Hunger — selected Artifact dissolves into Civilization ─────────
  {
    luminaryId: 'lum_hunger',
    effectType: 'action',
    renderEffect: ({
      evt,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      assimilationSlot,
      assimilationActions,
      onCinematicComplete,
    }) => {
      const rawAffinity = evt.affinityType ?? assimilationSlot?.card?.bonusAffinity ?? 'verdance';
      const affinity = (rawAffinity in AFFINITY_META ? rawAffinity : 'verdance') as AffinityKey;
      return (
        <FinalHungerAssimilationDirector
          slot={assimilationSlot}
          affinity={affinity}
          triggeringPlayerName={triggeringPlayer?.playerName}
          reducedMotion={abridgedAnims}
          playbackMode={playbackMode}
          timelinePlaybackRate={activationTimelineRate}
          queuePosition={queuePosition}
          queueTotal={queueTotal}
          actions={assimilationActions}
          onComplete={onCinematicComplete}
        />
      );
    },
  },

  // ── Seed Beyond Seasons — permanent mold placement ───────────────────────
  {
    luminaryId: 'lum_seed',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: ({ evt, state, onCinematicComplete }) => (
      <SeedBeyondSeasonsEffect
        moldSlots={evt.targetSlotIds ?? state?.avatarSeedMoldSlots ?? []}
        onComplete={() => onCinematicComplete(false)}
      />
    ),
  },

  // ── Seed Beyond Seasons — opponent forge transfers permanent Affinity ───
  {
    luminaryId: 'lum_seed',
    effectType: 'action',
    renderEffect: ({
      evt,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      onCinematicComplete,
    }) => (
      <SeededAffinityImbueDirector
        targetCardIds={evt.targetCardIds ?? []}
        targetSlotIds={evt.targetSlotIds ?? []}
        affinity={(evt.affinityType as AffinityKey | undefined) ?? 'verdance'}
        alliedPlayerId={evt.triggeringPlayerId}
        alliedPlayerName={triggeringPlayer?.playerName}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        onComplete={onCinematicComplete}
      />
    ),
  },

  // ── Phoenix Paradox — delayed Burn Pile recovery ─────────────────────────
  {
    luminaryId: 'lum_astral',
    effectType: 'start_of_turn',
    forceCamera: true,
    renderEffect: ({
      evt,
      triggeringPlayer,
      abridgedAnims,
      playbackMode,
      activationTimelineRate,
      queuePosition,
      queueTotal,
      phoenixRefillSlots,
      onRevealPhoenixRefills,
      onCinematicComplete,
    }) => (
      <PhoenixArchiveReturnDirector
        cardIds={evt.targetCardIds ?? []}
        refillSlotKeys={evt.targetSlotIds ?? phoenixRefillSlots}
        onRevealRefills={onRevealPhoenixRefills}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        onComplete={onCinematicComplete}
      />
    ),
  },

  // ── Ember Sovereign — branding phase ──────────────────────────────────────
  // The sequence lease freezes the board before this director reads card rects.
  {
    luminaryId: 'lum_ember',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: (props) => (
      <BrandingEffect
        props={props}
        markerType="condemned"
        resultLabel="Condemned"
      />
    ),
  },

  // ── Forgotten Hour and Black Domain use the same readable brand grammar ──
  {
    luminaryId: 'lum_compass',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: (props) => (
      <BrandingEffect
        props={props}
        markerType="forgotten"
        resultLabel="Forgotten"
      />
    ),
  },
  {
    luminaryId: 'lum_compass',
    effectType: 'end_of_turn',
    forceCamera: true,
    renderEffect: (props) => (
      <BrandingEffect
        props={props}
        markerType="forgotten"
        resultLabel="Forgotten"
      />
    ),
  },
  {
    luminaryId: 'lum_null',
    effectType: 'summon',
    forceCamera: true,
    renderEffect: (props) => (
      <BrandingEffect
        props={props}
        markerType="nullified"
        resultLabel="Nullified"
      />
    ),
  },
  {
    luminaryId: 'lum_seed',
    effectType: 'end_of_turn',
    forceCamera: true,
    renderEffect: (props) => (
      <BrandingEffect
        props={props}
        markerType="avatar_seed"
        resultLabel="Seeded"
      />
    ),
  },

  // ── Ember Sovereign — burn phase ───────────────────────────────────────────
  // CinderMandateBurnDirector drives the complete BurnFlash sequence.
  {
    luminaryId: 'lum_ember',
    effectType: 'end_of_turn',
    forceCamera: true,
    managesActivation: true,
    renderEffect: (props) => <EmberEndTurnActivation {...props} />,
  },
];
interface BrandingEffectProps {
  props: ActivationDirectorRouterProps;
  markerType: 'condemned' | 'forgotten' | 'nullified' | 'avatar_seed';
  resultLabel: string;
}

function BrandingEffect({
  props: {
    evt,
    lum,
    triggeringPlayer,
    abridgedAnims,
    playbackMode,
    activationTimelineRate,
    queuePosition,
    queueTotal,
    brandingActions,
    onBrandingComplete,
  },
  markerType,
  resultLabel,
}: BrandingEffectProps) {
  const effectName = lum?.effectName ?? lum?.name ?? evt.luminaryId;
  const thresholdChange = evt.victoryRequirementChange ?? (
    evt.luminaryId === 'lum_compass' && evt.effectType === 'summon' ? 1 : 0
  );
  const [showThresholdChange, setShowThresholdChange] = useState(false);

  if (showThresholdChange) {
    return (
      <VictoryRequirementChangeOverlay
        amount={thresholdChange}
        requirementBefore={evt.victoryRequirementBefore}
        requirementAfter={evt.victoryRequirementAfter}
        reducedMotion={abridgedAnims}
        onComplete={() => onBrandingComplete(false)}
      />
    );
  }

  return (
    <ArtifactBrandingDirector
      luminaryId={evt.luminaryId}
      lumSummonColor={lum?.summonColor}
      lumSummonSecondaryColor={lum?.summonSecondaryColor}
      targetCardIds={evt.targetCardIds ?? []}
      reducedMotion={abridgedAnims}
      playbackMode={playbackMode}
      timelinePlaybackRate={activationTimelineRate}
      markerType={markerType}
      effectName={effectName}
      resultLabel={resultLabel}
      luminaryName={lum?.name ?? evt.luminaryId}
      triggeringPlayerName={triggeringPlayer?.playerName}
      effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
      queuePosition={queuePosition}
      queueTotal={queueTotal}
      actions={brandingActions}
      onComplete={(skipped) => {
        if (!skipped && thresholdChange !== 0) {
          setShowThresholdChange(true);
          return;
        }
        onBrandingComplete(skipped);
      }}
    />
  );
}

function NamedEffectActivationSequence({
  props,
  entry,
}: {
  props: ActivationDirectorRouterProps;
  entry: DirectorEntry;
}) {
  const [activationComplete, setActivationComplete] = useState(false);
  const { evt, lum, triggeringPlayer, state } = props;
  const effectType = evt.effectType as 'summon' | 'action' | 'end_of_turn' | 'start_of_turn';

  if (!activationComplete) {
    const procedure = resolveLuminaryProcedure(
      evt.luminaryId,
      effectType,
      state,
      evt.triggeringPlayerId,
      {
        targetCardIds: evt.targetCardIds,
        targetSlotIds: evt.targetSlotIds,
        affinityType: evt.affinityType,
        affinityAmount: evt.affinityAmount,
        affinityReturns: evt.affinityReturns,
      },
    );
    return (
      <LuminaryActivationCinematic
        luminaryId={evt.luminaryId}
        effectType={effectType}
        luminaryName={lum?.name ?? evt.luminaryId}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={props.queuePosition}
        queueTotal={props.queueTotal}
        procedure={procedure.length > 0 ? procedure : undefined}
        victoryRequirementBefore={evt.victoryRequirementBefore}
        victoryRequirementAfter={evt.victoryRequirementAfter}
        onResolutionStart={props.onResolutionStart}
        prepareResolution={props.prepareResolution}
        reducedMotion={props.abridgedAnims}
        playbackMode={props.playbackMode}
        timelinePlaybackRate={props.activationTimelineRate}
        sourceOnly
        onComplete={() => setActivationComplete(true)}
      />
    );
  }

  return entry.renderEffect({ ...props, onResolutionStart: undefined });
}

function EmberEndTurnActivation({
  evt,
  lum,
  triggeringPlayer,
  state,
  abridgedAnims,
  playbackMode,
  activationTimelineRate,
  queuePosition,
  queueTotal,
  onResolutionStart,
  prepareResolution,
  pendingBurnSlots,
  burnActions,
  onBurnComplete,
  onCinematicComplete,
}: ActivationDirectorRouterProps) {
  const [activationComplete, setActivationComplete] = useState(false);
  const targetIds = new Set(evt.targetCardIds ?? []);
  const redirectedToArchive = (state?.burnEvents ?? []).some(
    event => targetIds.has(event.cardId) && event.destination === 'archive',
  );

  if (redirectedToArchive) {
    const procedure = resolveLuminaryProcedure(
      evt.luminaryId,
      'end_of_turn',
      state,
      evt.triggeringPlayerId,
      { targetCardIds: evt.targetCardIds },
    );
    const refillIndex = procedure.findIndex(step => step.type === 'forgeRefill');
    procedure.splice(
      refillIndex >= 0 ? refillIndex : procedure.length,
      0,
      { type: 'archiveReturn', cardIds: evt.targetCardIds ?? [] },
    );
    return (
      <LuminaryActivationCinematic
        luminaryId={evt.luminaryId}
        effectType="end_of_turn"
        luminaryName={lum?.name ?? evt.luminaryId}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        procedure={procedure}
        victoryRequirementBefore={evt.victoryRequirementBefore}
        victoryRequirementAfter={evt.victoryRequirementAfter}
        onResolutionStart={onResolutionStart}
        prepareResolution={prepareResolution}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        onComplete={onCinematicComplete}
      />
    );
  }

  if (!activationComplete) {
    const procedure = resolveLuminaryProcedure(
      evt.luminaryId,
      'end_of_turn',
      state,
      evt.triggeringPlayerId,
      { targetCardIds: evt.targetCardIds },
    );
    return (
      <LuminaryActivationCinematic
        luminaryId={evt.luminaryId}
        effectType="end_of_turn"
        luminaryName={lum?.name ?? evt.luminaryId}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        procedure={procedure.length > 0 ? procedure : undefined}
        victoryRequirementBefore={evt.victoryRequirementBefore}
        victoryRequirementAfter={evt.victoryRequirementAfter}
        onResolutionStart={onResolutionStart}
        prepareResolution={prepareResolution}
        reducedMotion={abridgedAnims}
        playbackMode={playbackMode}
        timelinePlaybackRate={activationTimelineRate}
        sourceOnly
        onComplete={() => setActivationComplete(true)}
      />
    );
  }

  return (
    <CinderMandateBurnDirector
      targetCardIds={evt.targetCardIds ?? []}
      pendingBurnSlots={pendingBurnSlots}
      reducedMotion={abridgedAnims}
      playbackMode={playbackMode}
      timelinePlaybackRate={activationTimelineRate}
      triggeringPlayerName={triggeringPlayer?.playerName}
      queuePosition={queuePosition}
      queueTotal={queueTotal}
      actions={burnActions}
      onComplete={onBurnComplete}
    />
  );
}

// ─── Exported registry slice (for tests and external inspection) ───────────────

/** Public view of a registry entry — without the render function. */
export interface DirectorRouteSpec {
  luminaryId: string;
  effectType: string;
}

/**
 * Read-only slice of DIRECTOR_REGISTRY exposed for unit tests.
 *
 * Scroll-lock state is intentionally omitted because it belongs to the global
 * Luminary presentation lease, not any individual route.
 */
export const DIRECTOR_ROUTES: readonly DirectorRouteSpec[] = DIRECTOR_REGISTRY.map(
  ({ luminaryId, effectType }) => ({ luminaryId, effectType }),
);

export function activationDirectorForcesCamera(
  luminaryId: string,
  effectType: string,
): boolean {
  return DIRECTOR_REGISTRY.some(
    entry => (
      entry.luminaryId === luminaryId &&
      entry.effectType === effectType &&
      entry.forceCamera
    ),
  );
}

export function activationDirectorManagesActivation(
  luminaryId: string,
  effectType: string,
): boolean {
  return DIRECTOR_REGISTRY.some(
    entry => (
      entry.luminaryId === luminaryId &&
      entry.effectType === effectType &&
      entry.managesActivation === true
    ),
  );
}

function ManagedEffectActivation({
  entry,
  props,
}: {
  entry: DirectorEntry;
  props: ActivationDirectorRouterProps;
}) {
  return entry.renderEffect(props);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivationDirectorRouter(props: ActivationDirectorRouterProps) {
  const systemPrefersReducedMotion = !!useReducedMotion();
  const {
    evt,
    lum,
    triggeringPlayer,
    state,
    abridgedAnims: requestedReducedMotion,
    playbackMode,
    activationTimelineRate,
    onCinematicComplete,
  } = props;
  const abridgedAnims = requestedReducedMotion || systemPrefersReducedMotion;
  const effectiveProps = abridgedAnims === requestedReducedMotion
    ? props
    : { ...props, abridgedAnims };

  // Dispatch to the first matching named director in the registry
  const entry = DIRECTOR_REGISTRY.find(
    e => e.luminaryId === evt.luminaryId && e.effectType === evt.effectType,
  );
  if (entry?.managesActivation) {
    return (
      <ManagedEffectActivation
        key={evt.eventId}
        entry={entry}
        props={effectiveProps}
      />
    );
  }
  if (entry) {
    return (
      <NamedEffectActivationSequence
        key={evt.eventId}
        entry={entry}
        props={effectiveProps}
      />
    );
  }

  // ── Generic cinematic for all other Luminary activations ─────────────────
  const procedure = resolveLuminaryProcedure(
    evt.luminaryId,
    evt.effectType as 'summon' | 'action' | 'end_of_turn' | 'start_of_turn',
    state,
    evt.triggeringPlayerId,
    {
      targetCardIds: evt.targetCardIds,
      targetSlotIds: evt.targetSlotIds,
      affinityType: evt.affinityType,
      affinityAmount: evt.affinityAmount,
    },
  );
  return (
    <LuminaryActivationCinematic
      luminaryId={evt.luminaryId}
      effectType={evt.effectType as 'summon' | 'action' | 'end_of_turn' | 'start_of_turn'}
      luminaryName={lum?.name ?? evt.luminaryId}
      triggeringPlayerName={triggeringPlayer?.playerName}
      queuePosition={props.queuePosition}
      queueTotal={props.queueTotal}
      procedure={procedure.length > 0 ? procedure : undefined}
      victoryRequirementBefore={evt.victoryRequirementBefore}
      victoryRequirementAfter={evt.victoryRequirementAfter}
      onResolutionStart={props.onResolutionStart}
      prepareResolution={props.prepareResolution}
      reducedMotion={abridgedAnims}
      playbackMode={playbackMode}
      timelinePlaybackRate={activationTimelineRate}
      onComplete={onCinematicComplete}
    />
  );
}
