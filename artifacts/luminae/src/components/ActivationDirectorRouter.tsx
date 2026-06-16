/**
 * ActivationDirectorRouter
 *
 * Routes a single PendingLuminaryActivationEvent to the appropriate director
 * component.  This file is intentionally kept separate from the large game.tsx
 * so that Babel processes its JSX cleanly (no 500 KB deoptimisation).
 *
 * Routing table
 *   lum_ember  + summon      → CinderMandateBrandingDirector
 *   lum_ember  + end_of_turn → CinderMandateBurnDirector
 *   all others               → LuminaryActivationCinematic
 */
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

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivationDirectorRouter({
  evt,
  lum,
  triggeringPlayer,
  state,
  abridgedAnims,
  pendingBurnSlots,
  brandingActions,
  onBrandingComplete,
  burnActions,
  onBurnComplete,
  onCinematicComplete,
}: ActivationDirectorRouterProps) {
  // ── Ember Sovereign: Cinder Mandate branding director (summon) ─────────────
  if (evt.luminaryId === 'lum_ember' && evt.effectType === 'summon') {
    return (
      <CinderMandateBrandingDirector
        luminaryId={evt.luminaryId}
        lumSummonColor={lum?.summonColor}
        lumSummonSecondaryColor={lum?.summonSecondaryColor}
        targetCardIds={evt.targetCardIds ?? []}
        reducedMotion={abridgedAnims}
        actions={brandingActions}
        onComplete={onBrandingComplete}
      />
    );
  }

  // ── Ember Sovereign: Cinder Mandate burn director (end_of_turn) ────────────
  if (evt.luminaryId === 'lum_ember' && evt.effectType === 'end_of_turn') {
    return (
      <CinderMandateBurnDirector
        targetCardIds={evt.targetCardIds ?? []}
        pendingBurnSlots={pendingBurnSlots}
        reducedMotion={abridgedAnims}
        actions={burnActions}
        onComplete={onBurnComplete}
      />
    );
  }

  // ── Generic cinematic for all other Luminary activations ───────────────────
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
