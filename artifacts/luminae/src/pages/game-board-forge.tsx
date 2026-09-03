import React from 'react';
import { motion } from 'framer-motion';
import { ChevronsRight, Hammer, LayoutGrid } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ArtifactCard, GamePlayerState, GameState } from '@workspace/api-client-react';
import type { AffinityKey } from '@/lib/affinityMeta';
import { TIER_CIVILIZATION } from './game-constants';
import type { MarkerType } from './game-luminary-effects';
import type { CostMode, SelectedCard } from './game-types';
import { ForgeCardSlot } from './game-board-forge-card-slot';
import { ForgeDeckPile } from './game-board-forge-deck';

type MotionAnimate = React.ComponentProps<typeof motion.div>['animate'];

export function withPersistentAvatarSeedMolds<T>(
  cards: readonly (T | null)[],
  tier: 1 | 2 | 3,
  moldSlots: readonly string[],
): (T | null)[] {
  let lastSeededMold = -1;
  for (const slotKey of moldSlots) {
    const [slotTier, slotIndex] = slotKey.split('-').map(Number);
    if (slotTier !== tier || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex > 3) continue;
    lastSeededMold = Math.max(lastSeededMold, slotIndex);
  }

  const visibleMoldCount = Math.max(cards.length, lastSeededMold + 1);
  return Array.from({ length: visibleMoldCount }, (_, index) => cards[index] ?? null);
}

export interface BoardForgeProps {
  brandDelayMap: Map<string, number>;
  burnChipAnim: MotionAnimate;
  burnChipArrivalAnim: MotionAnimate;
  burstGhostCards: Record<string, ArtifactCard>;
  ironHarbingerGhostIds: Record<string, string>;
  canPlan: boolean;
  cardDetailDiscovered: boolean;
  computeCosts: (card: ArtifactCard, mode: CostMode) => Partial<Record<AffinityKey, number>> | undefined;
  costMode: CostMode;
  flippingCards: Set<string>;
  getCardFocusProps: (
    tierIndex: number,
    columnIndex: number,
    cardName: string,
    eminence: number | undefined,
    tier: number,
    onActivate: () => void,
  ) => React.HTMLAttributes<HTMLElement>;
  ghostArtifactMarkerTypesRef: React.MutableRefObject<Map<string, string>>;
  handleCancelPlan: () => void | Promise<void>;
  handleCardTap: (card: ArtifactCard, fromReserve: boolean) => void;
  handleDeckTap: (tier: 1 | 2 | 3) => void;
  hiddenSlots: Set<string>;
  isCameraControlled: boolean;
  isLandscapeCockpit: boolean;
  isMyTurn: boolean;
  isTutorial: boolean;
  forgeCompact: boolean;
  me: GamePlayerState | null | undefined;
  newlyMarkedCardIds: Set<string>;
  plannedCardId: string | null;
  plannedCardLabel: string;
  plannedDeckTier: number | null;
  refillingSlots: Set<string>;
  revealBlueprintText: boolean;
  selectedCard: SelectedCard | null;
  setCostMode: React.Dispatch<React.SetStateAction<CostMode>>;
  setForgeCompact: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBurnPileOverlay: React.Dispatch<React.SetStateAction<boolean>>;
  setTracedSourceLumId: React.Dispatch<React.SetStateAction<string | null>>;
  state: GameState;
  strikeAuraMap: Map<string, { type: MarkerType; delay?: number }>;
  suppressedBrandTypesByCardId: Map<string, ReadonlySet<string>>;
  suppressedMarkerIds: Set<string>;
  tutorialAttention: string | null | undefined;
  tutorialStep: number;
  tutorialZone: string | null | undefined;
  viewOrchestrator: { onManualToggle: () => void };
}

