import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Shield, SkipForward } from 'lucide-react';
import type {
  ArtifactCard,
  CivilizationEventInstance,
  CivilizationEventPlayerOutcome,
  GamePlayerState,
} from '@workspace/api-client-react';
import {
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  getCivilizationCapabilityDefinition,
} from '@workspace/game-types';
import { CivilizationScenePanel } from '@/components/CivilizationScenePanel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import { getCivilizationName, getDominantAffinityPalette, getKardashevTier } from '@/lib/kardashev';

interface CivilizationEventPresentationOverlayProps {
  event: CivilizationEventInstance;
  players: GamePlayerState[];
  reducedMotion?: boolean;
  onComplete: () => void;
}

function eventSceneTier(player: GamePlayerState): 0 | 1 | 2 | 3 {
  const maturity = player.civilization?.scale.historicalMaturity;
  if (maturity === 'galactic') return 3;
  if (maturity === 'stellar') return 2;
  return Math.max(1, getKardashevTier(
    player.forgedArtifacts ?? [],
    player.discountedForgeIds ?? [],
  )) as 1 | 2 | 3;
}

function responseSiteIds(outcome: CivilizationEventPlayerOutcome | undefined): string[] {
  return (outcome?.respondingManifestations ?? []).map((manifestation) => (
    `${manifestation.sourceType}:${manifestation.sourceId}`
  ));
}

function sourceLabel(
  manifestation: CivilizationEventPlayerOutcome['respondingManifestations'][number],
  player: GamePlayerState,
): string {
  if (manifestation.sourceType === 'artifact') {
    return player.forgedArtifacts?.find((card) => card.id === manifestation.sourceId)?.name
      ?? manifestation.sourceId;
  }
  return player.manifestedBlueprintDevices?.find(
    (device) => device.blueprintId === manifestation.sourceId,
  )?.definition?.name ?? manifestation.sourceId;
}

function outcomeTone(outcome: CivilizationEventPlayerOutcome | undefined) {
  if (outcome?.outcomeId === 'protected') {
    return {
      color: '#9ff1d0',
      border: 'rgba(110, 231, 183, 0.42)',
      background: 'rgba(4, 47, 46, 0.82)',
      icon: Shield,
      label: 'Protected',
    };
  }
  if (outcome?.outcomeId === 'partial') {
    return {
      color: '#f8dc9c',
      border: 'rgba(251, 191, 36, 0.42)',
      background: 'rgba(69, 45, 7, 0.84)',
      icon: AlertTriangle,
      label: 'Strained',
    };
  }
  return {
    color: '#ffc1bb',
    border: 'rgba(248, 113, 113, 0.48)',
    background: 'rgba(69, 10, 18, 0.86)',
    icon: AlertTriangle,
    label: 'Exposed',
  };
}

function EventCivilizationScene({
  player,
  outcome,
}: {
  player: GamePlayerState;
  outcome: CivilizationEventPlayerOutcome | undefined;
}) {
  const forgedArtifacts = (player.forgedArtifacts ?? []) as ArtifactCard[];
  const tier = eventSceneTier(player);
  const palette = getDominantAffinityPalette(forgedArtifacts);
  const profile = buildCivilizationProfile(forgedArtifacts);
  const deploymentSites = buildCivilizationDeploymentSites({
    forgedArtifacts,
    tier,
    ownerPlayerId: player.playerId,
    manifestedBlueprintDevices: player.manifestedBlueprintDevices ?? [],
    civilizationArtifacts: player.civilization?.artifacts ?? [],
    activeCapabilityIds: player.civilization?.activeCapabilityIds,
    manifestationAssignments: player.civilization?.manifestationAssignments ?? [],
  });
  const respondingSiteIds = new Set(responseSiteIds(outcome));
  const respondingDeploymentSites = deploymentSites.filter((site) => respondingSiteIds.has(site.id));
  const activeConditions = [...new Set(
    (player.civilization?.activeConditions ?? []).flatMap((condition) => (
      condition.coreType ? [condition.coreType] : []
    )),
  )];

  return (
    <div className="pointer-events-none h-full min-h-0 w-full overflow-hidden" aria-hidden="true">
      <CivilizationScenePanel
        tier={tier}
        palette={palette}
        profile={profile}
        progressFraction={tier >= 3 ? 1 : Math.min(1, Math.max(0.35, forgedArtifacts.length / 8))}
        paused={false}
        civilizationName={player.civName ?? getCivilizationName(palette, tier)}
        presentationMode
        defaultScanActive={(outcome?.respondingManifestations.length ?? 0) > 0}
        defaultScene="stellar"
        showAllArtifactPins={false}
        deploymentSites={respondingDeploymentSites}
        forgedArtifacts={forgedArtifacts}
        civilization={player.civilization}
        guidanceEnabled={false}
        stabilityBand={player.civilization?.stability.band}
        activeConditions={activeConditions}
        externalRecentSiteIds={responseSiteIds(outcome)}
        onOpenArtifact={() => undefined}
      />
    </div>
  );
}

