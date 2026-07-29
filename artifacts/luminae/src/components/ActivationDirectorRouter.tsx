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
 *     • `render`                     — returns the JSX for that director
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
import { ArtifactBrandingDirector } from './CinderMandateBrandingDirector';
import type { CinderMandateBrandingActions } from './CinderMandateBrandingDirector';
import { CinderMandateBurnDirector } from './CinderMandateBurnDirector';
import type { CinderMandateBurnActions, DirectorBurnSlot } from './CinderMandateBurnDirector';
import { LuminaryActivationCinematic } from './LuminaryActivationCinematic';
import { PhoenixArchiveReturnDirector } from './PhoenixArchiveReturnDirector';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';
import { getLuminaryAnnouncementCopy } from '@/lib/luminaryEffectAnnouncements';
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
  abridgedAnims: boolean;
  pendingBurnSlots: DirectorBurnSlot[];
  queuePosition: number;
  queueTotal: number;
  onResolutionStart?: () => void;

  brandingActions: CinderMandateBrandingActions;
  onBrandingComplete: (skipped?: boolean) => void;

  burnActions: CinderMandateBurnActions;
  onBurnComplete: () => void;

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
  preparesCamera?: boolean;
  render: (props: ActivationDirectorRouterProps) => ReactElement;
}

/**
 * The canonical registry of all named directors.
 *
 * The generic `LuminaryActivationCinematic` fallback is NOT listed here;
 * unmatched events use it automatically.
 */