export const BoardForge = React.memo(function BoardForge({
  brandDelayMap,
  burnChipAnim,
  burnChipArrivalAnim,
  burstGhostCards,
  ironHarbingerGhostIds,
  canPlan,
  cardDetailDiscovered,
  computeCosts,
  costMode,
  flippingCards,
  getCardFocusProps,
  ghostArtifactMarkerTypesRef,
  handleCancelPlan,
  handleCardTap,
  handleDeckTap,
  hiddenSlots,
  isCameraControlled,
  isLandscapeCockpit,
  isMyTurn,
  isTutorial,
  forgeCompact,
  me,
  newlyMarkedCardIds,
  plannedCardId,
  plannedCardLabel,
  plannedDeckTier,
  refillingSlots,
  revealBlueprintText,
  selectedCard,
  setCostMode,
  setForgeCompact,
  setShowBurnPileOverlay,
  setTracedSourceLumId,
  state,
  strikeAuraMap,
  suppressedBrandTypesByCardId,
  suppressedMarkerIds,
  tutorialAttention,
  tutorialStep,
  tutorialZone,
  viewOrchestrator,
}: BoardForgeProps) {
  const forgePreview =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('forgePreview');

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          THE FORGE
          ═══════════════════════════════════════════════════════ */}
      <div
        data-luminae-tutorial-zone="forge"
        data-forge-section="true"
        data-forge-compact={forgeCompact ? 'true' : undefined}
        data-testid="forge-module"
        data-forge-preview={forgePreview ? 'true' : undefined}
        className={`board-forge board-module board-module--forge relative${forgeCompact ? ' board-forge--compact' : ''}${forgePreview ? ' board-forge--preview' : ''}`}
        style={(tutorialZone === 'forge' || tutorialZone === 'filters') ? {
          boxShadow: tutorialAttention === 'action'
            ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
            : '0 0 0 2px rgba(168,85,247,0.35), 0 0 20px 5px rgba(168,85,247,0.08)',
          transition: 'box-shadow 0.3s',
        } : undefined}
      >
        <div className="board-forge-bg absolute inset-0 pointer-events-none" />
        <div aria-hidden="true" className="board-forge-frame" />
        <ForgeHeader />

        <ForgeCostControls
          burnChipAnim={burnChipAnim}
          burnChipArrivalAnim={burnChipArrivalAnim}
          costMode={costMode}
          forgeCompact={forgeCompact}
          isCameraControlled={isCameraControlled}
          isLandscapeCockpit={isLandscapeCockpit}
          isTutorial={isTutorial}
          setCostMode={setCostMode}
          setForgeCompact={setForgeCompact}
          setShowBurnPileOverlay={setShowBurnPileOverlay}
          state={state}
          tutorialStep={tutorialStep}
          tutorialZone={tutorialZone}
          viewOrchestrator={viewOrchestrator}
        />

        <ForgeTierShelves
          brandDelayMap={brandDelayMap}
          burnChipAnim={burnChipAnim}
          burnChipArrivalAnim={burnChipArrivalAnim}
          burstGhostCards={burstGhostCards}
          ironHarbingerGhostIds={ironHarbingerGhostIds}
          canPlan={canPlan}
          cardDetailDiscovered={cardDetailDiscovered}
          computeCosts={computeCosts}
          costMode={costMode}
          flippingCards={flippingCards}
          getCardFocusProps={getCardFocusProps}
          ghostArtifactMarkerTypesRef={ghostArtifactMarkerTypesRef}
          handleCancelPlan={handleCancelPlan}
          handleCardTap={handleCardTap}
          handleDeckTap={handleDeckTap}
          hiddenSlots={hiddenSlots}
          isCameraControlled={isCameraControlled}
          isLandscapeCockpit={isLandscapeCockpit}
          isMyTurn={isMyTurn}
          isTutorial={isTutorial}
          forgeCompact={forgeCompact}
          me={me}
          newlyMarkedCardIds={newlyMarkedCardIds}
          plannedCardId={plannedCardId}
          plannedCardLabel={plannedCardLabel}
          plannedDeckTier={plannedDeckTier}
          refillingSlots={refillingSlots}
          revealBlueprintText={revealBlueprintText}
          selectedCard={selectedCard}
          setCostMode={setCostMode}
          setForgeCompact={setForgeCompact}
          setShowBurnPileOverlay={setShowBurnPileOverlay}
          setTracedSourceLumId={setTracedSourceLumId}
          state={state}
          strikeAuraMap={strikeAuraMap}
          suppressedBrandTypesByCardId={suppressedBrandTypesByCardId}
          suppressedMarkerIds={suppressedMarkerIds}
          tutorialAttention={tutorialAttention}
          tutorialStep={tutorialStep}
          tutorialZone={tutorialZone}
          viewOrchestrator={viewOrchestrator}
        />
      </div>


    </>
  );
});

