import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown, ChevronUp, Eye, Hammer, Pencil, SendHorizontal, X } from 'lucide-react';
import type {
  AffinityCounts,
  ArtifactCard,
  CardLoreCatalog,
  GamePlayerState,
  GameState,
  LuminaryActiveState,
} from '@workspace/api-client-react';
import { CipherSigil } from '@/components/CipherApertureAnimation';
import { AffinityReservoirSymbol } from '@/components/AffinityReservoirSymbol';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { getDefaultCivName, getSavedAvatarId } from '@/lib/avatars';
import { getDominantAffinityPalette, type AffinityPalette, type KardashevTier } from '@/lib/kardashev';
import { getLuminaryVisuals, LuminaryPanelArt } from '@/lib/luminaryAssets';
import type { ChatMessage } from '@/hooks/use-game-websocket';
import { KardashevScene } from '@/components/KardashevScene';
import { AFFINITIES } from './game-constants';
import { ArtifactCardView, CardBack, EminenceBadge, EminenceDiamond, EminenceProgress, ForgedCardWithTooltip, AffinityToken, PendingActionOverlay } from './game-card';
import { PlayerAvatar } from './game-player';
import { ForgottenHourDescription, type MarkerType } from './game-luminary-effects';
import { ForgeMarkerLayer } from './game-board-forge-markers';
import { getArtifactBrandTypes } from '@/lib/artifactBrands';
import { getLuminaryEminenceTitle } from './game-luminary';
import type { CostMode, SelectedCard } from './game-types';
import {
  CIVILIZATION_TRAIT_LABELS,
  type CivilizationProfile,
} from '@/lib/civilizationProfile';

const BlueprintGamePanel = React.lazy(async () => {
  const module = await import('@/components/blueprints/BlueprintGamePanel');
  return { default: module.BlueprintGamePanel };
});

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface GameTabSession {
  playerId: string;
  avatarId?: string;
}

interface OpponentSummary {
  totalAffinity: number;
  cardCount: number;
  reservedCount: number;
  civPalette: AffinityPalette;
  civName: string;
}