const DIRECTOR_REGISTRY: readonly DirectorEntry[] = [
  // ── Phoenix Paradox — delayed Burn Pile recovery ─────────────────────────
  {
    luminaryId: 'lum_astral',
    effectType: 'start_of_turn',
    render: ({
      evt,
      triggeringPlayer,
      abridgedAnims,
      queuePosition,
      queueTotal,
      onCinematicComplete,
    }) => (
      <PhoenixArchiveReturnDirector
        cardIds={evt.targetCardIds ?? []}
        reducedMotion={abridgedAnims}
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
    preparesCamera: true,
    render: (props) => (
      <BrandingActivationPrelude
        {...props}
        markerType="condemned"
        resultLabel="Condemned"
      />
    ),
  },

  // ── Forgotten Hour and Black Domain use the same readable brand grammar ──
  {
    luminaryId: 'lum_compass',
    effectType: 'summon',
    preparesCamera: true,
    render: (props) => (
      <BrandingActivationPrelude
        {...props}
        markerType="forgotten"
        resultLabel="Forgotten"
      />
    ),
  },
  {
    luminaryId: 'lum_compass',
    effectType: 'end_of_turn',
    preparesCamera: true,
    render: (props) => (
      <BrandingActivationPrelude
        {...props}
        markerType="forgotten"
        resultLabel="Forgotten"
      />
    ),
  },
  {
    luminaryId: 'lum_null',
    effectType: 'summon',
    preparesCamera: true,
    render: (props) => (
      <BrandingActivationPrelude
        {...props}
        markerType="nullified"
        resultLabel="Nullified"
      />
    ),
  },

  // ── Ember Sovereign — burn phase ───────────────────────────────────────────
  // CinderMandateBurnDirector drives the complete BurnFlash sequence.
  {
    luminaryId: 'lum_ember',
    effectType: 'end_of_turn',
    preparesCamera: true,
    render: (props) => <EmberEndTurnActivation {...props} />,
  },
];

interface BrandingActivationPreludeProps
  extends ActivationDirectorRouterProps {
  markerType: 'condemned' | 'forgotten' | 'nullified';
  resultLabel: string;
}

function BrandingActivationPrelude({
  evt,
  lum,
  triggeringPlayer,
  state,
  abridgedAnims,
  queuePosition,
  queueTotal,
  onResolutionStart,
  brandingActions,
  onBrandingComplete,
  markerType,
  resultLabel,
}: BrandingActivationPreludeProps) {
  const [preludeComplete, setPreludeComplete] = useState(false);
  const effectName = lum?.effectName ?? lum?.name ?? evt.luminaryId;
  const announcementFallback = {
    effectName,
    effectDescription: lum?.effectDescription,
  };
  const sourceAnnouncementCopy = getLuminaryAnnouncementCopy(
    evt.luminaryId,
    'source',
    announcementFallback,
    evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
  );
  const resolutionAnnouncementCopy = getLuminaryAnnouncementCopy(
    evt.luminaryId,
    'resolution',
    announcementFallback,
    evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
  );

  if (!preludeComplete) {
    const procedure = resolveLuminaryProcedure(
      evt.luminaryId,
      evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
      state,
      evt.triggeringPlayerId,
      { targetCardIds: evt.targetCardIds },
    );

    return (
      <LuminaryActivationCinematic
        luminaryId={evt.luminaryId}
        effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
        luminaryName={lum?.name ?? evt.luminaryId}
        effectDescription={sourceAnnouncementCopy}
        resolutionDescription={resolutionAnnouncementCopy}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        procedure={procedure.length > 0 ? procedure : undefined}
        onResolutionStart={onResolutionStart}
        reducedMotion={abridgedAnims}
        onComplete={() => setPreludeComplete(true)}
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
      markerType={markerType}
      effectName={effectName}
      resultLabel={resultLabel}
      effectDescription={resolutionAnnouncementCopy}
      luminaryName={lum?.name ?? evt.luminaryId}
      triggeringPlayerName={triggeringPlayer?.playerName}
      effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
      queuePosition={queuePosition}
      queueTotal={queueTotal}
      actions={brandingActions}
      onComplete={onBrandingComplete}
    />
  );
}

function EmberEndTurnActivation({
  evt,
  lum,
  triggeringPlayer,
  state,
  abridgedAnims,
  queuePosition,
  queueTotal,
  onResolutionStart,
  pendingBurnSlots,
  burnActions,
  onBurnComplete,
  onCinematicComplete,
}: ActivationDirectorRouterProps) {
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
    const effectName = lum?.effectName ?? lum?.name ?? evt.luminaryId;
    const announcementFallback = {
      effectName,
      effectDescription: lum?.effectDescription,
    };
    return (
      <LuminaryActivationCinematic
        luminaryId={evt.luminaryId}
        effectType="end_of_turn"
        luminaryName={lum?.name ?? evt.luminaryId}
        effectDescription={getLuminaryAnnouncementCopy(
          evt.luminaryId,
          'source',
          announcementFallback,
          'end_of_turn',
        )}
        resolutionDescription={getLuminaryAnnouncementCopy(
          evt.luminaryId,
          'resolution',
          announcementFallback,
          'end_of_turn',
        )}
        triggeringPlayerName={triggeringPlayer?.playerName}
        queuePosition={queuePosition}
        queueTotal={queueTotal}
        procedure={procedure}
        onResolutionStart={onResolutionStart}
        reducedMotion={abridgedAnims}
        onComplete={onCinematicComplete}
      />
    );
  }

  return (
    <CinderMandateBurnDirector
      targetCardIds={evt.targetCardIds ?? []}
      pendingBurnSlots={pendingBurnSlots}
      reducedMotion={abridgedAnims}
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

export function activationDirectorPreparesCamera(
  luminaryId: string,
  effectType: string,
): boolean {
  return DIRECTOR_REGISTRY.some(
    entry => (
      entry.luminaryId === luminaryId &&
      entry.effectType === effectType &&
      entry.preparesCamera
    ),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivationDirectorRouter(props: ActivationDirectorRouterProps) {
  const { evt, lum, triggeringPlayer, state, abridgedAnims, onCinematicComplete } = props;

  // Dispatch to the first matching named director in the registry
  const entry = DIRECTOR_REGISTRY.find(
    e => e.luminaryId === evt.luminaryId && e.effectType === evt.effectType,
  );
  if (entry) return entry.render(props);

  // ── Generic cinematic for all other Luminary activations ─────────────────
  const procedure = resolveLuminaryProcedure(
    evt.luminaryId,
    evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
    state,
    evt.triggeringPlayerId,
    { targetCardIds: evt.targetCardIds },
  );
  const effectName = lum?.effectName ?? lum?.name ?? evt.luminaryId;
  const announcementFallback = {
    effectName,
    effectDescription: lum?.effectDescription,
  };
  const sourceAnnouncementCopy = getLuminaryAnnouncementCopy(
    evt.luminaryId,
    'source',
    announcementFallback,
    evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
  );
  const resolutionAnnouncementCopy = getLuminaryAnnouncementCopy(
    evt.luminaryId,
    'resolution',
    announcementFallback,
    evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn',
  );
  return (
    <LuminaryActivationCinematic
      luminaryId={evt.luminaryId}
      effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
      luminaryName={lum?.name ?? evt.luminaryId}
      effectDescription={sourceAnnouncementCopy}
      resolutionDescription={resolutionAnnouncementCopy}
      triggeringPlayerName={triggeringPlayer?.playerName}
      queuePosition={props.queuePosition}
      queueTotal={props.queueTotal}
      procedure={procedure.length > 0 ? procedure : undefined}
      onResolutionStart={props.onResolutionStart}
      reducedMotion={abridgedAnims}
      onComplete={onCinematicComplete}
    />
  );
}