function ForgeHeader() {
  return (
    <>
    {/* Zone header */}
    <div className="board-forge-header relative flex items-center justify-between px-4 pt-3 pb-2">
      <div className="board-forge-title flex items-center gap-2.5">
        <Hammer className="h-4 w-4 shrink-0" style={{ color: '#D4A84B', opacity: 0.85 }} />
        <div className="board-forge-title-text flex flex-col leading-none">
          <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(192,140,60,0.55)' }}>The</span>
          <span className="text-[15px] font-black uppercase tracking-[0.08em] leading-none" style={{
            color: '#D4A84B',
            textShadow: '0 0 24px rgba(212,168,75,0.45), 0 1px 0 rgba(0,0,0,0.8)',
            letterSpacing: '0.06em',
          }}>Forge</span>
        </div>
      </div>
      <span aria-hidden="true" className="board-forge-header-spacer min-h-[28px] min-w-[30px] shrink-0" />
    </div>


    </>
  );
}

type ForgeCostControlsProps = Pick<BoardForgeProps,
  'burnChipAnim' | 'burnChipArrivalAnim' | 'costMode' | 'forgeCompact' |
  'isCameraControlled' | 'isLandscapeCockpit' | 'isTutorial' | 'setCostMode' |
  'setForgeCompact' | 'setShowBurnPileOverlay' | 'state' | 'tutorialStep' |
  'tutorialZone' | 'viewOrchestrator'
>;

