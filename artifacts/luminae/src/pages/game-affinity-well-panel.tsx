import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Undo2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AffinityWellCells } from '@/components/AffinityWell';
import { AffinityReservoirSymbol } from '@/components/AffinityReservoirSymbol';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { AFFINITIES, localTurnVariants } from './game-constants';
import { EminenceProgress, EminenceSigil, AffinityToken } from './game-card';
import { PlayerAvatar } from './game-player';
import { HarnessConvergenceLayer } from './game-causal-motion';

type AffinitySelection = Partial<Record<AffinityKey, number>>;

export interface AffinityWellPanelScope {
  canPlan: any;
  cancelReturnPhase: any;
  confirmAffinities: any;
  confirmReturnPhase: any;
  coreActionSubmitted: any;
  affinityQueueActive: any;
  dismissUndoHint: any;
  eminencePanelImpact: any;
  flashSent: any;
  forgeDeductions: any;
  handleAffinityClick: any;
  handlePlanAction: any;
  handleUndoAffinity: any;
  harnessPulseKey: number;
  harnessBlockedKeys: any;
  harnessBurstKeys: any;
  isActivePlayer: any;
  isMyTurn: any;
  isMyTurnForCoreAction: any;
  isSideAffinityWell: any;
  isTutorial: any;
  me: any;
  playerPanelRef: any;
  promoteToTake2: any;
  harnessLegality: any;
  returnPhase: any;
  returnSelections: AffinitySelection;
  selectedAffinities: AffinitySelection;
  sentFlashBtn: any;
  session: any;
  setActionMode: any;
  setAffinityHistory: any;
  setForgedFilter: any;
  setHarnessPulseKey: React.Dispatch<React.SetStateAction<number>>;
  setPrePromotionHistory: any;
  setReturnSelections: React.Dispatch<React.SetStateAction<AffinitySelection>>;
  setSelectedAffinities: any;
  setShowEminenceBreakdown: any;
  setShowForgedOverlay: any;
  setShowReservedOverlay: any;
  showForgeHint: any;
  showReserveHint: any;
  showUndoHint: any;
  singularityAbsorbKey: any;
  state: any;
  tutorialAttention: any;
  tutorialStep: any;
  tutorialZone: any;
  victoryRequirement: any;
}

function sameScope(previous: AffinityWellPanelScope, next: AffinityWellPanelScope) {
  const keys = Object.keys(previous) as Array<keyof AffinityWellPanelScope>;
  return keys.length === Object.keys(next).length
    && keys.every(key => Object.is(previous[key], next[key]));
}

