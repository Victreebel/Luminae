import React from 'react';
import { motion } from 'framer-motion';
import { Eye } from 'lucide-react';
import type { ArtifactCard, AffinityCounts } from '@workspace/api-client-react';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { AFFINITIES } from './game-constants';
import { ArtifactCardView, EminenceBadge, AffinityToken, PendingActionOverlay } from './game-card';
import { ForgeMarkerLayer } from './game-board-forge-markers';
import { getArtifactBrandTypes } from '@/lib/artifactBrands';
import type { BoardForgeProps } from './game-board-forge';
import { CARD_ART } from './game-constants';
import { AvatarSeedMoldMark } from '@/components/AvatarSeedSymbol';
import { ArtifactMoldCastingOverlay } from './game-mold-casting';

interface ForgeCardSlotProps extends Pick<BoardForgeProps,
  'brandDelayMap' | 'burstGhostCards' | 'cardDetailDiscovered' | 'computeCosts' | 'costMode' |
  'flippingCards' | 'getCardFocusProps' | 'ghostArtifactMarkerTypesRef' | 'handleCancelPlan' | 'handleCardTap' |
  'hiddenSlots' | 'isTutorial' | 'forgeCompact' | 'newlyMarkedCardIds' | 'plannedCardId' |
  'plannedCardLabel' | 'refillingSlots' | 'revealBlueprintText' | 'selectedCard' |
  'setTracedSourceLumId' | 'state' | 'strikeAuraMap' | 'suppressedBrandTypesByCardId' |
  'suppressedMarkerIds' | 'tutorialStep' | 'ironHarbingerGhostIds'
> {
  c: ArtifactCard | null;
  row: { tier: number; cards: (ArtifactCard | null)[]; deck: number; tierIdx: number };
  slotKey: string;
  colIdx: number;
}

export function CompactForgeCardReadout({
  card,
  costs,
}: {
  card: ArtifactCard;
  costs: Partial<Record<AffinityKey, number>>;
}) {
  const costEntries = AFFINITIES.filter(k => (costs[k as keyof AffinityCounts] ?? 0) > 0);

  return (
    <div className="compact-card-info compact-card-info--priority pointer-events-none absolute inset-0">
      <div className="compact-card-info-top flex items-start justify-between">
        {(card.eminence ?? 0) > 0
          ? <EminenceBadge value={card.eminence ?? 0} compact />
          : <span className="compact-card-eminence-placeholder" />}
        {card.bonusAffinity && (
          <span className="compact-card-bonus rounded" style={{ background: 'rgba(0,0,0,0.82)' }}>
            <AffinityToken color={card.bonusAffinity as AffinityKey} size={16} />
          </span>
        )}
      </div>
      <div className="compact-card-costs">
        {costEntries.length > 0 ? (
          <div className="compact-card-cost-grid">
            {costEntries.map(k => (
              <div
                key={k}
                className="compact-card-cost-chip"
                style={{ background: 'rgba(0,0,0,0.82)' }}
              >
                <AffinityToken color={k as AffinityKey} size={12} />
                <span>{costs[k as keyof AffinityCounts]}</span>
              </div>
            ))}
          </div>
        ) : (
          <span
            className="compact-card-cost-covered"
            style={{ background: 'rgba(0,0,0,0.82)' }}
          >✓</span>
        )}
      </div>
    </div>
  );
}

function getForgeAffinityStyle(card: ArtifactCard): React.CSSProperties {
  const affinity = card.bonusAffinity
    ? AFFINITY_META[card.bonusAffinity as AffinityKey]
    : undefined;

  return {
    '--forge-affinity': affinity?.hex ?? '#93a1a8',
    '--forge-affinity-glow': affinity?.glowHex ?? '#d7e0e4',
  } as React.CSSProperties;
}