export function OpponentStatStrip({
  totalAffinity,
  cardCount,
  reservedCount,
  sigilId,
}: {
  totalAffinity: number;
  cardCount: number;
  reservedCount: number;
  sigilId: number;
}) {
  const stats = [
    {
      key: 'affinity',
      label: 'Affinities',
      value: totalAffinity,
      hex: '#7aa2ff',
      glow: '#a8c5ff',
      symbol: <AffinityReservoirSymbol compact />,
    },
    {
      key: 'artifact',
      label: 'Artifacts',
      value: cardCount,
      hex: '#ffc43d',
      glow: '#ffe28a',
      symbol: <Hammer className="h-3.5 w-3.5" />,
    },
    {
      key: 'encrypted',
      label: 'Encrypted Artifacts',
      value: reservedCount,
      hex: '#E8E4FF',
      glow: '#C8C0FF',
      symbol: <CipherSigil affinityHex="#e2e8f0" id={sigilId} />,
    },
  ] as const;

  return (
    <div className="opponent-stat-strip flex items-center gap-2 shrink-0">
      {stats.map(({ key, label, value, hex, glow, symbol }) => {
        const has = value > 0;
        return (
          <div
            key={key}
            className="opponent-stat-chip flex items-center gap-0.5 shrink-0"
            title={`${value} ${label}`}
            aria-label={`${value} ${label}`}
          >
            <span
              className="opponent-stat-value text-sm font-black leading-none"
              style={{ color: has ? hex : `${hex}55`, textShadow: has ? `0 0 8px ${glow}` : 'none' }}
            >
              {value}
            </span>
            <span
              className="opponent-stat-symbol inline-flex items-center justify-center h-3.5 w-3.5 shrink-0 leading-none"
              style={{ color: has ? glow : `${hex}55`, opacity: has ? 1 : 0.55 }}
              aria-hidden="true"
            >
              {symbol}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function CivilizationSignatureStrip({
  profile,
  forgedArtifacts,
  onOpenArtifact,
}: {
  profile: CivilizationProfile;
  forgedArtifacts: readonly ArtifactCard[];
  onOpenArtifact: (card: ArtifactCard) => void;
}) {
  if (profile.landmarks.length === 0) return null;

  return (
    <section className="space-y-2" aria-label="Civilization infrastructure">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold uppercase text-muted-foreground">
          Artifact infrastructure
        </span>
        <span className="text-[10px] tabular-nums text-muted-foreground/70">
          {profile.dominantTraits.length} signatures
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {profile.landmarks.slice(0, 6).map((landmark) => {
          const card = forgedArtifacts.find(({ id }) => id === landmark.artifactId);
          const affinity = AFFINITY_META[landmark.affinity];
          return (
            <button
              key={landmark.artifactId}
              type="button"
              disabled={!card}
              onClick={() => {
                if (card) onOpenArtifact(card);
              }}
              className="min-w-0 border border-white/8 bg-white/[0.025] px-2 py-1.5 text-left transition-colors hover:border-white/18 hover:bg-white/[0.055] disabled:pointer-events-none"
              title={`${landmark.artifactName} · ${CIVILIZATION_TRAIT_LABELS[landmark.trait]}`}
              aria-label={`Inspect ${landmark.artifactName}, ${CIVILIZATION_TRAIT_LABELS[landmark.trait]}`}
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: affinity.hex,
                    boxShadow: `0 0 7px ${affinity.glowHex}`,
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-semibold text-foreground/90">
                    {CIVILIZATION_TRAIT_LABELS[landmark.trait]}
                  </span>
                  <span className="block truncate text-[9px] text-muted-foreground">
                    {landmark.artifactName}
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export interface HandTabScope {
  activationGateActive: boolean;
  activationQueue: readonly unknown[];
  brandDelayMap: Map<string, number>;
  cardDetailDiscovered: boolean;
  civEditValue: string;
  civLabel: string;
  civilizationProfile: CivilizationProfile;
  computeCosts: (card: ArtifactCard, mode: CostMode) => Partial<Record<AffinityKey, number>> | undefined;
  costMode: CostMode;
  expandedLumEffects: Set<string>;
  forgedView: 'cards' | 'timeline';
  handleCancelPlan: () => void | Promise<void>;
  handleCardTap: (card: ArtifactCard, fromReserve: boolean) => void;
  executeBlueprintAction: (payload: { type: 'recover_foundry_component'; cardId: string }) => void;
  isEditingCivName: boolean;
  isMyTurn: boolean;
  isMyTurnForCoreAction: boolean;
  kardashevPalette: AffinityPalette;
  kardashevProgressFraction: number;
  kardashevTier: KardashevTier;
  loreCatalog?: CardLoreCatalog;
  me?: GamePlayerState;
  myReservedCount: number;
  newlyMarkedCardIds: Set<string>;
  openForgedCardSheet: (card: ArtifactCard) => void;
  pendingGameOver: boolean;
  plannedCardId: string | null;
  plannedCardLabel: string;
  safePlayers: GamePlayerState[];
  selectedCard: SelectedCard | null;
  session: GameTabSession;
  setCivEditValue: SetState<string>;
  setCivLabel: SetState<string>;
  setExpandedLumEffects: SetState<Set<string>>;
  setForgedView: SetState<'cards' | 'timeline'>;
  setIsEditingCivName: SetState<boolean>;
  setShowActiveLuminaries: SetState<boolean>;
  setShowForgedArtifacts: SetState<boolean>;
  setTracedSourceLumId: SetState<string | null>;
  showActiveLuminaries: boolean;
  showCinematic: boolean;
  showForgedArtifacts: boolean;
  showWinOverlay: boolean;
  state: GameState;
  strikeAuraMap: Map<string, { type: MarkerType; delay: number }>;
  suppressedMarkerIds: Set<string>;
  victoryRequirement: number;
}

export interface LogTabScope {
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  chatInput: string;
  chatMessages: ChatMessage[];
  expandedOpponents: Set<string>;
  handleSendChat: (event?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => void;
  openForgedCardSheet: (card: ArtifactCard) => void;
  opponentData: Record<string, OpponentSummary>;
  session: GameTabSession;
  setChatInput: SetState<string>;
  setExpandedOpponents: SetState<Set<string>>;
  setShowAllLog: SetState<boolean>;
  showAllLog: boolean;
  state: GameState;
}

export function HandTab({ scope }: { scope: HandTabScope }) {
  const {
    activationGateActive,
    activationQueue,
    brandDelayMap,
    cardDetailDiscovered,
    civEditValue,
    civLabel,
    civilizationProfile,
    computeCosts,
    costMode,
    expandedLumEffects,
    forgedView,
    handleCancelPlan,
    handleCardTap,
    executeBlueprintAction,
    isEditingCivName,
    isMyTurn,
    isMyTurnForCoreAction,
    kardashevPalette,
    kardashevProgressFraction,
    kardashevTier,
    loreCatalog,
    me,
    myReservedCount,
    openForgedCardSheet,
    pendingGameOver,
    plannedCardId,
    plannedCardLabel,
    safePlayers,
    selectedCard,
    session,
    setCivEditValue,
    setCivLabel,
    setExpandedLumEffects,
    setForgedView,
    setIsEditingCivName,
    setShowActiveLuminaries,
    setShowForgedArtifacts,
    showActiveLuminaries,
    showCinematic,
    showForgedArtifacts,
    showWinOverlay,
    state,
    strikeAuraMap,
    suppressedMarkerIds,
    victoryRequirement,
  } = scope;

  const luminaryAllianceBonuses: Partial<Record<AffinityKey, number>> = {};
  for (const alliance of state.luminaryAffinities ?? []) {
    if (
      alliance.ownerId !== session.playerId ||
      state.turnCount <= alliance.summonedAtTurnCount
    ) continue;
    const affinity = alliance.activeAffinity as AffinityKey;
    luminaryAllianceBonuses[affinity] = (luminaryAllianceBonuses[affinity] ?? 0) + 1;
  }
  const permanentAffinityEntries = AFFINITIES
    .filter((affinity) => affinity !== 'singularity')
    .map((affinity) => {
      const artifactBonus = me?.bonuses[affinity as keyof AffinityCounts] ?? 0;
      const allianceBonus = luminaryAllianceBonuses[affinity as AffinityKey] ?? 0;
      return {
        affinity: affinity as AffinityKey,
        allianceBonus,
        total: artifactBonus + allianceBonus,
      };
    })
    .filter(({ total }) => total > 0);

  return (
    <div className="flex flex-col gap-5 p-4 pb-6">
      {/* Kardashev Observatory Scene */}
      <KardashevScene
        tier={kardashevTier}
        palette={kardashevPalette}
        profile={civilizationProfile}
        progressFraction={kardashevProgressFraction}
        paused={
          activationGateActive ||
          activationQueue.length > 0 ||
          (state.status === 'finished' && (pendingGameOver || showCinematic || showWinOverlay))
        }
      />
      <CivilizationSignatureStrip
        profile={civilizationProfile}
        forgedArtifacts={me?.forgedArtifacts ?? []}
        onOpenArtifact={openForgedCardSheet}
      />

      {/* Eminence + name */}
      <div className={`rounded-2xl border p-4 bg-card/90 flex items-center justify-between ${isMyTurn ? 'border-primary/60 shadow-[0_0_20px_rgba(var(--primary),0.2)]' : 'border-border'}`}>
        <div className="flex-1 min-w-0 mr-3">
          {isEditingCivName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className="bg-transparent border-b border-primary/60 text-base font-bold text-white focus:outline-none w-full min-w-0 placeholder:text-white/30"
                value={civEditValue}
                onChange={(e) => setCivEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const trimmed = civEditValue.trim();
                    setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                    setIsEditingCivName(false);
                  } else if (e.key === 'Escape') {
                    setIsEditingCivName(false);
                  }
                }}
                onBlur={() => {
                  const trimmed = civEditValue.trim();
                  setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                  setIsEditingCivName(false);
                }}
                maxLength={48}
              />
              <button
                className="shrink-0 text-primary/80 hover:text-primary transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const trimmed = civEditValue.trim();
                  setCivLabel(trimmed || getDefaultCivName(getSavedAvatarId(), me?.playerName));
                  setIsEditingCivName(false);
                }}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingCivName(false);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              className="group flex items-center gap-1.5 text-left w-full min-w-0"
              onClick={() => {
                setCivEditValue(civLabel);
                setIsEditingCivName(true);
              }}
              title="Rename your civilization"
            >
              <span className="text-base font-bold text-white truncate border-b border-transparent group-hover:border-white/30 transition-colors">
                {civLabel}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          )}
        </div>
        <EminenceProgress value={me?.eminence ?? 0} target={victoryRequirement} variant="monument" />
      </div>

      {/* Civilization-wide permanent Affinity ledger */}
      <section className="px-1" aria-labelledby="permanent-affinities-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2
            id="permanent-affinities-heading"
            className="text-[10px] font-semibold uppercase text-muted-foreground"
          >
            Permanent Affinities
          </h2>
          {permanentAffinityEntries.some(({ allianceBonus }) => allianceBonus > 0) && (
            <span className="text-[9px] text-yellow-400/65">✦ allied Luminary</span>
          )}
        </div>
        {permanentAffinityEntries.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {permanentAffinityEntries.map(({ affinity, allianceBonus, total }) => (
              <div
                key={affinity}
                className="flex min-h-7 items-center gap-1 border border-white/10 bg-black/35 px-2 py-1"
                title={allianceBonus > 0
                  ? `${total} permanent ${AFFINITY_META[affinity].name}, including ${allianceBonus} from allied Luminaries`
                  : `${total} permanent ${AFFINITY_META[affinity].name}`}
              >
                <AffinityToken color={affinity} size={13} />
                <span className="text-xs font-bold tabular-nums text-white">×{total}</span>
                {allianceBonus > 0 && (
                  <span className="text-[9px] text-yellow-400/80" aria-label={`${allianceBonus} from allied Luminaries`}>
                    ✦{allianceBonus}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs italic text-muted-foreground">No permanent Affinities yet.</p>
        )}
      </section>

      {(
        (me?.blueprintPrivateStates?.length ?? 0) > 0 ||
        safePlayers.some((player) => (
          player.manifestedBlueprintProjects?.length ??
          player.manifestedBlueprintDevices?.length ??
          0
        ) > 0) ||
        (state.scenarioProtocols?.length ?? 0) > 0
      ) && (
        <React.Suspense
          fallback={<div className="h-24 animate-pulse border border-white/8 bg-white/[0.025]" aria-label="Loading Blueprint systems" />}
        >
          <BlueprintGamePanel
            me={me}
            players={safePlayers}
            scenarioProtocols={state.scenarioProtocols ?? []}
            loreCatalog={loreCatalog}
            onOpenArtifact={openForgedCardSheet}
            canUseCoreAction={isMyTurnForCoreAction}
            onRecoverFoundryComponent={(cardId) => executeBlueprintAction({
              type: 'recover_foundry_component',
              cardId,
            })}
          />
        </React.Suspense>
      )}

      {/* Reserved Cards */}
      {myReservedCount > 0 && (
        <div>
          <p className="compact-section-label flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            <span className="compact-section-glyph h-3.5 w-3.5 inline-flex items-center justify-center shrink-0 opacity-75" aria-hidden="true">
              <CipherSigil affinityHex="#e2e8f0" id={9101} />
            </span>
            <span className="compact-label-text">Encrypted</span>
            <span className="compact-section-count">({myReservedCount}/3)</span>
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
	            {me?.reservedArtifacts.map((c) => {
		              const isPendingPlan = plannedCardId === c.id;
		              const cardTapTitle = isPendingPlan ? `Click to cancel ${plannedCardLabel.toLowerCase()}` : c.name;
	              const lore = loreCatalog?.[c.id];
	              const loreTag = lore?.artifactForm?.split('/')?.[0]?.trim() ?? lore?.civLane?.split('/')?.[0]?.trim();
	              return (
	                <div key={c.id} data-reserved-card-id={c.id} className="relative shrink-0 flex flex-col items-center gap-1" style={{ maxWidth: 90 }} title={cardTapTitle}>
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Open encrypted Artifact ${c.name}`}
                      className="block rounded-xl border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
                      onClick={() => handleCardTap(c, true)}
                    >
                      <ArtifactCardView
                        card={c}
                        tier={c.tier}
                        tapped={selectedCard?.card.id === c.id}
                        effectiveCosts={computeCosts(c, costMode)}
                        hideStrike={costMode === 'needed_now'}
                      />
                    </button>
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
                    />
                    <div
                      className="pointer-events-none absolute bottom-1 right-1 flex items-center gap-0.5 rounded border border-white/10 bg-black/78 px-1 py-0.5 transition-opacity duration-500"
                      style={{ opacity: cardDetailDiscovered ? 0 : 1 }}
                    >
                      <Eye className="h-2.5 w-2.5 text-white/70" />
                      <span className="text-[7px] font-medium text-white/65 leading-none">details</span>
                    </div>
                  </div>
                  <div className="w-full px-0.5">
                    {c.flavor && (
                      <p className="text-[9px] text-muted-foreground italic leading-snug line-clamp-2 text-center">
                        &ldquo;{c.flavor}&rdquo;
                      </p>
                    )}
                    {loreTag && (
                      <p className="text-[8px] font-semibold uppercase tracking-wider text-primary/50 text-center mt-0.5 truncate">
                        {loreTag}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Forged Cards */}
      <div className="rounded-2xl border border-border/50 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowForgedArtifacts(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 text-sm font-semibold"
        >
          <span className="compact-section-label flex items-center gap-2 min-w-0">
            <Hammer className="compact-section-glyph h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="compact-label-text truncate">Forged Artifacts</span>
            <span className="compact-section-count shrink-0">({me?.forgedArtifacts?.length ?? 0})</span>
          </span>
          {showForgedArtifacts ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        {showForgedArtifacts && (
          <div className="p-3">
            {/* Cards / Timeline toggle */}
            {(me?.forgedArtifacts?.length ?? 0) > 0 && (
              <div className="flex gap-1 mb-3">
                <button
                  type="button"
                  onClick={() => setForgedView('cards')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'cards' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setForgedView('timeline')}
                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-colors ${forgedView === 'timeline' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Timeline
                </button>
              </div>
            )}
            {(me?.forgedArtifacts?.length ?? 0) === 0 ? (
              <p className="text-xs text-muted-foreground italic">No Artifacts forged yet.</p>
            ) : forgedView === 'cards' ? (
              <div className="flex flex-wrap gap-2">
                {(me?.forgedArtifacts ?? []).map((c) => (
                  <ForgedCardWithTooltip key={c.id} card={c} tier={c.tier} onOpenSheet={() => openForgedCardSheet(c)} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-border/30">
                {(me?.forgedArtifacts ?? []).map((c, idx) => {
                  const snap = c.bonusesAtForge;
                  const snapKeys = snap
                    ? AFFINITIES.filter(k => k !== 'singularity' && (snap[k as keyof AffinityCounts] ?? 0) > 0)
                    : [];
                  const bonusMeta = AFFINITY_META[c.bonusAffinity as AffinityKey];
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded px-1 py-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
                      onClick={() => openForgedCardSheet(c)}
                      aria-label={`View forged Artifact ${c.name}`}
                    >
                      <span className="text-[10px] text-muted-foreground w-4 text-right shrink-0 tabular-nums">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{c.name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {snapKeys.length > 0 ? snapKeys.map(k => (
                            <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1 py-0.5">
                              <AffinityToken color={k as AffinityKey} size={9} />
                              <span className="text-[9px] font-bold text-white">×{snap![k as keyof AffinityCounts]}</span>
                            </div>
                          )) : (
                            <span className="text-[9px] text-muted-foreground italic">no snapshot</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-0.5 rounded-full px-1.5 py-0.5" style={{ background: (bonusMeta?.hex ?? '#888') + '22', border: `1px solid ${(bonusMeta?.hex ?? '#888')}44` }}>
                        <AffinityToken color={c.bonusAffinity as AffinityKey} size={9} />
                        <span className="text-[9px] font-semibold" style={{ color: bonusMeta?.glowHex ?? '#fff' }}>+1</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Luminaries in Play */}
      {(state.luminaries?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowActiveLuminaries(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-secondary/40 text-sm font-semibold"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">✦</span>
              Luminaries in Play ({state.luminaries.length})
            </span>
            {showActiveLuminaries ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showActiveLuminaries && (
            <div className="p-3 flex flex-col gap-2">
              {state.luminaries.map((lum) => {
                const claimedByPlayer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(lum.id)) ?? null;
                const claimedByMe = claimedByPlayer?.playerId === session?.playerId;
                const vis = getLuminaryVisuals(lum.id);
                const accentColor = lum.summonColor ?? vis.primaryColor;
                const reqEntries = AFFINITIES.filter(c => (lum.requirements[c as keyof AffinityCounts] ?? 0) > 0);
                const hasEffect = Boolean(lum.effectName || lum.effectDescription);
                const isExpanded = expandedLumEffects.has(lum.id);
                return (
                  <div
                    key={lum.id}
                    className="overflow-hidden rounded-xl"
                    style={{
                      background: claimedByMe
                        ? `${accentColor}18`
                        : claimedByPlayer
                          ? 'rgba(255,255,255,0.04)'
                          : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${claimedByMe ? accentColor + '44' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left"
                      aria-expanded={hasEffect ? isExpanded : undefined}
                      aria-label={hasEffect ? `${isExpanded ? 'Hide' : 'Show'} ${lum.name} effect` : lum.name}
                      disabled={!hasEffect}
                      onClick={() => {
                        if (!hasEffect) return;
                        setExpandedLumEffects((previous) => {
                          const next = new Set(previous);
                          if (next.has(lum.id)) next.delete(lum.id);
                          else next.add(lum.id);
                          return next;
                        });
                      }}
                    >
                      <div className="shrink-0 overflow-hidden rounded-md">
                        <LuminaryPanelArt luminaryId={lum.id} width={32} height={32} claimed={!!claimedByPlayer} runtime />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-semibold leading-tight" style={{ color: claimedByMe ? accentColor : 'rgba(255,255,255,0.85)' }}>
                          {lum.name}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] leading-none text-muted-foreground">{lum.domain}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {claimedByMe ? (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                            style={{ background: accentColor + '33', color: accentColor, border: `1px solid ${accentColor}66` }}
                          >
                            Allied
                          </span>
                        ) : claimedByPlayer ? (
                          <span className="max-w-[72px] truncate text-[9px] text-muted-foreground">
                            {claimedByPlayer.playerName}
                          </span>
                        ) : (
                          <div className="flex max-w-[120px] flex-wrap items-center justify-end gap-0.5">
                            {reqEntries.map((c) => {
                              const needed = lum.requirements[c as keyof AffinityCounts] ?? 0;
                              const have = me?.bonuses?.[c as keyof AffinityCounts] ?? 0;
                              const met = have >= needed;
                              const meta = AFFINITY_META[c as AffinityKey];
                              return (
                                <div
                                  key={c}
                                  className="flex items-center gap-0.5 rounded px-1 py-0.5"
                                  style={{
                                    background: met ? `${meta.glowHex}22` : 'rgba(0,0,0,0.35)',
                                    border: `1px solid ${met ? meta.glowHex + '66' : 'rgba(255,255,255,0.12)'}`,
                                    opacity: met ? 0.7 : 1,
                                  }}
                                  title={met ? `${meta.name} requirement met (${have}/${needed})` : `Need ${needed - have} more ${meta.name} (${have}/${needed})`}
                                >
                                  <AffinityToken color={c as AffinityKey} size={8} />
                                  <span
                                    className="text-[8px] font-bold leading-none tabular-nums"
                                    style={{ color: met ? meta.glowHex : 'rgba(255,255,255,0.75)' }}
                                  >
                                    {met ? '✓' : `${have}/${needed}`}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <EminenceBadge
                          value={lum.eminence ?? 0}
                          compact
                          className="ml-1 shrink-0"
                          title={getLuminaryEminenceTitle(lum.eminence ?? 0)}
                        />
                        {hasEffect && (
                          isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                            : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                        )}
                      </div>
                    </button>
                    {isExpanded && hasEffect && (
                      <div
                        className="border-t px-3 py-2"
                        style={{ borderColor: `${accentColor}2f`, background: `${accentColor}0a` }}
                      >
                        {lum.effectName && (
                          <p className="mb-1 text-[9px] font-semibold uppercase leading-none" style={{ color: accentColor }}>
                            {lum.effectName}
                          </p>
                        )}
                        {lum.id === 'lum_compass' ? (
                          <ForgottenHourDescription
                            revealBlueprintText={Boolean(me?.forgedArtifacts?.length)}
                            className="text-[10px] leading-relaxed text-white/70"
                          />
                        ) : lum.effectDescription ? (
                          <p className="text-[10px] leading-relaxed text-white/70">{lum.effectDescription}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LogTab({ scope }: { scope: LogTabScope }) {
  const {
    chatEndRef,
    chatInput,
    chatMessages,
    expandedOpponents,
    handleSendChat,
    openForgedCardSheet,
    opponentData,
    session,
    setChatInput,
    setExpandedOpponents,
    setShowAllLog,
    showAllLog,
    state,
  } = scope;

  return (
    <div className="flex flex-col gap-4 p-4 pb-6">
      {/* Opponents */}
      {state.players.filter(p => p.playerId !== session?.playerId).length > 0 && (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">Opponents</p>
        <div className="flex flex-col gap-2">
          {state.players.map((p, i) => {
            if (p.playerId === session?.playerId) return null;
            const isCurrent = state.status === 'playing' && state.currentPlayerIndex === i;
            const oppD = opponentData[p.playerId];
            const totalAffinity = oppD?.totalAffinity ?? 0;
            const cardCount = oppD?.cardCount ?? 0;
            const reservedCount = oppD?.reservedCount ?? 0;
            const isExpanded = expandedOpponents.has(p.playerId);
            const logOppCivPalette = oppD?.civPalette ?? getDominantAffinityPalette(p.forgedArtifacts);
            const logOppCivName = oppD?.civName ?? p.civName ?? p.playerName;
            const toggleExpanded = () => {
              setExpandedOpponents((prev) => {
                const next = new Set(prev);
                if (next.has(p.playerId)) next.delete(p.playerId);
                else next.add(p.playerId);
                return next;
              });
            };
            return (
              <div
                key={p.playerId}
                className={`rounded-2xl border p-3 bg-card/85 transition-[border-color,box-shadow] ${isCurrent ? 'border-primary/50 shadow-[0_0_12px_rgba(99,102,241,0.2)]' : 'border-border/40'}`}
              >
                {/* Header: identity + inline stats + Eminence */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <PlayerAvatar avatarId={p.avatarId ?? null} name={p.playerName} size={22} />
                    {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shrink-0" />}
                    <span className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold truncate">{p.playerName}</span>
                      <span className="text-[10px] font-normal tracking-wide truncate" style={{ color: logOppCivPalette.primary, opacity: 0.8 }}>{logOppCivName}</span>
                    </span>
                    {isCurrent && <span className="text-[10px] font-bold text-primary bg-primary/15 px-1.5 py-0.5 rounded-full shrink-0">their turn</span>}
                  </div>
                  {/* Inline stat chips */}
                  <OpponentStatStrip
                    totalAffinity={totalAffinity}
                    cardCount={cardCount}
                    reservedCount={reservedCount}
                    sigilId={9200 + i}
                  />
                  {/* View/Hide toggle */}
                  <button
                    type="button"
                    onClick={toggleExpanded}
                    className="flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-md border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-[10px] font-semibold text-primary"
                  >
                    {isExpanded ? (
                      <><ChevronUp className="h-2.5 w-2.5" />Hide</>
                    ) : (
                      <><Eye className="h-2.5 w-2.5" />View</>
                    )}
                  </button>
                  <div className="flex items-center gap-1 shrink-0 font-serif font-black text-lg text-white leading-none">
                    <span>{p.eminence}</span>
                    <EminenceDiamond size={12} />
                  </div>
                </div>

                {/* Expanded detail */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-2 flex flex-col gap-3">
                        {/* Per-Affinity holdings grid. */}
                        <div className="opponent-affinity-grid grid grid-cols-6 gap-1.5">
                          {AFFINITIES.map((c) => {
                            const n = p.affinities[c as keyof AffinityCounts] ?? 0;
                            const bonus = p.bonuses[c as keyof AffinityCounts] ?? 0;
                            const lumBonus = state.luminaryAffinities
                              .filter((la: LuminaryActiveState) =>
                                la.ownerId === p.playerId &&
                                state.turnCount > la.summonedAtTurnCount &&
                                la.activeAffinity === c
                              ).length;
                            const meta = AFFINITY_META[c as AffinityKey];
                            const isSingularity = c === 'singularity';
                            const hasContent = isSingularity ? (n > 0 || reservedCount > 0) : (n > 0 || bonus > 0 || lumBonus > 0);
                            return (
                              <div
                                key={c}
                                className="opponent-affinity-cell"
                                data-has-content={hasContent}
                                data-affinity={c}
                                style={{
                                  '--opponent-affinity-color': meta.hex,
                                  '--opponent-affinity-glow': meta.glowHex,
                                } as React.CSSProperties}
                              >
                                <div
                                  className="opponent-affinity-cell__header"
                                  title={meta.name}
                                  aria-label={meta.name}
                                >
                                  <AffinityToken color={c as AffinityKey} size={14} />
                                </div>
                                <span className="opponent-affinity-cell__count">
                                  {n}
                                </span>
                                {!isSingularity && (bonus > 0 || lumBonus > 0) && (
                                  <div className="opponent-affinity-cell__modifiers">
                                    {bonus > 0 && (
                                      <span className="opponent-affinity-cell__bonus">+{bonus} bonus</span>
                                    )}
                                    {lumBonus > 0 && (
                                      <span className="opponent-affinity-cell__luminary">+{lumBonus}✦</span>
                                    )}
                                  </div>
                                )}
                                {isSingularity && reservedCount > 0 && (
                                  <span className="opponent-affinity-cell__encrypted">{reservedCount} encrypted</span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Reserved card backs — section always mounted when expanded so
                            AnimatePresence can complete child exit animations even when
                            the last reserved card is forged (count drops to 0). */}
                        <div className="flex items-center gap-2">
                          {reservedCount > 0 && (
                            <span className="compact-section-label flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                              <span className="compact-section-glyph h-3 w-3 inline-flex items-center justify-center shrink-0 opacity-75" aria-hidden="true">
                                <CipherSigil affinityHex="#e2e8f0" id={9300 + i} />
                              </span>
                              <span className="compact-label-text">Encrypted</span>
                              <span className="compact-label-punctuation">:</span>
                            </span>
                          )}
                          <div className="flex gap-1 items-center">
                            <AnimatePresence initial={false}>
                              {p.reservedArtifacts.map((card) => (
                                <motion.div
                                  key={card.id}
                                  data-reserved-card-id={card.id}
                                  initial={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.55, transition: { duration: 0.26, ease: 'easeIn' } }}
                                  style={{ transformOrigin: 'center center' }}
                                >
                                  <CardBack size="sm" tier={card.tier as 1 | 2 | 3} />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                        </div>

                        {/* Forged artifacts */}
                        {p.forgedArtifacts.length > 0 ? (
                          <div>
                            <p className="compact-section-label flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                              <Hammer className="compact-section-glyph h-3 w-3 shrink-0" aria-hidden="true" />
                              <span className="compact-label-text">Forged</span>
                              <span className="compact-section-count">({p.forgedArtifacts.length})</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {p.forgedArtifacts.map((c) => (
                                <ForgedCardWithTooltip key={c.id} card={c} tier={c.tier} onOpenSheet={() => openForgedCardSheet(c)} />
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {/* Action Log */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent Actions</p>
          {(state.actionLog ?? []).length > 12 && (
            <button
              onClick={() => setShowAllLog((v) => !v)}
              className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 hover:text-primary transition-colors"
            >
              {showAllLog ? 'Show less' : `Show all ${(state.actionLog ?? []).length}`}
            </button>
          )}
        </div>
        <div
          className={`rounded-2xl border border-border/50 bg-card/85 divide-y divide-border/30 ${showAllLog ? 'max-h-[420px] overflow-y-auto' : ''}`}
        >
          {(state.actionLog ?? []).length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground italic text-center">No actions yet.</div>
          ) : (
            (() => {
              const AFFINITY_DOT_COLOR: Record<string, string> = {
                Flare: '#FF5A3C',
                Continuum: '#3D6BFF',
                Verdance: '#2ECC71',
                Abyss: '#9C27B0',
                Radiance: '#DFC878',
              };
              return [...(state.actionLog ?? [])].reverse().slice(0, showAllLog ? undefined : 12).map((entry, i) => {
              const isMe = entry.playerId === session.playerId;
              const logPlayer = state.players.find((pl) => pl.playerId === entry.playerId);
              const isAffinityChange = entry.summary.startsWith('switched ');
	              const isCancelled =
	                entry.summary.startsWith('pending action cleared') ||
	                entry.summary.startsWith('planned move cleared') ||
	                entry.summary.startsWith('planned move voided');
              const isBurned = /\bBurned\b/i.test(entry.summary);
              const affinityLabel = isAffinityChange ? (entry.summary.split(' to ').pop() ?? '') : '';
              const dotColor = AFFINITY_DOT_COLOR[affinityLabel] ?? '#888';
              return (
              <div
                key={i}
                className="flex items-start gap-2.5 px-3 py-2.5"
                style={
                  isCancelled
                    ? { background: 'rgba(234,179,8,0.07)' }
                    : isAffinityChange
                    ? { background: `${dotColor}0D` }
                    : undefined
                }
              >
                <PlayerAvatar
                  avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                  name={entry.playerName}
                  size={22}
                />
                <div className="text-xs leading-relaxed flex-1">
                  <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{entry.playerName}</span>
                  {isCancelled ? (
                    <>
	                      <span className="text-yellow-400/80 italic"> · Pending action cleared</span>
                      <span
                        className="inline-flex items-center justify-center ml-1.5 align-middle"
	                        title={entry.summary
	                          .replace('pending action cleared — ', '')
	                          .replace('planned move cleared — ', '')
	                          .replace('planned move voided — ', '')}
                        style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.4)', flexShrink: 0 }}
                      >
                        <span style={{ fontSize: 9, lineHeight: 1, color: '#EAB308' }}>!</span>
                      </span>
                    </>
                  ) : isAffinityChange ? (
                    <>
                      <span className="text-foreground/70 italic"> · {entry.summary}</span>
                      <span
                        className="inline-flex items-center gap-1 ml-1.5 align-middle"
                        title={affinityLabel}
                      >
                        <span
                          className="inline-block rounded-full border border-white/20"
                          style={{ width: 7, height: 7, background: dotColor, boxShadow: `0 0 4px ${dotColor}99` }}
                        />
                        <span style={{ color: dotColor, fontSize: 10, lineHeight: 1 }}>↻</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-foreground/80"> · {entry.summary}</span>
                      {isBurned && (
                        <span
                          className="inline-flex items-center gap-0.5 ml-1.5 align-middle"
                          title="Burned"
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.28)', borderRadius: 4, padding: '0 4px', fontSize: 9, lineHeight: '14px', color: '#F87171', verticalAlign: 'middle' }}
                        >
                          🔥 Burned
                        </span>
                      )}
                    </>
                  )}
                  <span className="ml-1 text-[10px] text-muted-foreground/40">R{entry.turn}</span>
                </div>
              </div>
              );
            });
            })()
          )}
        </div>
      </div>

      {/* ── Chat ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">Chat</p>
        <div className="rounded-2xl border border-border/50 bg-card/85 overflow-hidden mb-2">
          <div className="max-h-[180px] overflow-y-auto flex flex-col divide-y divide-border/20">
            {chatMessages.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground/60 italic text-center">No messages yet.</div>
            ) : (
              chatMessages.map((msg, i) => {
                const isMe = msg.playerId === session.playerId;
                const logPlayer = state.players.find((pl) => pl.playerId === msg.playerId);
                return (
                  <div key={i} className="flex items-start gap-2 px-3 py-2">
                    <PlayerAvatar
                      avatarId={logPlayer?.avatarId ?? (isMe ? session.avatarId : null)}
                      name={msg.playerName}
                      size={22}
                    />
                    <div className="text-xs leading-relaxed flex-1 min-w-0">
                      <span className={`font-semibold ${isMe ? 'text-primary' : 'text-foreground'}`}>{msg.playerName}</span>
                      <span className="text-foreground/80 ml-1 break-words">{msg.text}</span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
        <div
          className="flex gap-2 items-center"
          data-chat-composer=""
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <input
            className="flex-1 bg-card/80 border border-border/50 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 min-w-0"
            placeholder="Send a message…"
            value={chatInput}
            maxLength={200}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendChat(e);
              }
            }}
          />
          <button
            type="button"
            aria-label="Send message"
            onClick={(e) => handleSendChat(e)}
            disabled={!chatInput.trim()}
            className="shrink-0 w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary disabled:opacity-30 transition-opacity"
          >
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
