import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ban, Check, ChevronDown, ChevronUp, Eye, Flag, Hammer, Pencil, SendHorizontal, VolumeX, X } from 'lucide-react';
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
import { CivilizationScenePanel } from '@/components/CivilizationScenePanel';
import { AFFINITIES } from './game-constants';
import { ArtifactCardView, CardBack, EminenceBadge, EminenceDiamond, EminenceProgress, ForgedCardWithTooltip, AffinityToken, PendingActionOverlay } from './game-card';
import { PlayerAvatar } from './game-player';
import { ForgottenHourDescription, type MarkerType } from './game-luminary-effects';
import { ForgeMarkerLayer } from './game-board-forge-markers';
import { getArtifactBrandTypes } from '@/lib/artifactBrands';
import { getLuminaryEminenceTitle } from './game-luminary';
import type { CostMode, SelectedCard } from './game-types';
import {
  type CivilizationProfile,
} from '@/lib/civilizationProfile';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import { getFoundryStoredIds } from './game-planning';

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

export interface HandTabScope {
  activationGateActive: boolean;
  activationQueue: readonly unknown[];
  brandDelayMap: Map<string, number>;
  cardDetailDiscovered: boolean;
  civEditValue: string;
  civLabel: string;
  civilizationProfile: CivilizationProfile;
  civilizationDeploymentSites: readonly CivilizationDeploymentSite[];
  civilizationScanRequested?: boolean;
  computeCosts: (card: ArtifactCard, mode: CostMode) => Partial<Record<AffinityKey, number>> | undefined;
  costMode: CostMode;
  expandedLumEffects: Set<string>;
  forgedView: 'cards' | 'timeline';
  hintsEnabled: boolean;
  handleCancelPlan: () => void | Promise<void>;
  handleCardTap: (card: ArtifactCard, fromReserve: boolean) => void;
  handleFoundryRecovery: (artifactId: string) => void;
  isEditingCivName: boolean;
  isMyTurn: boolean;
  kardashevPalette: AffinityPalette;
  kardashevProgressFraction: number;
  kardashevTier: KardashevTier;
  loreCatalog?: CardLoreCatalog;
  me?: GamePlayerState;
  myReservedCount: number;
  newlyMarkedCardIds: Set<string>;
  openForgedCardSheet: (card: ArtifactCard) => void;
  recentCivilizationSiteIds: readonly string[];
  acknowledgeRecentCivilizationSites: (siteIds: readonly string[]) => void;
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
  handleBlockChatPlayer: (message: ChatMessage) => void;
  handleMuteChatPlayer: (message: ChatMessage) => void;
  handleReportChatPlayer: (message: ChatMessage) => void;
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
    civilizationDeploymentSites,
    civilizationScanRequested = false,
    civilizationProfile,
    computeCosts,
    costMode,
    expandedLumEffects,
    forgedView,
    hintsEnabled,
    handleCancelPlan,
    handleCardTap,
    handleFoundryRecovery,
    isEditingCivName,
    isMyTurn,
    kardashevPalette,
    kardashevProgressFraction,
    kardashevTier,
    loreCatalog,
    me,
    myReservedCount,
    openForgedCardSheet,
    recentCivilizationSiteIds,
    acknowledgeRecentCivilizationSites,
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
  const foundryStoredIds = me ? getFoundryStoredIds(me) : [];
  const foundryStoredIdSet = new Set(foundryStoredIds);
  const ordinaryEncryptedArtifacts = me?.reservedArtifacts.filter(
    (artifact) => !foundryStoredIdSet.has(artifact.id),
  ) ?? [];
  const foundryStoredArtifacts = me?.reservedArtifacts.filter(
    (artifact) => foundryStoredIdSet.has(artifact.id),
  ) ?? [];
  const foundryRecovering = me?.manifestedBlueprintDevices?.some(
    (device) => device.blueprintId === 'bp_mantle_to_orbit_foundry' && device.state === 'recovering',
  ) === true;

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
  const myForgedArtifacts = React.useMemo(() => me?.forgedArtifacts ?? [], [me?.forgedArtifacts]);
  const fallbackMaturityLabel = kardashevTier >= 3
    ? 'Galactic'
    : kardashevTier >= 2
      ? 'Stellar'
      : kardashevTier >= 1
        ? 'Planetary'
        : 'Emergent';
  const maturityLabel = me?.civilization?.scale.historicalMaturity
    ? `${me.civilization.scale.historicalMaturity.charAt(0).toUpperCase()}${me.civilization.scale.historicalMaturity.slice(1)}`
    : fallbackMaturityLabel;
  const reach = me?.civilization?.scale.currentReach;
  const reachCondition = me?.civilization?.scale.currentReachCondition;
  const reachLabel = reach
    ? `${reach.charAt(0).toUpperCase()}${reach.slice(1)}${reachCondition && reachCondition !== 'intact' ? ` / ${reachCondition}` : ''}`
    : 'Unknown';
  const stabilityBand = me?.civilization?.stability.band;
  const stabilityLabel = stabilityBand
    ? `${stabilityBand.charAt(0).toUpperCase()}${stabilityBand.slice(1)}`
    : 'Unrecorded';
  const showReach = reach !== me?.civilization?.scale.historicalMaturity ||
    (reachCondition !== undefined && reachCondition !== 'intact');
  const civilizationTraceCount = civilizationDeploymentSites.length;
  const civilizationEvents = me?.civilization?.events ?? [];
  const recentCivilizationTraceCount = recentCivilizationSiteIds.length;
  const recentCivilizationTrace = civilizationDeploymentSites.find((site) => recentCivilizationSiteIds.includes(site.id));
  const recentCivilizationTraceLabel = recentCivilizationTrace?.title
    ?? (recentCivilizationTraceCount > 0 ? `${recentCivilizationTraceCount} new trace${recentCivilizationTraceCount === 1 ? '' : 's'}` : null);
  const activeCivilizationConditions = React.useMemo(() => [...new Set(
    (me?.civilization?.activeConditions ?? []).flatMap((condition) => (
      condition.coreType ? [condition.coreType] : []
    )),
  )], [me?.civilization?.activeConditions]);

