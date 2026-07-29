import React from 'react';
import { LUMII_BEAT_COUNT } from '@/components/LumiiTutorial';
import { BoardTerminus } from './game-board-terminus';
import { BoardForge } from './game-board-forge';
import { PlannedActionBanner } from './game-planned-action-banner';

export interface BoardTabMainScope {
  armedLumIds: any;
  arrivalQueue: any;
  arrivalVisualHoldIds: any;
  brandDelayMap: any;
  burnChipAnim: any;
  burnChipArrivalAnim: any;
  burstGhostCards: any;
  canPlan: any;
  cardDetailDiscovered: any;
  claimedThisSession: any;
  computeCosts: any;
  costMode: any;
  flashLumId: any;
  flippingCards: any;
  getCardFocusProps: any;
  ghostArtifactMarkerTypesRef: any;
  handleCancelPlan: any;
  handleCardTap: any;
  handleDeckTap: any;
  hiddenSlots: any;
  isCameraControlled: any;
  isLandscapeCockpit: any;
  isMyTurn: any;
  isTutorial: any;
  forgeCompact: any;
  me: any;
  myPlannedAction: any;
  newlyMarkedCardIds: any;
  pendingSuppressArrivalIdsRef: any;
  plannedCardId: any;
  plannedCardLabel: any;
  plannedDeckTier: any;
  refillingSlots: any;
  safeLuminaries: any;
  safePlayers: any;
  selectedCard: any;
  setCostMode: any;
  setForgeCompact: any;
  setSelectedLuminary: any;
  setShowBurnPileOverlay: any;
  setTracedSourceLumId: any;
  state: any;
  strikeAuraMap: any;
  suppressedBrandTypesByCardId: any;
  suppressedMarkerIds: any;
  tutorialAttention: any;
  tutorialStep: any;
  tutorialZone: any;
  viewOrchestrator: any;
}

export function BoardTabMain({ scope }: { scope: BoardTabMainScope }) {
  const {
    armedLumIds,
    arrivalQueue,
    arrivalVisualHoldIds,
    brandDelayMap,
    burnChipAnim,
    burnChipArrivalAnim,
    burstGhostCards,
    canPlan,
    cardDetailDiscovered,
    claimedThisSession,
    computeCosts,
    costMode,
    flashLumId,
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
    myPlannedAction,
    newlyMarkedCardIds,
    pendingSuppressArrivalIdsRef,
    plannedCardId,
    plannedCardLabel,
    plannedDeckTier,
    refillingSlots,
    safeLuminaries,
    safePlayers,
    selectedCard,
    setCostMode,
    setForgeCompact,
    setSelectedLuminary,
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
  } = scope;
    return (
    <div
      className="board-tab-main board-cockpit board-reliquary flex flex-col gap-0 pb-6"
      style={isTutorial && tutorialStep >= 0 && tutorialStep < LUMII_BEAT_COUNT
        ? { paddingBottom: 'var(--tutorial-panel-height, 0px)' }
        : undefined}
    >

      <PlannedActionBanner
        plannedAction={myPlannedAction}
        state={state}
        player={me}
        onCancelPlan={handleCancelPlan}
      />

      <BoardTerminus
        armedLumIds={armedLumIds}
        arrivalQueue={arrivalQueue}
        arrivalVisualHoldIds={arrivalVisualHoldIds}
        claimedThisSession={claimedThisSession}
        costMode={costMode}
        flashLumId={flashLumId}
        isMyTurn={isMyTurn}
        me={me}
        pendingSuppressArrivalIdsRef={pendingSuppressArrivalIdsRef}
        safeLuminaries={safeLuminaries}
        safePlayers={safePlayers}
        setSelectedLuminary={setSelectedLuminary}
        state={state}
        tutorialAttention={tutorialAttention}
        tutorialZone={tutorialZone}
      />

      <BoardForge
        brandDelayMap={brandDelayMap}
        burnChipAnim={burnChipAnim}
        burnChipArrivalAnim={burnChipArrivalAnim}
        burstGhostCards={burstGhostCards}
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
        revealBlueprintText={Boolean(me?.forgedArtifacts?.length)}
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

      {/* Anchor for the tutorial's Affinity Well zone. */}
      <div
        data-luminae-tutorial-zone="well"
        className="h-0 overflow-hidden pointer-events-none"
        style={{
          boxShadow: tutorialZone === 'well'
            ? tutorialAttention === 'action'
              ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
              : '0 0 0 2px rgba(168,85,247,0.5), 0 0 24px 6px rgba(168,85,247,0.12)'
            : 'none',
          transition: 'box-shadow 0.3s',
        }}
      />
    </div>
  );
}