export function CivilizationEventPresentationOverlay({
  event,
  players,
  reducedMotion = false,
  onComplete,
}: CivilizationEventPresentationOverlayProps) {
  const definition = CIVILIZATION_EVENT_CARD_DEFINITIONS[event.definitionId];
  const affectedPlayers = event.affectedPlayerIds
    .map((playerId) => players.find((player) => player.playerId === playerId))
    .filter((player): player is GamePlayerState => Boolean(player));
  const receiptBeat = affectedPlayers.length;
  const [beat, setBeat] = React.useState(-1);
  const [outcomeVisible, setOutcomeVisible] = React.useState(false);
  const completedRef = React.useRef(false);
  const currentPlayer = beat >= 0 && beat < affectedPlayers.length
    ? affectedPlayers[beat]
    : null;
  const currentOutcome = currentPlayer
    ? event.outcomesByPlayerId[currentPlayer.playerId]
    : undefined;

  const advance = React.useCallback(() => {
    setBeat((current) => Math.min(receiptBeat + 1, current + 1));
  }, [receiptBeat]);

  React.useEffect(() => {
    setBeat(-1);
    setOutcomeVisible(false);
    completedRef.current = false;
  }, [event.eventId]);

  React.useEffect(() => {
    if (beat > receiptBeat) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return undefined;
    }

    setOutcomeVisible(false);
    const revealOutcomeTimer = beat >= 0 && beat < receiptBeat
      ? window.setTimeout(() => setOutcomeVisible(true), reducedMotion ? 320 : 850)
      : null;
    const duration = beat < 0
      ? (reducedMotion ? 1150 : 1700)
      : beat === receiptBeat
        ? (reducedMotion ? 2100 : 3000)
        : (reducedMotion ? 1800 : 2700);
    const advanceTimer = window.setTimeout(advance, duration);
    return () => {
      window.clearTimeout(advanceTimer);
      if (revealOutcomeTimer !== null) window.clearTimeout(revealOutcomeTimer);
    };
  }, [advance, beat, onComplete, receiptBeat, reducedMotion]);

  const tone = outcomeTone(currentOutcome);
  const ToneIcon = tone.icon;
  const manifestationLabels = currentPlayer && currentOutcome
    ? currentOutcome.respondingManifestations.map((manifestation) => (
        sourceLabel(manifestation, currentPlayer)
      ))
    : [];
  const capabilityLabels = currentOutcome?.respondingCapabilityIds.map(
    (capabilityId) => getCivilizationCapabilityDefinition(
      capabilityId as Parameters<typeof getCivilizationCapabilityDefinition>[0],
    ).label,
  ) ?? [];

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white"
      style={{ backgroundColor: '#02030a', zIndex: 12100 }}
      data-testid="civilization-event-presentation"
      data-event-id={event.eventId}
      data-response-site-ids={responseSiteIds(currentOutcome).join(',') || undefined}
      aria-live="polite"
    >
      <AnimatePresence mode="wait">
        {currentPlayer ? (
          <motion.div
            key={currentPlayer.playerId}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.38 }}
          >
            <EventCivilizationScene player={currentPlayer} outcome={currentOutcome} />
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'linear-gradient(180deg, rgba(2,3,10,.68) 0%, transparent 22%, transparent 62%, rgba(2,3,10,.88) 100%)',
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            key={beat === receiptBeat ? 'receipt' : 'reveal'}
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(circle at 50% 42%, rgba(89,108,145,.18), transparent 36%), linear-gradient(180deg, #050713, #010208)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.35 }}
          />
        )}
      </AnimatePresence>

      <header
        className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-black/70 px-4 pb-3 sm:px-7"
        style={{ paddingTop: 'max(14px, env(safe-area-inset-top))' }}
      >
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-cyan-100/60">
              Civilization Event
            </div>
            <h2 className="mt-1 font-serif text-xl text-cyan-50 sm:text-3xl">
              {definition.title}
            </h2>
            {beat < 0 && (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/70">
                {definition.rulesText}
              </p>
            )}
          </div>
          <div className="shrink-0 pt-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            {beat < 0
              ? 'First Contact'
              : beat === receiptBeat
                ? 'Event Resolved'
                : `${beat + 1} / ${affectedPlayers.length}`}
          </div>
        </div>
      </header>

      {currentPlayer && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/80 px-4 pt-3 sm:px-7"
          style={{ paddingBottom: 'max(18px, env(safe-area-inset-bottom))' }}
        >
          <div className="mx-auto max-w-6xl pr-12">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                  {currentPlayer.playerName}
                </div>
                <div className="truncate font-serif text-lg text-white sm:text-2xl">
                  {currentPlayer.civName ?? 'Civilization'}
                </div>
              </div>
              <motion.div
                className="flex shrink-0 items-center gap-2 border px-3 py-1.5 text-xs font-black uppercase tracking-widest"
                style={{ color: tone.color, borderColor: tone.border, background: tone.background }}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: outcomeVisible ? 1 : 0, scale: outcomeVisible ? 1 : 0.94 }}
              >
                <ToneIcon className="h-4 w-4" />
                {tone.label}
              </motion.div>
            </div>

            <AnimatePresence>
              {outcomeVisible && currentOutcome && (
                <motion.div
                  className="mt-2 grid gap-1 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div>
                    <p className="font-semibold text-white/90">{currentOutcome.summary}</p>
                    {manifestationLabels.length > 0 && (
                        <p className="mt-0.5 text-xs text-cyan-100/70">
                        {manifestationLabels.join(', ')}
                        {capabilityLabels.length > 0 ? ` — ${capabilityLabels.join(', ')}` : ''}
                      </p>
                    )}
                  </div>
                  {currentOutcome.stabilityPressure > 0 && (
                    <span className="text-xs font-semibold text-amber-100/70">
                      Stability pressure +{currentOutcome.stabilityPressure}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {beat === receiptBeat && (
        <section
          className="absolute inset-x-4 z-20 mx-auto flex max-w-3xl flex-col justify-center"
          style={{ bottom: 'max(28px, env(safe-area-inset-bottom))', top: '7rem' }}
        >
          <div
            className="border-y border-white/10 bg-black/50"
            style={{ paddingBottom: '3.5rem', paddingTop: '1.25rem' }}
          >
            <div className="mb-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-100/60">
              <Check className="h-4 w-4" /> Event Resolved
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {affectedPlayers.map((player) => {
                const outcome = event.outcomesByPlayerId[player.playerId];
                const receiptTone = outcomeTone(outcome);
                return (
                  <div
                    key={player.playerId}
                    className="border-l-2 bg-white/5 px-3 py-2.5"
                    style={{ borderColor: receiptTone.color }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold text-white/88">
                        {player.playerName}
                      </span>
                      <span
                        className="text-[10px] font-black uppercase tracking-widest"
                        style={{ color: receiptTone.color }}
                      >
                        {receiptTone.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-white/60">
                      {outcome?.summary ?? 'No result recorded.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {beat <= receiptBeat && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="absolute right-4 z-30 grid h-10 w-10 place-items-center border border-white/20 bg-black/70 text-white/70 transition-colors hover:border-white/35 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
              onClick={advance}
              aria-label="Skip current Event beat"
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Skip current beat</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