  return (
    <div data-game-hand-tab="true" className="flex flex-col gap-5 p-4 pb-6">
      <CivilizationScenePanel
        tier={kardashevTier}
        palette={kardashevPalette}
        profile={civilizationProfile}
        progressFraction={kardashevProgressFraction}
        paused={
          activationGateActive ||
          activationQueue.length > 0 ||
          (state.status === 'finished' && (pendingGameOver || showCinematic || showWinOverlay))
        }
        defaultScanActive={civilizationScanRequested || recentCivilizationSiteIds.length > 0}
        deploymentSites={civilizationDeploymentSites}
        forgedArtifacts={myForgedArtifacts}
        guidanceEnabled={hintsEnabled}
        stabilityBand={stabilityBand}
        activeConditions={activeCivilizationConditions}
        externalRecentSiteIds={recentCivilizationSiteIds}
        onRecentSiteIdsSeen={acknowledgeRecentCivilizationSites}
        onOpenArtifact={openForgedCardSheet}
      />

      {/* Eminence + name */}
      <section
        className="relative overflow-hidden rounded-[8px] border p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)] sm:p-4"
        data-testid="civilization-command-card"
        data-civilization-recent={recentCivilizationTraceCount > 0 ? 'true' : undefined}
        style={{
          borderColor: recentCivilizationTraceCount > 0
            ? `${kardashevPalette.primary}73`
            : isMyTurn
              ? `${kardashevPalette.primary}66`
              : 'rgba(255,255,255,0.1)',
          background: `linear-gradient(135deg, rgba(5,9,20,0.94), ${kardashevPalette.primary}12 54%, rgba(3,7,17,0.9))`,
          boxShadow: recentCivilizationTraceCount > 0
            ? `inset 0 0 0 1px rgba(255,255,255,0.035), 0 0 28px ${kardashevPalette.primary}1F`
            : isMyTurn
              ? `inset 0 0 0 1px rgba(255,255,255,0.035), 0 0 22px ${kardashevPalette.primary}18`
              : 'inset 0 0 0 1px rgba(255,255,255,0.035)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${kardashevPalette.primary}99, transparent)` }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute inset-y-3 left-0 w-px"
          style={{ background: `linear-gradient(180deg, transparent, ${kardashevPalette.primary}80, transparent)` }}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-primary/58">
              Civilization Record
            </p>
          {isEditingCivName ? (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                className="w-full min-w-0 border-b border-primary/60 bg-transparent text-lg font-semibold text-white placeholder:text-white/30 focus:outline-none"
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
              <span className="truncate border-b border-transparent text-lg font-semibold text-white transition-colors group-hover:border-white/30">
                {civLabel}
              </span>
              <Pencil className="h-3 w-3 shrink-0 text-white/30 group-hover:text-white/60 transition-colors" />
            </button>
          )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {[
                ['Maturity', maturityLabel],
                ...(showReach ? [['Reach', reachLabel] as const] : []),
                ['Stability', stabilityLabel],
                ['Artifacts', myForgedArtifacts.length],
                ['Traces', civilizationTraceCount],
                ['Events', civilizationEvents.length],
              ].map(([label, value]) => (
                <span
                  key={label}
                  className="inline-flex min-h-7 items-center gap-1.5 border border-white/10 bg-white/[0.035] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white/58 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.025)]"
                  data-civilization-record-metric={label}
                >
                  <span className="text-white/34">{label}</span>
                  <span className="text-white/86">{value}</span>
                </span>
              ))}
              {recentCivilizationTraceCount > 0 && (
                <span
                  className="inline-flex min-h-7 items-center gap-1.5 border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
                  style={{
                    borderColor: `${kardashevPalette.primary}73`,
                    background: `${kardashevPalette.primary}1A`,
                    color: kardashevPalette.accent,
                    boxShadow: `0 0 18px ${kardashevPalette.primary}1F`,
                  }}
                >
                  New Trace
                  <span className="text-white/86">{recentCivilizationTraceCount}</span>
                </span>
              )}
            </div>
            {recentCivilizationTraceLabel && (
              <div
                className="mt-3 rounded-[6px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
                data-testid="civilization-command-new-trace"
                aria-live="polite"
                style={{
                  borderColor: `${kardashevPalette.primary}59`,
                  background: `${kardashevPalette.primary}12`,
                  color: kardashevPalette.accent,
                  boxShadow: `0 0 22px ${kardashevPalette.primary}18`,
                }}
              >
                <span className="block text-[8px] font-black text-white/38">Recently registered</span>
                <span className="mt-0.5 block truncate text-white/86">{recentCivilizationTraceLabel}</span>
                <span className="mt-1 block text-[8px] font-black" style={{ color: `${kardashevPalette.accent}BF` }}>
                  Scan view is focusing this change
                </span>
              </div>
            )}
        </div>
          <div className="shrink-0 self-stretch border-t border-white/8 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <EminenceProgress value={me?.eminence ?? 0} target={victoryRequirement} variant="monument" />
          </div>
        </div>
      </section>

      {civilizationEvents.length > 0 && (
        <section className="px-1" aria-labelledby="civilization-events-heading">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2
              id="civilization-events-heading"
              className="text-[10px] font-semibold uppercase text-muted-foreground"
            >
              Recent Consequences
            </h2>
            <span className="text-[9px] font-black uppercase tracking-widest text-white/32">
              Causal Record
            </span>
          </div>
          <ol className="divide-y divide-white/8 border-y border-white/8">
            {civilizationEvents.slice(-3).reverse().map((event) => (
              <li key={event.eventId} className="flex items-start gap-3 py-2.5">
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rotate-45 border border-primary/65 bg-primary/18"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-snug text-white/82">
                    {event.summary}
                  </p>
                  <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/34">
                    {event.sourceType}
                    {event.pressureTags.length > 0 ? ` / ${event.pressureTags.join(' + ')}` : ''}
                    {event.turnCount !== null ? ` / Turn ${event.turnCount}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

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
        safePlayers.some((player) => (player.manifestedBlueprintDevices?.length ?? 0) > 0) ||
        (state.scenarioProtocols?.length ?? 0) > 0
      ) && (
        <div data-blueprint-game-panel="true">
          <React.Suspense
            fallback={<div className="h-24 animate-pulse border border-white/8 bg-white/[0.025]" aria-label="Loading Blueprint systems" />}
          >
            <BlueprintGamePanel
              me={me}
              players={safePlayers}
              scenarioProtocols={state.scenarioProtocols}
              loreCatalog={loreCatalog}
              onOpenArtifact={openForgedCardSheet}
            />
          </React.Suspense>
        </div>
      )}

      {/* Reserved Cards */}
      {ordinaryEncryptedArtifacts.length > 0 && (
        <div data-encrypted-artifacts-group="true">
          <p className="compact-section-label flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
            <span className="compact-section-glyph h-3.5 w-3.5 inline-flex items-center justify-center shrink-0 opacity-75" aria-hidden="true">
              <CipherSigil affinityHex="#e2e8f0" id={9101} />
            </span>
            <span className="compact-label-text">Encrypted</span>
            <span className="compact-section-count">({myReservedCount}/3)</span>
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
	            {ordinaryEncryptedArtifacts.map((c) => {
		              const isPendingPlan = plannedCardId === c.id;
		              const cardTapTitle = isPendingPlan ? `Click to cancel ${plannedCardLabel.toLowerCase()}` : c.name;
	              const lore = loreCatalog?.[c.id];
	              const loreTag = lore?.artifactForm?.split('/')?.[0]?.trim() ?? lore?.civLane?.split('/')?.[0]?.trim();
	              return (
	                <div key={c.id} data-reserved-card-id={c.id} className="relative shrink-0 flex flex-col items-center gap-1" style={{ maxWidth: 90 }} title={cardTapTitle}>
                  <div className="relative">
                    <ArtifactCardView
                      card={c}
                      tier={c.tier}
                      onTap={() => handleCardTap(c, true)}
                      tapped={selectedCard?.card.id === c.id}
                      effectiveCosts={computeCosts(c, costMode)}
                      hideStrike={costMode === 'needed_now'}
                    />
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

      {foundryStoredArtifacts.length > 0 && (
        <div data-foundry-components-group="true">
          <p className="compact-section-label mb-2 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-amber-200/75">
            <span className="compact-section-glyph inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-80" aria-hidden="true">
              <CipherSigil affinityHex="#f6c66b" id={9102} />
            </span>
            <span className="compact-label-text">Foundry Components</span>
            <span className="compact-section-count">({foundryStoredArtifacts.length})</span>
          </p>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {foundryStoredArtifacts.map((card) => {
              const lore = loreCatalog?.[card.id];
              const loreTag = lore?.artifactForm?.split('/')?.[0]?.trim() ?? lore?.civLane?.split('/')?.[0]?.trim();
              return (
                <div
                  key={card.id}
                  data-foundry-component-id={card.id}
                  className="relative flex shrink-0 flex-col items-center gap-1"
                  style={{ maxWidth: 90 }}
                >
                  <div className="relative">
                    <ArtifactCardView
                      card={card}
                      tier={card.tier}
                      onTap={() => handleCardTap(card, true)}
                      tapped={selectedCard?.card.id === card.id}
                      effectiveCosts={computeCosts(card, costMode)}
                      hideStrike={costMode === 'needed_now'}
                    />
                    <span className="pointer-events-none absolute left-1 top-1 border border-amber-200/35 bg-black/82 px-1 py-0.5 text-[7px] font-black uppercase text-amber-100">
                      Foundry
                    </span>
                  </div>
                  {foundryRecovering ? (
                    <button
                      type="button"
                      disabled={!isMyTurn}
                      onClick={() => handleFoundryRecovery(card.id)}
                      className="flex min-h-7 w-full items-center justify-center gap-1 border border-amber-200/30 bg-amber-950/25 px-1.5 text-[8px] font-black uppercase text-amber-100 enabled:hover:bg-amber-300/15 disabled:opacity-45"
                    >
                      <Hammer className="h-3 w-3" aria-hidden="true" /> Recover
                    </button>
                  ) : (
                    <span className="text-center text-[8px] font-semibold uppercase text-white/45">Paid re-Forge</span>
                  )}
                  {loreTag && (
                    <p className="w-full truncate text-center text-[8px] font-semibold uppercase tracking-wider text-amber-200/45">
                      {loreTag}
                    </p>
                  )}
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
                    <div key={c.id} className="flex items-center gap-2.5 py-2 cursor-pointer rounded hover:bg-white/5 px-1 -mx-1 transition-colors" onClick={() => openForgedCardSheet(c)}>
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
                    </div>
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
    handleBlockChatPlayer,
    handleMuteChatPlayer,
    handleReportChatPlayer,
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
                    {!isMe && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button" onClick={() => handleMuteChatPlayer(msg)} className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground" title="Mute player" aria-label={`Mute ${msg.playerName}`}><VolumeX className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleBlockChatPlayer(msg)} className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-foreground" title="Block player" aria-label={`Block ${msg.playerName}`}><Ban className="h-3.5 w-3.5" /></button>
                        <button type="button" onClick={() => handleReportChatPlayer(msg)} className="grid h-7 w-7 place-items-center text-muted-foreground hover:text-destructive" title="Report message" aria-label={`Report ${msg.playerName}`}><Flag className="h-3.5 w-3.5" /></button>
                      </div>
                    )}
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
