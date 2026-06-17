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
 *     • `needsScrollLock`            — whether the director reads DOM rects on mount
 *     • `render`                     — returns the JSX for that director
 *
 *   Both `directorNeedsScrollLock` and the component's dispatch loop are
 *   derived from `DIRECTOR_REGISTRY`, so they cannot drift from each other.
 *
 * Current routing table
 *   lum_ember  + summon      → CinderMandateBrandingDirector  (rect-sensitive)
 *   lum_ember  + end_of_turn → CinderMandateBurnDirector      (not rect-sensitive)
 *   all others               → LuminaryActivationCinematic    (not rect-sensitive, fallback)
 */
import type { ReactElement } from 'react';
import { CinderMandateBrandingDirector } from './CinderMandateBrandingDirector';
import type { CinderMandateBrandingActions } from './CinderMandateBrandingDirector';
import { CinderMandateBurnDirector } from './CinderMandateBurnDirector';
import type { CinderMandateBurnActions, DirectorBurnSlot } from './CinderMandateBurnDirector';
import { LuminaryActivationCinematic } from './LuminaryActivationCinematic';
import { resolveLuminaryProcedure } from '@/lib/luminaryAnimationProcedures';
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
 * `needsScrollLock` must be `true` when the director calls
 * `getBoundingClientRect` (or any DOM rect API) on mount — this tells
 * `game.tsx` to freeze the board scroll *before* mounting the director.
 */
interface DirectorEntry {
  luminaryId: string;
  effectType: string;
  /** true iff the director captures DOM rects on mount */
  needsScrollLock: boolean;
  render: (props: ActivationDirectorRouterProps) => ReactElement;
}

/**
 * The canonical registry of all named directors.
 *
 * Both `directorNeedsScrollLock` and the routing dispatch in
 * `ActivationDirectorRouter` are derived from this array — they cannot
 * fall out of sync because they share the same source.
 *
 * The generic `LuminaryActivationCinematic` fallback is NOT listed here;
 * it is never rect-sensitive and does not require scroll-lock.
 */
const DIRECTOR_REGISTRY: readonly DirectorEntry[] = [
  // ── Ember Sovereign — branding phase ──────────────────────────────────────
  // CinderMandateBrandingDirector reads card slot positions via
  // getBoundingClientRect on mount → rect-sensitive → needsScrollLock: true
  {
    luminaryId: 'lum_ember',
    effectType: 'summon',
    needsScrollLock: true,
    render: ({ evt, lum, abridgedAnims, brandingActions, onBrandingComplete }) => (
      <CinderMandateBrandingDirector
        luminaryId={evt.luminaryId}
        lumSummonColor={lum?.summonColor}
        lumSummonSecondaryColor={lum?.summonSecondaryColor}
        targetCardIds={evt.targetCardIds ?? []}
        reducedMotion={abridgedAnims}
        actions={brandingActions}
        onComplete={onBrandingComplete}
      />
    ),
  },

  // ── Ember Sovereign — burn phase ───────────────────────────────────────────
  // CinderMandateBurnDirector drives BurnFlash animations but does NOT read
  // DOM rects on mount → needsScrollLock: false
  {
    luminaryId: 'lum_ember',
    effectType: 'end_of_turn',
    needsScrollLock: false,
    render: ({ evt, pendingBurnSlots, abridgedAnims, burnActions, onBurnComplete }) => (
      <CinderMandateBurnDirector
        targetCardIds={evt.targetCardIds ?? []}
        pendingBurnSlots={pendingBurnSlots}
        reducedMotion={abridgedAnims}
        actions={burnActions}
        onComplete={onBurnComplete}
      />
    ),
  },
];

// ─── Exported registry slice (for tests and external inspection) ───────────────

/** Public view of a registry entry — without the render function. */
export interface DirectorRouteSpec {
  luminaryId: string;
  effectType: string;
  needsScrollLock: boolean;
}

/**
 * Read-only slice of DIRECTOR_REGISTRY exposed for unit tests.
 *
 * Tests iterate this array to validate `directorNeedsScrollLock` for every
 * entry automatically — no test update is needed when new directors are added.
 */
export const DIRECTOR_ROUTES: readonly DirectorRouteSpec[] = DIRECTOR_REGISTRY.map(
  ({ luminaryId, effectType, needsScrollLock }) => ({ luminaryId, effectType, needsScrollLock }),
);

// ─── Scroll-lock predicate ────────────────────────────────────────────────────

/**
 * Returns true for every (luminaryId, effectType) pair whose director
 * snapshots viewport rects on mount and therefore requires the board scroll
 * to be locked *before* the director is mounted.
 *
 * DERIVED from DIRECTOR_REGISTRY — do not edit by hand.  Set
 * `needsScrollLock: true` on the registry entry instead.
 *
 * game.tsx imports this predicate and does not need to be touched when new
 * directors are added.
 */
export function directorNeedsScrollLock(
  luminaryId: string,
  effectType: string,
): boolean {
  return DIRECTOR_REGISTRY.some(
    e => e.luminaryId === luminaryId && e.effectType === effectType && e.needsScrollLock,
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
  return (
    <LuminaryActivationCinematic
      luminaryId={evt.luminaryId}
      effectType={evt.effectType as 'summon' | 'end_of_turn' | 'start_of_turn'}
      luminaryName={lum?.name ?? evt.luminaryId}
      triggeringPlayerName={triggeringPlayer?.playerName}
      procedure={procedure.length > 0 ? procedure : undefined}
      reducedMotion={abridgedAnims}
      onComplete={onCinematicComplete}
    />
  );
}