function ForgeCostControls({
  burnChipAnim,
  burnChipArrivalAnim,
  costMode,
  forgeCompact,
  isCameraControlled,
  isLandscapeCockpit,
  isTutorial,
  setCostMode,
  setForgeCompact,
  setShowBurnPileOverlay,
  state,
  tutorialStep,
  tutorialZone,
  viewOrchestrator,
}: ForgeCostControlsProps) {
  return (
    <>
    {/* ── COST filter strip — above Tier 3 ── */}
    <div
      data-tutorial-zone="filters"
      data-testid="forge-cost-controls"
      className="board-forge-controls relative flex items-center gap-2 px-3 pb-2"
      style={tutorialZone === 'filters' ? {
        boxShadow: '0 0 0 2px rgba(168,85,247,0.65), 0 0 14px 4px rgba(168,85,247,0.22)',
        transition: 'box-shadow 0.3s',
      } : undefined}
    >
      <span className="text-[9px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>Cost View</span>
      <div className="flex items-center bg-secondary/50 rounded-full border border-border/30 p-0.5 gap-0.5">
        {([
          { mode: 'printed' as CostMode, label: 'Full', title: 'Show original printed cost' },
          { mode: 'after_bonuses' as CostMode, label: 'Discounted', title: 'Cost after your permanent bonuses' },
          { mode: 'needed_now' as CostMode, label: 'Needed', title: 'What you still need after bonuses, tokens, and pre-harness selection' },
        ]).map(({ mode, label, title }) => {
          const isTutorialFilterHighlight = isTutorial && tutorialStep === 5 && (mode === 'after_bonuses' || mode === 'needed_now');
          return (
            <button
              key={mode}
              type="button"
              title={title}
              onClick={() => setCostMode(mode)}
              className={`text-[9px] font-semibold px-2 py-0.5 rounded-full transition-all leading-none ${costMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              style={isTutorialFilterHighlight ? {
                boxShadow: '0 0 0 1.5px rgba(168,85,247,0.8), 0 0 8px 2px rgba(168,85,247,0.4)',
                color: costMode === mode ? undefined : 'rgba(200,170,255,0.9)',
                transition: 'box-shadow 0.3s, color 0.3s',
              } : undefined}
            >
              {label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        data-testid="forge-density-toggle"
        onClick={() => {
          if (isCameraControlled || isLandscapeCockpit) return;
          viewOrchestrator.onManualToggle();
          setForgeCompact(value => !value);
        }}
        className={`board-forge-density-toggle flex h-[22px] shrink-0 items-center gap-1 border px-1.5 transition-colors ${forgeCompact ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400/60'} ${isLandscapeCockpit ? 'cursor-default opacity-80' : ''}`}
        title={isLandscapeCockpit ? 'Landscape cockpit uses compact Forge view' : forgeCompact ? 'Switch to full Forge view' : 'Switch to compact view'}
        aria-label={forgeCompact ? 'Switch to full Forge view' : 'Switch to compact Forge view'}
        aria-pressed={forgeCompact}
        aria-disabled={isLandscapeCockpit}
      >
        <LayoutGrid className="h-3 w-3 shrink-0" />
        <span className="text-[9px] font-bold uppercase tracking-wide leading-none">Compact</span>
      </button>
      <span
        className="board-forge-burn-pile-anchor relative ml-auto flex min-h-[22px] min-w-[30px] shrink-0 items-center justify-end"
        data-burn-pile-chip-anchor
      >
        {(state.burnPile ?? []).length > 0 && (
          <motion.span animate={burnChipAnim} style={{ display: 'inline-flex', position: 'relative' }}>
            <motion.span
              animate={burnChipArrivalAnim}
              initial={{ scale: 1, opacity: 0 }}
              style={{
                position: 'absolute',
                inset: -4,
                borderRadius: 6,
                border: '2px solid #ff6600',
                boxShadow: '0 0 10px 3px #ff660099',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setShowBurnPileOverlay(true)}
                  className="flex h-[22px] items-center gap-1 rounded border border-orange-500/25 px-1.5 text-orange-300/75 transition-colors hover:border-orange-400/50 hover:text-orange-300"
                  aria-label={`View ${(state.burnPile ?? []).length} burned Artifact${(state.burnPile ?? []).length === 1 ? '' : 's'}`}
                  data-burn-pile-chip
                >
                  <span className="text-[11px] leading-none">🔥</span>
                  <span className="text-[9px] font-bold tabular-nums leading-none">{(state.burnPile ?? []).length}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-center text-xs">
                Burned Artifacts are removed from The Forge and placed here. They do not return to the Archives unless an effect says otherwise.
              </TooltipContent>
            </Tooltip>
          </motion.span>
        )}
      </span>
    </div>


    </>
  );
}

function ForgeTierShelves({
  brandDelayMap,
  burstGhostCards,
  ironHarbingerGhostIds,
  canPlan,
  cardDetailDiscovered,
  computeCosts,
  costMode,
  flippingCards,
  getCardFocusProps,
  ghostArtifactMarkerTypesRef,
  handleCancelPlan,
  handleCardTap,
  handleDeckTap,
  hiddenSlots,
  isMyTurn,
  isTutorial,
  forgeCompact,
  me,
  newlyMarkedCardIds,
  plannedCardId,
  plannedCardLabel,
  plannedDeckTier,
  refillingSlots,
  revealBlueprintText,
  selectedCard,
  setTracedSourceLumId,
  state,
  strikeAuraMap,
  suppressedBrandTypesByCardId,
  suppressedMarkerIds,
  tutorialStep,
}: BoardForgeProps) {
  const rows = [
    { tier: 3, cards: withPersistentAvatarSeedMolds(state.forgeTier3, 3, state.avatarSeedMoldSlots ?? []), deck: state.deckCounts.tier3, tierIdx: 0 },
    { tier: 2, cards: withPersistentAvatarSeedMolds(state.forgeTier2, 2, state.avatarSeedMoldSlots ?? []), deck: state.deckCounts.tier2, tierIdx: 1 },
    { tier: 1, cards: withPersistentAvatarSeedMolds(state.forgeTier1, 1, state.avatarSeedMoldSlots ?? []), deck: state.deckCounts.tier1, tierIdx: 2 },
  ] as Array<{ tier: 1 | 2 | 3; cards: (ArtifactCard | null)[]; deck: number; tierIdx: number }>;

  return (
    <div
      data-forge-tiers="true"
      data-testid="forge-tier-list"
      className="relative flex flex-col gap-3 px-3 pb-3"
    >
      {rows.map(row => {
        let nextCol = 0;
        const colIndices = row.cards.map((card, index) => {
          const slotKey = row.tier + '-' + index;
          if (burstGhostCards[slotKey] || ironHarbingerGhostIds[slotKey] || hiddenSlots.has(slotKey) || !card) return -1;
          return nextCol++;
        });
        const shelfAccent = row.tier === 3
          ? 'rgba(244, 208, 118, 0.9)'
          : row.tier === 2
            ? 'rgba(205, 159, 84, 0.62)'
            : 'rgba(166, 132, 82, 0.44)';
        const tierRoman = row.tier === 3 ? 'III' : row.tier === 2 ? 'II' : 'I';
        const observedTopCard = row.tier === 1
          ? me?.tideArchiveTopCards?.tier1
          : row.tier === 2
            ? me?.tideArchiveTopCards?.tier2
            : me?.tideArchiveTopCards?.tier3;
        const isDeckPending = plannedDeckTier === row.tier;
        const deckDisabled = !isDeckPending && (row.deck === 0 || !me || (!isMyTurn && !canPlan));
        const deckTitle = isDeckPending
          ? `Cancel ${plannedCardLabel.toLowerCase()}`
          : row.deck === 0
            ? 'Archive empty'
            : observedTopCard
              ? `Inspect ${observedTopCard.name} atop this Archive`
              : 'Encrypt a concealed Artifact';
        const deckPile = (
          <ForgeDeckPile
            deckCount={row.deck}
            deckDisabled={deckDisabled}
            deckTitle={deckTitle}
            inline
            isDeckPending={isDeckPending}
            isObserved={!!observedTopCard}
            pendingLabel={plannedCardLabel}
            forgeCompact={forgeCompact}
            onCancelPlan={handleCancelPlan}
            onDeckTap={() => handleDeckTap(row.tier)}
            tier={row.tier}
          />
        );

        return (
          <div
            key={row.tier}
            data-testid="forge-tier-shelf"
            data-tier={row.tier}
            data-plate-count={row.cards.length}
            className="board-forge-shelf relative rounded-xl"
            style={{ padding: '8px 8px 4px 8px', '--shelf-accent': shelfAccent } as React.CSSProperties}
          >
            <div className="board-forge-tier-header flex items-center gap-2 mb-2 px-0.5">
              <div className="board-forge-tier-mark" aria-label={`Tier ${tierRoman}`}>
                <span className="board-forge-tier-kicker">Tier</span>
                <span className="board-forge-tier-roman">{tierRoman}</span>
              </div>
              <span className="board-forge-tier-separator" aria-hidden="true"> · </span>
              <div className="board-forge-tier-name flex flex-col leading-none shrink-0">
                <span className="board-forge-tier-full-label text-[10px] font-black uppercase tracking-wider" style={{ color: '#D4B46F', letterSpacing: '0.12em', textShadow: '0 1px 6px rgba(192,164,114,0.35)' }}>{TIER_CIVILIZATION[row.tier]}</span>
              </div>
              <div className="shrink-0 flex-1 h-[1.5px] divider-brass" />
              {deckPile}
              <ChevronsRight className="board-forge-scroll-cue" aria-hidden="true" />
            </div>
            <div className="board-forge-shelf-content board-forge-shelf-content--archive-in-header">
              <div className={'board-forge-card-row flex pb-1 no-scrollbar ' + (forgeCompact ? 'flex-wrap gap-2' : 'gap-2.5 overflow-x-auto')}>
                {row.cards.map((c, i) => {
                  const slotKey = row.tier + '-' + i;
                  return (
                    <ForgeCardSlot
                      key={c?.id ?? slotKey}
                      c={c}
                      row={row}
                      slotKey={slotKey}
                      colIdx={colIndices[i]}
                      brandDelayMap={brandDelayMap}
                      burstGhostCards={burstGhostCards}
                      ironHarbingerGhostIds={ironHarbingerGhostIds}
                      cardDetailDiscovered={cardDetailDiscovered}
                      computeCosts={computeCosts}
                      costMode={costMode}
                      flippingCards={flippingCards}
                      getCardFocusProps={getCardFocusProps}
                      ghostArtifactMarkerTypesRef={ghostArtifactMarkerTypesRef}
                      handleCancelPlan={handleCancelPlan}
                      handleCardTap={handleCardTap}
                      hiddenSlots={hiddenSlots}
                      isTutorial={isTutorial}
                      forgeCompact={forgeCompact}
                      newlyMarkedCardIds={newlyMarkedCardIds}
                      plannedCardId={plannedCardId}
                      plannedCardLabel={plannedCardLabel}
                      refillingSlots={refillingSlots}
                      revealBlueprintText={revealBlueprintText}
                      selectedCard={selectedCard}
                      setTracedSourceLumId={setTracedSourceLumId}
                      state={state}
                      strikeAuraMap={strikeAuraMap}
                      suppressedBrandTypesByCardId={suppressedBrandTypesByCardId}
                      suppressedMarkerIds={suppressedMarkerIds}
                      tutorialStep={tutorialStep}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