export const AffinityWellPanel = React.memo(function AffinityWellPanel({ scope }: { scope: AffinityWellPanelScope }) {
  const {
    canPlan,
    cancelReturnPhase,
    confirmAffinities,
    confirmReturnPhase,
    coreActionSubmitted,
    affinityQueueActive,
    dismissUndoHint,
    eminencePanelImpact,
    flashSent,
    forgeDeductions,
    handleAffinityClick,
    handlePlanAction,
    handleUndoAffinity,
    harnessPulseKey,
    harnessBlockedKeys,
    harnessBurstKeys,
    isActivePlayer,
    isMyTurn,
    isMyTurnForCoreAction,
    isSideAffinityWell,
    isTutorial,
    me,
    playerPanelRef,
    promoteToTake2,
    harnessLegality,
    returnPhase,
    returnSelections,
    selectedAffinities,
    sentFlashBtn,
    session,
    setActionMode,
    setAffinityHistory,
    setForgedFilter,
    setHarnessPulseKey,
    setPrePromotionHistory,
    setReturnSelections,
    setSelectedAffinities,
    setShowEminenceBreakdown,
    setShowForgedOverlay,
    setShowReservedOverlay,
    showForgeHint,
    showReserveHint,
    showUndoHint,
    singularityAbsorbKey,
    state,
    tutorialAttention,
    tutorialStep,
    tutorialZone,
    victoryRequirement,
  } = scope;
  const [wellDockExpanded, setWellDockExpanded] = React.useState(false);
  const wellActionActive = affinityQueueActive || !!returnPhase;
  const wellForcedOpen = isSideAffinityWell || isTutorial || wellActionActive;
  const wellExpanded = wellForcedOpen || wellDockExpanded;

  React.useEffect(() => {
    if (wellActionActive) setWellDockExpanded(true);
  }, [wellActionActive]);

  if (!me) return null;
  const heldTotal = Object.values((me.affinities ?? {}) as AffinitySelection).reduce((a, b) => a + (b ?? 0), 0);
  const pendingTotal = Object.values(selectedAffinities).reduce((a, b) => a + (b ?? 0), 0);
  const projectedHeldTotal = heldTotal + pendingTotal;
  const affinityHoldings = (me.affinities ?? {}) as AffinitySelection;
  const affinityBonuses = (me.bonuses ?? {}) as AffinitySelection;
  const affinityBank = (state.affinityWell ?? {}) as AffinitySelection;
  const standardReservoirCapacity = state.players.length <= 2 ? 4 : state.players.length === 3 ? 5 : 7;
  const compactAffinityLabel = (AFFINITIES as AffinityKey[]).map((affinity) => {
    const meta = AFFINITY_META[affinity];
    const held = affinityHoldings[affinity] ?? 0;
    const bonus = affinity === 'singularity' ? 0 : affinityBonuses[affinity] ?? 0;
    const reservoir = affinityBank[affinity] ?? 0;
    const capacity = affinity === 'singularity' ? 5 : standardReservoirCapacity;
    return `${meta.name} ${held}${bonus > 0 ? ` plus ${bonus} permanent` : ''}, reservoir ${reservoir} of ${capacity}`;
  }).join('. ');

	  return (
	    <div
	      ref={playerPanelRef}
          data-testid="affinity-well-panel"
	      data-shared-affinity-well=""
          data-well-expanded={wellExpanded ? 'true' : 'false'}
          data-return-phase={returnPhase && isMyTurn ? 'true' : 'false'}
	          className={`affinity-well-panel shrink-0 z-20 transition-all ${isSideAffinityWell ? 'affinity-well-panel--side' : ''}`}
          style={{
            background: 'linear-gradient(180deg, rgba(6,4,20,0.97) 0%, rgba(4,2,14,0.99) 100%)',
            borderTop: isMyTurn
              ? '1px solid rgba(168,197,255,0.5)'
              : '1px solid rgba(168,197,255,0.2)',
            boxShadow: isMyTurn
              ? '0 -4px 28px rgba(168,197,255,0.12)'
              : '0 -2px 12px rgba(0,0,0,0.4)',
          }}
          onClickCapture={() => {
            requestAnimationFrame(() => {
              const active = document.activeElement as HTMLElement | null;
              if (active && playerPanelRef.current?.contains(active)) active.blur();
            });
          }}
        >
          <HarnessConvergenceLayer
            selectedAffinities={selectedAffinities}
            harnessBurstKeys={harnessBurstKeys}
          />
          {/* ── Zone header row ── */}
          <div className="affinity-well-header">
            {/* Left: zone name */}
            <div className="affinity-well-title flex items-center gap-2">
              <span data-affinity-held-target="">
                <AffinityReservoirSymbol
                  value={projectedHeldTotal}
                  title={`${projectedHeldTotal} affinities held`}
                  ariaLabel={`${projectedHeldTotal} affinities held`}
                />
              </span>
              <div className="affinity-well-title-text flex flex-col leading-none">
                <span className="text-[7px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(168,197,255,0.5)' }}>The</span>
                <span className="text-[12px] font-black uppercase tracking-[0.06em] leading-none" style={{
                  color: '#a8c5ff',
                  textShadow: '0 0 18px rgba(168,197,255,0.35)',
                }}>Affinity Well</span>
              </div>
            </div>
            {/* Center: identity */}
            <motion.div
              initial={false}
              animate={isMyTurn ? 'active' : 'idle'}
              variants={localTurnVariants}
              className="affinity-well-player flex items-center gap-1.5 min-w-0"
            >
              <span
                data-player-affinity-source={me.playerId}
                className="inline-flex min-w-0 items-center gap-1.5"
              >
                <PlayerAvatar avatarId={session.avatarId} name={me.playerName} size={18} />
                {isMyTurn && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                <span className="text-[11px] font-semibold truncate max-w-[80px]">{me.playerName}</span>
                {isMyTurn && (
                  <span className="text-[9px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>
                )}
              </span>
            </motion.div>
            {/* Right: stats */}
            <div className="affinity-well-status shrink-0">
              <button
                type="button"
                className="affinity-well-dock-toggle"
                onClick={() => setWellDockExpanded((expanded) => !expanded)}
                disabled={wellForcedOpen}
                aria-expanded={wellExpanded}
                aria-label={wellForcedOpen
                  ? 'Affinity Well remains open during this action'
                  : wellExpanded ? 'Collapse Affinity Well' : 'Expand Affinity Well'}
                title={wellForcedOpen
                  ? 'Finish or cancel this action to collapse the Affinity Well'
                  : wellExpanded ? 'Collapse Affinity Well' : 'Expand Affinity Well'}
              >
                {wellExpanded
                  ? <ChevronDown aria-hidden="true" />
                  : <ChevronUp aria-hidden="true" />}
              </button>
              <button
                type="button"
                data-eminence-panel="player"
                onClick={() => setShowEminenceBreakdown(true)}
                className={`affinity-well-eminence rounded-md transition-transform hover:scale-[1.03] active:scale-95 ${
                  me.eminence >= victoryRequirement
                    ? 'affinity-well-eminence--victory'
                    : me.eminence >= victoryRequirement - 3
                      ? 'affinity-well-eminence--critical'
                      : me.eminence >= victoryRequirement - 6
                        ? 'affinity-well-eminence--near'
                        : ''
                } ${eminencePanelImpact ? 'affinity-well-eminence--impact' : ''}`}
                title={`Eminence: reach ${victoryRequirement} to win. View Eminence breakdown.`}
                aria-label={`Eminence ${me.eminence} of ${victoryRequirement}. View Eminence breakdown.`}
                style={isTutorial && (tutorialStep === 9 || tutorialStep === 11) ? {
                  boxShadow: '0 0 0 2px rgba(168,85,247,0.6), 0 0 12px 3px rgba(168,85,247,0.22)',
                  borderRadius: 8,
                  transition: 'box-shadow 0.3s',
                } : undefined}
              >
                <EminenceProgress
                  value={me.eminence}
                  target={victoryRequirement}
                  sigilTarget="player"
                  impactKey={eminencePanelImpact?.key ?? null}
                />
                {eminencePanelImpact && (
                  <span key={eminencePanelImpact.key} className="affinity-well-eminence__impact-label">
                    +{eminencePanelImpact.amount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="affinity-well-compact-strip" data-testid="affinity-resource-strip">
            <div className="affinity-well-compact-held">
              <span data-affinity-held-target="">
                <AffinityReservoirSymbol
                  value={projectedHeldTotal}
                  title={`${projectedHeldTotal} affinities held`}
                  ariaLabel={`${projectedHeldTotal} affinities held`}
                />
              </span>
              <span
                className="affinity-well-compact-avatar"
                data-player-affinity-source={me.playerId}
                title={me.playerName}
              >
                <PlayerAvatar avatarId={session.avatarId} name={me.playerName} size={16} />
              </span>
            </div>

            <button
              type="button"
              className="affinity-well-compact-overview"
              onClick={() => setWellDockExpanded(true)}
              aria-label={`Expand Affinity Well. ${compactAffinityLabel}`}
              title="Expand Affinity Well"
            >
              <ChevronUp className="affinity-well-compact-chevron" aria-hidden="true" />
              {(AFFINITIES as AffinityKey[]).map((affinity) => {
                const meta = AFFINITY_META[affinity];
                const held = affinityHoldings[affinity] ?? 0;
                const bonus = affinity === 'singularity' ? 0 : affinityBonuses[affinity] ?? 0;
                const reservoir = affinityBank[affinity] ?? 0;
                const capacity = affinity === 'singularity' ? 5 : standardReservoirCapacity;
                const reservoirProgress = Math.max(0, Math.min(1, reservoir / Math.max(1, capacity)));
                return (
                  <span
                    key={affinity}
                    className="affinity-well-compact-affinity"
                    data-affinity={affinity}
                    style={{
                      '--compact-affinity': meta.hex,
                      '--compact-affinity-glow': meta.glowHex,
                      '--compact-reservoir-fill': `${reservoirProgress * 100}%`,
                    } as React.CSSProperties}
                  >
                    <img
                      src={meta.image}
                      alt=""
                      data-affinity-symbol={affinity}
                      draggable={false}
                    />
                    <span className="affinity-well-compact-count">{held}</span>
                    {bonus > 0 && (
                      <span className="affinity-well-compact-bonus">+{bonus}</span>
                    )}
                    <span className="affinity-well-compact-meter" aria-hidden="true">
                      <span />
                    </span>
                  </span>
                );
              })}
            </button>

            <button
              type="button"
              className="affinity-well-compact-eminence"
              onClick={() => setShowEminenceBreakdown(true)}
              aria-label={`Eminence ${me.eminence} of ${victoryRequirement}. View Eminence breakdown.`}
              title={`Eminence ${me.eminence} of ${victoryRequirement}`}
            >
              <EminenceSigil size={20} value={me.eminence} target={victoryRequirement} />
              <span>{me.eminence}</span>
              {eminencePanelImpact && (
                <span className="affinity-well-compact-eminence-impact">+{eminencePanelImpact.amount}</span>
              )}
            </button>
          </div>

          {/* ── Affinity cells ── */}
          <AffinityWellCells
            me={me}
            state={state}
            selectedAffinities={selectedAffinities}
            isMyTurn={isMyTurn}
            canPlan={canPlan}
            isActivePlayer={isActivePlayer}
            isTutorial={isTutorial}
            tutorialZone={tutorialZone}
            tutorialAttention={tutorialAttention}
            sessionPlayerId={session?.playerId}
            harnessBurstKeys={harnessBurstKeys}
            harnessBlockedKeys={harnessBlockedKeys}
            forgeDeductions={forgeDeductions}
            singularityAbsorbKey={singularityAbsorbKey}
            onAffinityClick={handleAffinityClick}
            onPromoteToTake2={promoteToTake2}
            onOpenReserved={() => setShowReservedOverlay(true)}
            onOpenForged={(c) => { setForgedFilter(c); setShowForgedOverlay(true); }}
          />

          {/* ── Fixed action zone — harness bar and hint crossfade in-place, no layout shift ── */}
          <div className="affinity-well-action-zone relative" style={{ height: 'var(--well-action-zone-h, 44px)', overflow: 'hidden' }}>
            <motion.div
              animate={{ opacity: affinityQueueActive ? 1 : 0 }}
              transition={{ duration: 0.15 }}
              style={{
                pointerEvents: affinityQueueActive ? 'auto' : 'none',
                position: 'absolute',
                inset: 0,
                ...(tutorialZone === 'well' && tutorialAttention === 'action' && affinityQueueActive ? {
                  boxShadow: '0 0 0 2px rgba(168,85,247,0.55), 0 0 18px 5px rgba(168,85,247,0.16)',
                } : {}),
              }}
            >
                <div className="px-2 pb-2 pt-1 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5 flex-1 items-center flex-wrap">
                      {Object.entries(selectedAffinities).filter(([c, n]) =>
                        (n ?? 0) > 0 && Object.prototype.hasOwnProperty.call(AFFINITY_META, c)
                      ).map(([c, n]) => (
                        <div key={c} className="flex items-center gap-1 bg-black/50 rounded-full pl-1.5 pr-2 py-0.5 border border-white/10">
                          <AffinityToken color={c as AffinityKey} size={12} />
                          <span className="text-xs font-bold text-white">×{n}</span>
                        </div>
                      ))}
                      <span className={`text-[10px] font-medium ${harnessLegality.ok ? (!isMyTurn && canPlan ? 'text-amber-400' : 'text-green-400') : harnessLegality.reason ? 'text-amber-400' : 'text-white/40'}`}>
                        {(!isMyTurn && canPlan && harnessLegality.reason
                          ? `Plan: ${harnessLegality.reason}`
                          : harnessLegality.reason) || 'Pick affinities'}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0 relative">
                      <AnimatePresence>
                        {showUndoHint && !showForgeHint && !showReserveHint && (
                          <motion.button
                            type="button"
                            initial={{ opacity: 0, y: 6, scale: 0.92 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            onClick={dismissUndoHint}
                            className="absolute bottom-full mb-1.5 left-0 whitespace-nowrap flex items-center gap-1 bg-black/90 border border-white/20 rounded-md px-2 py-1 text-[10px] text-white/80 shadow-lg z-10"
                            title="Dismiss hint"
                          >
                            <Undo2 className="h-2.5 w-2.5 text-white/60 shrink-0" />
                            <span>← Back removes the last affinity</span>
                            <span className="text-white/40 ml-0.5">✕</span>
                          </motion.button>
                        )}
                      </AnimatePresence>
                      <Button variant="outline" size="sm" className="h-11 w-11 p-0 rounded-lg" onClick={handleUndoAffinity} title="Undo last affinity" aria-label="Undo last affinity">
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="h-11 w-11 p-0 rounded-lg"
                        title="Clear selected affinities"
                        aria-label="Clear selected affinities"
                        onClick={() => { setActionMode('none'); setSelectedAffinities({}); setAffinityHistory([]); setPrePromotionHistory(null); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                      {isMyTurnForCoreAction ? (
                        (() => {
                          const selMetas = Object.keys(selectedAffinities)
                            .map((key) => {
                              const meta = AFFINITY_META[key as AffinityKey];
                              return {
                                key: key as AffinityKey,
                                count: selectedAffinities[key as AffinityKey] ?? 0,
                                meta,
                              };
                            })
                            .filter((entry): entry is { key: AffinityKey; count: number; meta: (typeof AFFINITY_META)[AffinityKey] } =>
                              entry.count > 0 && !!entry.meta && typeof entry.meta.hex === 'string'
                            );
                          const firstMeta = selMetas[0]?.meta;
                          const hasColors = !!firstMeta && harnessLegality.ok;
                          const borderColor = hasColors ? `${firstMeta.hex}70` : 'rgba(255,255,255,0.18)';
                          const harnessBackground = selMetas.length === 0
                            ? 'transparent'
                            : [
                                ...selMetas.map(({ meta }, i) => {
                                  const positions = [
                                    ['18%', '48%'],
                                    ['50%', '22%'],
                                    ['80%', '52%'],
                                  ];
                                  const [x, y] = positions[i % positions.length];
                                  return `radial-gradient(circle at ${x} ${y}, ${meta.hex} 0%, ${meta.hex}cc 13%, transparent 33%)`;
                                }),
                                `linear-gradient(90deg, ${firstMeta?.hex ?? '#ffffff'}55, rgba(255,255,255,0.10), ${selMetas[selMetas.length - 1]?.meta.hex ?? firstMeta?.hex ?? '#ffffff'}55)`,
                              ].join(', ');
                          return (
                            <motion.button
                              type="button"
                                  data-testid="harness-button"
                              whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                              className="relative h-11 min-h-11 px-3 rounded-lg overflow-hidden flex items-center justify-center border transition-all duration-500 shrink-0 cursor-pointer"
                              style={{ background: 'rgba(255,255,255,0.03)', borderColor, boxShadow: hasColors ? `inset 0 1px 0 rgba(255,255,255,0.18), 0 0 14px ${firstMeta.hex}44` : 'inset 0 1px 0 rgba(255,255,255,0.08)', touchAction: 'manipulation' }}
                              disabled={!harnessLegality.ok}
                              aria-label={harnessLegality.ok ? harnessLegality.reason : 'Select a valid Harness combination'}
                              onClick={() => { setHarnessPulseKey(k => k + 1); confirmAffinities(); }}
                            >
                              {selMetas.length > 0 && (
                                <div key={harnessPulseKey} className={harnessPulseKey > 0 ? 'harness-press-flash' : ''} style={{ position: 'absolute', width: '220%', height: '220%', top: '-60%', left: '-60%' }}>
                                  <div className="w-full h-full harness-swirl-ring harness-swirl-soft" style={{ background: harnessBackground, opacity: 0.48 }} />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.13] to-transparent pointer-events-none" />
                              <span className="relative z-10 text-xs font-bold transition-colors duration-300 select-none" style={{ color: hasColors ? '#fff' : 'rgba(255,255,255,0.35)', textShadow: hasColors ? '0 1px 5px rgba(0,0,0,0.85)' : 'none' }}>
                                <AnimatePresence mode="wait" initial={false}>
                                  {sentFlashBtn === 'harness' ? (
                                    <motion.span key="sent" className="flex items-center gap-1 text-emerald-300" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }} exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}>
                                      <Check className="h-3 w-3" />Sent
                                    </motion.span>
                                  ) : (
                                    <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.1 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                                      Harness
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.button>
                          );
                        })()
                      ) : canPlan && !coreActionSubmitted && harnessLegality.ok ? (
                        (() => {
                          const planSelKeys = Object.keys(selectedAffinities).filter((key): key is AffinityKey =>
                            (selectedAffinities[key as AffinityKey] ?? 0) > 0 && Object.prototype.hasOwnProperty.call(AFFINITY_META, key)
                          );
                          const planHasColors = planSelKeys.length > 0;
                          return (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.93, transition: { duration: 0.07 } }}
                              className="relative h-11 min-h-11 px-2.5 rounded-lg overflow-hidden flex items-center justify-center border transition-all duration-500 shrink-0 cursor-pointer"
                              aria-label={`Plan ${harnessLegality.reason}`}
                              style={{ background: planHasColors ? 'rgba(82,48,10,0.82)' : 'rgba(44,28,10,0.74)', borderColor: planHasColors ? 'rgba(251,191,36,0.55)' : 'rgba(251,191,36,0.28)', boxShadow: planHasColors ? 'inset 0 1px 0 rgba(255,255,255,0.12), 0 0 8px rgba(251,191,36,0.18)' : 'inset 0 1px 0 rgba(255,255,255,0.06)', touchAction: 'manipulation' }}
                              onClick={async () => {
                                let sent = false;
                                if (harnessLegality.actionType === 'take3') {
                                  sent = await handlePlanAction({ type: 'harness_three_affinities', affinities: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0, ...selectedAffinities } });
                                } else if (harnessLegality.actionType === 'take2' && planSelKeys[0]) {
                                  sent = await handlePlanAction({ type: 'harness_two_affinities', affinity: planSelKeys[0] });
                                }
                                if (sent) flashSent('plan_harness');
                              }}
                            >
                              {planHasColors && (
                                <div style={{ position: 'absolute', width: '220%', height: '220%', top: '-60%', left: '-60%' }}>
                                  <div
                                    className="w-full h-full harness-swirl-ring harness-swirl-soft"
                                    style={{
                                      background: 'radial-gradient(circle at 26% 42%, rgba(251,191,36,0.68) 0%, rgba(251,191,36,0.55) 14%, transparent 34%), radial-gradient(circle at 72% 58%, rgba(255,244,190,0.48) 0%, rgba(251,191,36,0.36) 16%, transparent 38%), linear-gradient(90deg, rgba(251,191,36,0.28), rgba(255,255,255,0.09), rgba(251,191,36,0.28))',
                                      opacity: 0.30,
                                    }}
                                  />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.10] to-transparent pointer-events-none" />
                              <span className="relative z-10 text-xs font-bold select-none flex items-center gap-1.5">
                                <AnimatePresence mode="wait" initial={false}>
                                  {sentFlashBtn === 'plan_harness' ? (
                                    <motion.span key="sent" className="flex items-center gap-1 text-emerald-300" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.1 } }} exit={{ opacity: 0, y: -4, transition: { duration: 0.2 } }}>
                                      <Check className="h-3 w-3" />Sent
                                    </motion.span>
                                  ) : (
                                    <motion.span key="label" className="flex items-center gap-1.5" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.1 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
                                      <span className="text-[7.5px] font-black uppercase tracking-wider text-amber-400 bg-amber-950/70 border border-amber-500/50 rounded px-[5px] py-[1px] leading-none">PLAN</span>
                                      <span style={{ color: planHasColors ? '#fde68a' : 'rgba(255,255,255,0.35)' }}>Harness</span>
                                    </motion.span>
                                  )}
                                </AnimatePresence>
                              </span>
                            </motion.button>
                          );
                        })()
                      ) : null}
                    </div>
                  </div>
                </div>
            </motion.div>
            {/* Hint text — crossfades in the same fixed slot, no layout shift */}
            <motion.div
              animate={{ opacity: affinityQueueActive ? 0 : 1 }}
              transition={{ duration: 0.15 }}
              style={{ pointerEvents: affinityQueueActive ? 'none' : 'auto', position: 'absolute', inset: 0 }}
              className="flex items-center justify-center"
            >
              <span className="text-[8.5px] text-white/30 leading-none">
                Select 3 different or 2 of the same affinities. Limit 10 can be held <span className="text-white/50 font-semibold">at once</span>.
              </span>
            </motion.div>
          </div>

          {/* ── Return-affinities phase (capacity exceeded) ── */}
          <AnimatePresence>
            {returnPhase && isMyTurn && me && (
              <motion.div
                initial={{ opacity: 0, scale: 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.985 }}
                className="affinity-return-phase"
              >
                <div className="affinity-return-phase__surface px-2 pb-2 pt-2 border border-amber-500/40 bg-amber-950/25">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-[11px] font-bold text-amber-300">
                        Return {returnPhase.excessCount} affinity token{returnPhase.excessCount > 1 ? 's' : ''} — capacity is 10
                      </p>
                      {(() => {
                        const sel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                        const remaining = returnPhase.excessCount - sel;
                        return (
                          <p className="text-[10px] text-white/50 mt-0.5">
                            {remaining > 0 ? `Select ${remaining} more to return` : returnPhase.actionType === 'reserve' ? 'Ready — confirm to encrypt' : 'Ready — confirm to harness'}
                          </p>
                        );
                      })()}
                    </div>
                    <button type="button" onClick={cancelReturnPhase}
                      aria-label="Cancel Affinity return"
                      className="h-11 w-11 rounded-lg flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="affinity-return-phase__grid grid grid-cols-6 gap-1.5 mb-3">
                    {(AFFINITIES as AffinityKey[]).map((c) => {
                      const held = me.affinities[c as AffinityKey] ?? 0;
                      const taking = returnPhase.pendingTake[c as AffinityKey] ?? 0;
                      const have = held + taking;
                      const returning = returnSelections[c as AffinityKey] ?? 0;
                      const available = have - returning;
                      if (have === 0) return null;
                      const meta = AFFINITY_META[c as AffinityKey];
                      const isMarkedReturn = returning > 0;
                      const totalSel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                      const canAdd = available > 0 && totalSel < returnPhase.excessCount;
                      return (
                        <div key={c} className="affinity-return-phase__option flex flex-col items-center gap-0.5">
                          <motion.button type="button" whileTap={canAdd ? { scale: 0.88 } : {}}
                            onClick={() => { if (!canAdd) return; setReturnSelections(prev => ({ ...prev, [c]: (prev[c as AffinityKey] ?? 0) + 1 })); }}
                            className="affinity-return-phase__token relative w-full rounded-xl flex flex-col items-center justify-center overflow-hidden transition-all"
                            style={isMarkedReturn ? {
                              background: `linear-gradient(160deg, #7f1d1d99 0%, #991b1b70 100%)`,
                              border: `2px solid #f87171cc`, boxShadow: `0 0 16px #f8717166`, opacity: canAdd ? 1 : 0.85,
                            } : { background: `linear-gradient(160deg, ${meta.hex}30 0%, ${meta.hex}12 100%)`, border: `1px solid ${meta.glowHex}55`, opacity: canAdd ? 1 : 0.4 }}
                          >
                            <img src={meta.image} alt={meta.name} className="w-[55%] h-[55%] object-contain pointer-events-none select-none" style={{ filter: `drop-shadow(0 0 6px ${meta.glowHex}80)` }} draggable={false} />
                            <span className="text-xs font-black font-mono leading-none text-white" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>{available}</span>
                            {isMarkedReturn && (
                              <div className="absolute top-0.5 right-0.5 h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] font-black text-white leading-none shadow">-{returning}</div>
                            )}
                          </motion.button>
                          <span className="text-[8px] font-semibold uppercase tracking-wider leading-none" style={{ color: `${meta.glowHex}88` }}>{meta.shortName}</span>
                          {returning > 0 && (
                            <button type="button"
                              onClick={() => setReturnSelections(prev => {
                                const curr = prev[c as AffinityKey] ?? 0;
                                if (curr <= 1) { const next = { ...prev }; delete next[c as AffinityKey]; return next; }
                                return { ...prev, [c]: curr - 1 };
                              })}
                              className="text-[8px] text-red-400/70 hover:text-red-400 font-bold leading-none"
                            >undo</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(() => {
                    const sel = Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0);
                    const ready = sel === returnPhase.excessCount;
                    return (
                      <motion.button type="button" whileTap={ready ? { scale: 0.96 } : {}} disabled={!ready} onClick={confirmReturnPhase}
                        className="affinity-return-phase__confirm w-full h-9 rounded-xl text-sm font-bold transition-all"
                        style={ready ? {
                          background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', color: '#fff',
                          boxShadow: '0 0 18px rgba(124,58,237,0.55)', border: '1px solid rgba(167,139,250,0.5)',
                        } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'not-allowed' }}
                      >
                        {ready ? (returnPhase.actionType === 'reserve' ? 'Confirm Return & Encrypt' : 'Confirm Return & Harness') : `Select ${returnPhase.excessCount - Object.values(returnSelections).reduce((a, b) => a + (b ?? 0), 0)} more to return`}
                      </motion.button>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

    </div>
  );
}, (previous, next) => sameScope(previous.scope, next.scope));