function handleArtifactInspectionMove(event: React.PointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse') return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / Math.max(1, rect.width);
  const y = (event.clientY - rect.top) / Math.max(1, rect.height);
  event.currentTarget.style.setProperty('--artifact-inspect-ry', `${(x - 0.5) * 4.2}deg`);
  event.currentTarget.style.setProperty('--artifact-inspect-rx', `${(0.5 - y) * 3.4}deg`);
  event.currentTarget.style.setProperty('--artifact-inspect-x', `${x * 100}%`);
  event.currentTarget.style.setProperty('--artifact-inspect-y', `${y * 100}%`);
}

function resetArtifactInspection(event: React.PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--artifact-inspect-ry', '0deg');
  event.currentTarget.style.setProperty('--artifact-inspect-rx', '0deg');
  event.currentTarget.style.setProperty('--artifact-inspect-x', '50%');
  event.currentTarget.style.setProperty('--artifact-inspect-y', '42%');
}

export function ForgeCardSlot({
  c,
  row,
  slotKey,
  colIdx,
  brandDelayMap,
  burstGhostCards,
  cardDetailDiscovered,
  computeCosts,
  costMode,
  flippingCards,
  getCardFocusProps,
  ghostArtifactMarkerTypesRef,
  ironHarbingerGhostIds,
  handleCancelPlan,
  handleCardTap,
  hiddenSlots,
  isTutorial,
  forgeCompact,
  plannedCardId,
  plannedCardLabel,
  refillingSlots,
  selectedCard,
  state,
  strikeAuraMap,
  suppressedBrandTypesByCardId,
  suppressedMarkerIds,
  tutorialStep,
}: ForgeCardSlotProps) {
  const isHidden = hiddenSlots.has(slotKey);
  const moldCastCue = refillingSlots.get(slotKey);
  const isAvatarSeedMold = state.avatarSeedMoldSlots?.includes(slotKey) ?? false;
  const avatarSeedMoldProps = {
    'data-avatar-seed-mold': isAvatarSeedMold ? 'true' : undefined,
  } as const;
  const compactSlotStyle: React.CSSProperties = {
    width: 'var(--forge-chip-w, 56px)',
    height: 'var(--forge-chip-h, 78px)',
  };

  const ghostCard = burstGhostCards[slotKey] ?? null;
  if (ghostCard) {
    const persistedGhostMarkerTypes = getArtifactBrandTypes(
      state?.artifactMarkers?.[ghostCard.id],
    );
    const ghostMarkerType: string | null =
      state?.artifactMarkers?.[ghostCard.id]?.type ??
      strikeAuraMap.get(ghostCard.id)?.type ??
      ghostArtifactMarkerTypesRef.current.get(ghostCard.id) ??
      null;
    return forgeCompact ? (
      <div
        key={ghostCard.id}
        data-testid="forge-card-slot"
        data-card-id={ghostCard.id}
        data-bonus-affinity={ghostCard.bonusAffinity ?? undefined}
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        className="forge-foundry-mold board-forge-compact-chip relative shrink-0 overflow-hidden rounded-lg"
        style={{ ...compactSlotStyle, ...getForgeAffinityStyle(ghostCard) }}
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark compact />}
        <div
          className="compact-forge-card-stage absolute inset-0 origin-top-left pointer-events-none"
          style={{ transform: 'scale(var(--forge-compact-card-scale, 0.5))', width: 'var(--card-w)', height: 'var(--card-h)' }}
        >
          <ArtifactCardView card={ghostCard} tier={row.tier} />
        </div>
        <ForgeMarkerLayer
          markerType={ghostMarkerType}
          markerTypes={persistedGhostMarkerTypes}
          brandDelay={brandDelayMap.get(ghostCard.id)}
          strikeAura={strikeAuraMap.get(ghostCard.id)}
          suppressed={suppressedMarkerIds.has(ghostCard.id)}
          suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(ghostCard.id) ?? [])]}
          compact
        />
      </div>
    ) : (
      <div
        key={ghostCard.id}
        data-testid="forge-card-slot"
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        className="forge-foundry-mold forge-foundry-slot relative shrink-0"
        style={getForgeAffinityStyle(ghostCard)}
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark />}
        <div data-card-id={ghostCard.id} className="forge-foundry-card relative">
          <ArtifactCardView card={ghostCard} tier={row.tier} />
          <ForgeMarkerLayer
            markerType={ghostMarkerType}
            markerTypes={persistedGhostMarkerTypes}
            brandDelay={brandDelayMap.get(ghostCard.id)}
            strikeAura={strikeAuraMap.get(ghostCard.id)}
            suppressed={suppressedMarkerIds.has(ghostCard.id)}
            suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(ghostCard.id) ?? [])]}
          />
        </div>
      </div>
    );
  }

  const ironHeldCardId = ironHarbingerGhostIds[slotKey];
  if (ironHeldCardId) {
    return (
      <div
        data-testid="forge-card-slot"
        data-card-id={ironHeldCardId}
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        className={`forge-foundry-mold relative shrink-0 overflow-hidden rounded-xl ${
          forgeCompact ? 'board-forge-compact-chip' : 'forge-foundry-slot'
        }`}
        style={forgeCompact ? compactSlotStyle : undefined}
        aria-hidden="true"
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark compact={forgeCompact} />}
        {CARD_ART[ironHeldCardId] ? (
          <img
            src={CARD_ART[ironHeldCardId]}
            alt=""
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-[9px] font-bold text-amber-100/70">
            TIER {row.tier}
          </span>
        )}
        <span
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            border: '1px solid rgba(212,180,111,0.48)',
            boxShadow: 'inset 0 0 12px rgba(249,115,22,0.12)',
          }}
        />
      </div>
    );
  }

  if (isHidden || !c) {
    return (
      <div
        key={c?.id ?? slotKey}
        data-testid="forge-card-slot-empty"
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        data-slot-hidden={isHidden ? 'true' : undefined}
        className={`forge-foundry-mold forge-foundry-mold--empty ${isHidden ? 'forge-foundry-mold--vacated' : ''} ${forgeCompact ? 'board-forge-compact-chip' : 'forge-foundry-slot'} rounded-xl shrink-0`}
        style={forgeCompact ? compactSlotStyle : undefined}
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark compact={forgeCompact} />}
      </div>
    );
  }

  const cardFocusProps = colIdx >= 0
    ? getCardFocusProps(row.tierIdx, colIdx, c.name, c.eminence, row.tier, () => handleCardTap(c, false))
    : null;

  const isFlipping = flippingCards.has(c.id);
  const isPendingPlan = plannedCardId === c.id;
  const neededCosts = computeCosts(c, 'needed_now') ?? c.cost;
  const isAffordable = AFFINITIES.every(k => (neededCosts[k as keyof AffinityCounts] ?? 0) <= 0);
  const cardTapTitle = isPendingPlan ? `Click to cancel ${plannedCardLabel.toLowerCase()}` : c.name;
  if (isFlipping) {
    if (forgeCompact) {
      const cardViewProps = {
        card: c,
        tier: row.tier,
        onTap: () => handleCardTap(c, false),
        tapped: selectedCard?.card.id === c.id,
        effectiveCosts: computeCosts(c, costMode),
        bonusCosts: computeCosts(c, 'after_bonuses') ?? undefined,
      } as const;
      return (
        <div
          key={c.id}
          data-testid="forge-card-slot"
          data-card-id={c.id}
          data-bonus-affinity={c.bonusAffinity ?? undefined}
          data-affordable={isAffordable ? 'true' : undefined}
          data-planned={isPendingPlan ? 'true' : undefined}
          data-slot-key={slotKey}
          {...avatarSeedMoldProps}
          className="forge-foundry-mold board-forge-compact-chip relative shrink-0"
          style={{ ...compactSlotStyle, ...getForgeAffinityStyle(c) }}
          title={cardTapTitle}
          {...(cardFocusProps ?? {})}
        >
          {isAvatarSeedMold && <AvatarSeedMoldMark compact />}
          <div className="absolute inset-0 overflow-hidden rounded-lg">
            <div
              className="compact-forge-card-stage absolute inset-0 origin-top-left"
              style={{ transform: 'scale(var(--forge-compact-card-scale, 0.5))', width: 'var(--card-w)', height: 'var(--card-h)' }}
            >
              <ArtifactCardView {...cardViewProps} />
            </div>
          </div>
          <ForgeMarkerLayer
            markerTypes={getArtifactBrandTypes(state?.artifactMarkers?.[c.id])}
            brandDelay={brandDelayMap.get(c.id)}
            strikeAura={strikeAuraMap.get(c.id)}
            suppressed={suppressedMarkerIds.has(c.id)}
            suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(c.id) ?? [])]}
            compact
          />
          <CompactForgeCardReadout card={c} costs={computeCosts(c, costMode) ?? c.cost} />
          {isPendingPlan && (
            <PendingActionOverlay
              label={plannedCardLabel}
              compact
              onCancel={handleCancelPlan}
            />
          )}
        </div>
      );
    }
    return (
      <div
        key={c.id}
        data-testid="forge-card-slot"
        data-affordable={isAffordable ? 'true' : undefined}
        data-planned={isPendingPlan ? 'true' : undefined}
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        className="forge-foundry-mold forge-foundry-slot relative shrink-0 rounded-xl"
        style={getForgeAffinityStyle(c)}
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark />}
        <div
          data-card-id={c.id}
          className="forge-foundry-card relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          style={{ perspective: '800px' }}
          title={cardTapTitle}
          {...(cardFocusProps ?? {})}
        >
          <motion.div
            initial={{ rotateY: 180, scale: 0.85 }}
            animate={{ rotateY: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformStyle: 'preserve-3d' }}
          >
            <ArtifactCardView
              card={c}
              tier={row.tier}
              onTap={() => handleCardTap(c, false)}
              tapped={selectedCard?.card.id === c.id}
              effectiveCosts={computeCosts(c, costMode)}
              bonusCosts={computeCosts(c, 'after_bonuses') ?? undefined}
              hideStrike={costMode === 'needed_now'}
            />
          </motion.div>
          {isPendingPlan && (
            <PendingActionOverlay
              label={plannedCardLabel}
              onCancel={handleCancelPlan}
            />
          )}
          <ForgeMarkerLayer
            markerTypes={getArtifactBrandTypes(state?.artifactMarkers?.[c.id])}
            brandDelay={brandDelayMap.get(c.id)}
            strikeAura={strikeAuraMap.get(c.id)}
            suppressed={suppressedMarkerIds.has(c.id)}
            suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(c.id) ?? [])]}
          />
        </div>
      </div>
    );
  }

  const showTutorialGlow = isTutorial && (tutorialStep === 6 || tutorialStep === 8) && !selectedCard;

  if (forgeCompact) {
    const effCosts = computeCosts(c, costMode) ?? c.cost;
    const isTapped = selectedCard?.card.id === c.id;
    return (
      <div
        key={c.id}
        data-testid="forge-card-slot"
        data-card-id={c.id}
        data-bonus-affinity={c.bonusAffinity ?? undefined}
        data-affordable={isAffordable ? 'true' : undefined}
        data-planned={isPendingPlan ? 'true' : undefined}
        data-selected={isTapped ? 'true' : undefined}
        data-slot-key={slotKey}
        {...avatarSeedMoldProps}
        className="forge-foundry-mold board-forge-compact-chip relative shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-xl overflow-hidden"
        style={{
          ...compactSlotStyle,
          ...getForgeAffinityStyle(c),
        }}
        onClick={() => handleCardTap(c, false)}
        {...(cardFocusProps ?? {})}
        title={cardTapTitle}
      >
        {isAvatarSeedMold && <AvatarSeedMoldMark compact />}
        <div
          className="compact-forge-card-stage pointer-events-none origin-top-left"
          style={{ transform: 'scale(var(--forge-compact-card-scale, 0.5))', width: 'var(--card-w)', height: 'var(--card-h)' }}
        >
          <ArtifactCardView card={c} tier={row.tier} tapped={false} artOnly />
        </div>
        <ForgeMarkerLayer
          markerTypes={getArtifactBrandTypes(state?.artifactMarkers?.[c.id])}
          brandDelay={brandDelayMap.get(c.id)}
          strikeAura={strikeAuraMap.get(c.id)}
          suppressed={suppressedMarkerIds.has(c.id)}
          suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(c.id) ?? [])]}
          compact
        />
        <CompactForgeCardReadout card={c} costs={effCosts} />
        {moldCastCue && <ArtifactMoldCastingOverlay cue={moldCastCue} compact />}
        {isPendingPlan && (
          <PendingActionOverlay
            label={plannedCardLabel}
            compact
            onCancel={handleCancelPlan}
          />
        )}
        {showTutorialGlow && (
          <div className="pointer-events-none absolute inset-0 rounded-lg animate-pulse"
            style={{ boxShadow: '0 0 0 2px rgba(250,204,21,0.7), 0 0 14px 4px rgba(250,204,21,0.35)' }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      key={c.id}
      data-testid="forge-card-slot"
      data-affordable={isAffordable ? 'true' : undefined}
      data-planned={isPendingPlan ? 'true' : undefined}
      data-slot-key={slotKey}
      {...avatarSeedMoldProps}
      className="forge-foundry-mold forge-foundry-slot relative shrink-0 rounded-xl"
      style={getForgeAffinityStyle(c)}
    >
      {isAvatarSeedMold && <AvatarSeedMoldMark />}
      <div
        data-card-id={c.id}
        data-artifact-inspectable="true"
        className="forge-foundry-card relative rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
        title={cardTapTitle}
        onPointerMove={handleArtifactInspectionMove}
        onPointerLeave={resetArtifactInspection}
        {...(cardFocusProps ?? {})}
      >
        <ArtifactCardView
          card={c}
          tier={row.tier}
          onTap={() => handleCardTap(c, false)}
          tapped={selectedCard?.card.id === c.id}
          effectiveCosts={computeCosts(c, costMode)}
          bonusCosts={computeCosts(c, 'after_bonuses') ?? undefined}
          hideStrike={costMode === 'needed_now'}
        />
        <span className="artifact-inspection-glint" aria-hidden="true" />
        {showTutorialGlow && (
          <div
            className="pointer-events-none absolute inset-0 rounded-xl animate-pulse"
            style={{
              boxShadow: '0 0 0 2px rgba(250,204,21,0.7), 0 0 14px 4px rgba(250,204,21,0.35)',
            }}
          />
        )}
        {isPendingPlan && (
          <PendingActionOverlay
            label={plannedCardLabel}
            onCancel={handleCancelPlan}
          />
        )}
        <ForgeMarkerLayer
          markerTypes={getArtifactBrandTypes(state?.artifactMarkers?.[c.id])}
          brandDelay={brandDelayMap.get(c.id)}
          strikeAura={strikeAuraMap.get(c.id)}
          suppressed={suppressedMarkerIds.has(c.id)}
          suppressedMarkerTypes={[...(suppressedBrandTypesByCardId.get(c.id) ?? [])]}
        />
        {moldCastCue && <ArtifactMoldCastingOverlay cue={moldCastCue} />}
        <div
          className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded border border-white/10 bg-black/78 px-1 py-0.5 transition-opacity duration-500"
          style={{ opacity: cardDetailDiscovered ? 0 : 1 }}
        >
          <Eye className="h-2.5 w-2.5 text-white/70" />
          <span className="text-[7px] font-medium text-white/65 leading-none">details</span>
        </div>
      </div>
    </div>
  );
}
