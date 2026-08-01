import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AFFINITY_KEYS, AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import type {
  AffinityCounts,
  GamePlayerState,
  Luminary,
  LuminaryActiveState,
} from '@workspace/api-client-react';
import { LuminaryCard } from './game-luminary';

export interface BoardTerminusProps {
  armedLumIds: Set<string>;
  arrivalQueue: Array<{ id: string; isDevTest?: boolean }>;
  arrivalVisualHoldIds: string[];
  claimedThisSession: string[];
  costMode: 'printed' | 'after_bonuses' | 'needed_now';
  flashLumId: string | null;
  isMyTurn: boolean;
  me: GamePlayerState | null | undefined;
  pendingSuppressArrivalIdsRef: React.MutableRefObject<Set<string>>;
  safeLuminaries: Luminary[];
  safePlayers: GamePlayerState[];
  setSelectedLuminary: React.Dispatch<React.SetStateAction<Luminary | null>>;
  turnCount: number;
  luminaryAffinities: LuminaryActiveState[];
  burnPileCount: number;
  suspendIdleMotion: boolean;
  tutorialAttention: string | null | undefined;
  tutorialZone: string | null | undefined;
}

interface TerminusLuminarySlotProps {
  luminary: Luminary;
  claimedByPlayer: GamePlayerState | null;
  luminaryAffinity: LuminaryActiveState | null;
  isLive: boolean;
  isClaimedThisSession: boolean;
  isArrivalVisuallyHeld: boolean;
  costMode: BoardTerminusProps['costMode'];
  playerBonuses?: Partial<AffinityCounts>;
  isMyTurn: boolean;
  isArmed: boolean;
  isFlashing: boolean;
  burnCount?: number;
  suspendIdleMotion: boolean;
  onSelect: React.Dispatch<React.SetStateAction<Luminary | null>>;
}

function useLuminarySlotVisibility() {
  const ref = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => typeof document === 'undefined' || !document.hidden,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const root = node.closest('[data-luminary-scroll]');
    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry?.isIntersecting ?? true),
      {
        root,
        rootMargin: '0px 24px',
        threshold: 0.02,
      },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setIsDocumentVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  return {
    ref,
    isRuntimeVisible: isIntersecting && isDocumentVisible,
  };
}

function sameStringList(a: readonly string[] | undefined, b: readonly string[] | undefined) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function samePlayerIdentity(a: GamePlayerState | null, b: GamePlayerState | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.playerId === b.playerId
    && a.playerName === b.playerName
    && a.avatarId === b.avatarId;
}

function sameAffinityState(a: LuminaryActiveState | null, b: LuminaryActiveState | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.luminaryId === b.luminaryId
    && a.activeAffinity === b.activeAffinity
    && sameStringList(a.eligibleAffinities, b.eligibleAffinities);
}

function sameBonuses(
  a: Partial<AffinityCounts> | undefined,
  b: Partial<AffinityCounts> | undefined,
) {
  if (a === b) return true;
  return AFFINITY_KEYS.every(key => (a?.[key] ?? 0) === (b?.[key] ?? 0));
}

function sameLuminary(a: Luminary, b: Luminary) {
  return a === b || (
    a.id === b.id
    && a.name === b.name
    && a.domain === b.domain
    && a.flavor === b.flavor
    && a.eminence === b.eminence
    && AFFINITY_KEYS.every(key => (a.requirements[key] ?? 0) === (b.requirements[key] ?? 0))
  );
}

const TerminusLuminarySlot = React.memo(function TerminusLuminarySlot({
  luminary,
  claimedByPlayer,
  luminaryAffinity,
  isLive,
  isClaimedThisSession,
  isArrivalVisuallyHeld,
  costMode,
  playerBonuses,
  isMyTurn,
  isArmed,
  isFlashing,
  burnCount,
  suspendIdleMotion,
  onSelect,
}: TerminusLuminarySlotProps) {
  const { ref, isRuntimeVisible } = useLuminarySlotVisibility();
  const claimedByNames = claimedByPlayer ? [claimedByPlayer.playerName] : [];
  const edgeKey = ((luminaryAffinity?.activeAffinity as AffinityKey | undefined)
    ?? (AFFINITY_KEYS.find(key => (
      key !== 'singularity' && (luminary.requirements[key] ?? 0) > 0
    )) as AffinityKey | undefined)
    ?? 'singularity') as AffinityKey;
  const edgeMeta = AFFINITY_META[edgeKey];
  const isAwakened = !!claimedByPlayer;
  const idleMotionActive = isAwakened && isRuntimeVisible && !suspendIdleMotion;

  return (
    <div
      ref={ref}
      data-testid="terminus-luminary-slot"
      data-luminary-id={luminary.id}
      data-runtime-visible={isRuntimeVisible ? 'true' : 'false'}
      className={`board-terminus-card-stage ${isArrivalVisuallyHeld ? 'board-terminus-card-stage--summoning' : isAwakened ? 'board-terminus-card-stage--awakened' : 'board-terminus-card-stage--dormant'}`}
      data-state-label={isArrivalVisuallyHeld ? 'Summoning' : isAwakened ? 'Breakthrough' : 'Dormant'}
      style={{
        '--terminus-affinity': edgeMeta.glowHex,
        '--terminus-affinity-core': edgeMeta.hex,
      } as React.CSSProperties}
    >
      {isArrivalVisuallyHeld ? (
        <div
          className="board-terminus-summoning-slot"
          data-luminary-id={luminary.id}
          aria-label={`${luminary.name} summoning`}
        />
      ) : (
        <LuminaryCard
          luminary={luminary}
          claimedByNames={claimedByNames}
          isReleased={isClaimedThisSession}
          luminaryAffinity={luminaryAffinity}
          claimedByPlayer={claimedByPlayer}
          isLive={isLive}
          playerBonuses={playerBonuses}
          isMyTurn={isMyTurn}
          onOpenSheet={() => onSelect(luminary)}
          isArmed={isArmed}
          isFlashing={isFlashing}
          burnCount={burnCount}
          costMode={costMode}
          showActiveAffinity
          showClaimedIdentity
          showClaimedPresence={false}
          idleMotionActive={idleMotionActive}
        />
      )}
    </div>
  );
}, (previous, next) => {
  const bothClaimed = !!previous.claimedByPlayer && !!next.claimedByPlayer;
  return sameLuminary(previous.luminary, next.luminary)
    && samePlayerIdentity(previous.claimedByPlayer, next.claimedByPlayer)
    && sameAffinityState(previous.luminaryAffinity, next.luminaryAffinity)
    && previous.isLive === next.isLive
    && previous.isClaimedThisSession === next.isClaimedThisSession
    && previous.isArrivalVisuallyHeld === next.isArrivalVisuallyHeld
    && (bothClaimed || previous.costMode === next.costMode)
    && (bothClaimed || sameBonuses(previous.playerBonuses, next.playerBonuses))
    && (bothClaimed || previous.isMyTurn === next.isMyTurn)
    && previous.isArmed === next.isArmed
    && previous.isFlashing === next.isFlashing
    && previous.burnCount === next.burnCount
    && previous.suspendIdleMotion === next.suspendIdleMotion
    && previous.onSelect === next.onSelect;
});

export function BoardTerminus({
  armedLumIds,
  arrivalQueue,
  arrivalVisualHoldIds,
  claimedThisSession,
  costMode,
  flashLumId,
  isMyTurn,
  me,
  pendingSuppressArrivalIdsRef,
  safeLuminaries,
  safePlayers,
  setSelectedLuminary,
  turnCount,
  luminaryAffinities,
  burnPileCount,
  suspendIdleMotion,
  tutorialAttention,
  tutorialZone,
}: BoardTerminusProps) {
  const claimedByLuminaryId = useMemo(() => {
    const claimed = new Map<string, GamePlayerState>();
    for (const player of safePlayers) {
      for (const luminaryId of player.claimedLuminaryIds ?? []) {
        claimed.set(luminaryId, player);
      }
    }
    return claimed;
  }, [safePlayers]);

  const affinityByLuminaryId = useMemo(
    () => new Map(luminaryAffinities.map(affinity => [affinity.luminaryId, affinity])),
    [luminaryAffinities],
  );

  const arrivalPendingIds = useMemo(
    () => new Set(
      arrivalQueue
        .filter(event => !event.isDevTest)
        .map(event => event.id),
    ),
    [arrivalQueue],
  );

  const arrivalHeldIds = useMemo(
    () => new Set(arrivalVisualHoldIds),
    [arrivalVisualHoldIds],
  );

  return (
    <>
      {/* ═══════════════════════════════════════════════════════
          THE TERMINUS
          ═══════════════════════════════════════════════════════ */}
      <div
        data-tutorial-zone="luminaries"
        data-testid="terminus-module"
        data-luminary-count={safeLuminaries.length}
        className="board-terminus board-module board-module--terminus relative"
        style={tutorialZone === 'luminaries' ? {
          boxShadow: tutorialAttention === 'action'
            ? '0 0 0 2px rgba(168,85,247,0.78), 0 0 38px 12px rgba(168,85,247,0.22)'
            : '0 0 0 2px rgba(168,85,247,0.5), 0 0 24px 6px rgba(168,85,247,0.12)',
          transition: 'box-shadow 0.3s',
        } : undefined}
      >
        <div
          aria-hidden="true"
          className="board-terminus-space"
          style={{
            '--terminus-starfield-image': `url(${backgroundCosmos})`,
          } as React.CSSProperties}
        />
        <div aria-hidden="true" className="board-terminus-edge" />
        <div aria-hidden="true" className="board-terminus-threshold" />
        <div aria-hidden="true" className="board-terminus-stars absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(18)].map((_, i) => (
            <div key={i} className="absolute rounded-full bg-white"
              style={{
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
                left: `${(i * 37 + 11) % 97}%`,
                top: `${(i * 53 + 7) % 88}%`,
                opacity: 0.3 + (i % 5) * 0.14,
              }}
            />
          ))}
        </div>
        {/* Zone header */}
        <div className="board-terminus-header relative flex items-center gap-3 px-4 pt-3 pb-1.5">
          <div className="board-terminus-rail board-terminus-rail--left" />
          <div className="board-terminus-title flex items-center gap-2.5">
            <svg width="10" height="18" viewBox="0 0 10 18" fill="none" className="shrink-0" style={{ color: '#C4AAFF', opacity: 0.85 }}>
              <polygon points="5,0 1.5,4.5 8.5,4.5" fill="currentColor" />
              <polygon points="1.5,4.5 2.2,15.5 7.8,15.5 8.5,4.5" fill="currentColor" />
              <rect x="0.5" y="15.5" width="9" height="2" rx="0.5" fill="currentColor" />
            </svg>
            <div className="flex flex-col leading-none">
              <span className="text-[8px] font-bold uppercase tracking-[0.22em]" style={{ color: 'rgba(160,130,255,0.55)' }}>The</span>
              <span className="text-[15px] font-black uppercase tracking-[0.08em] leading-none" style={{
                color: '#C4AAFF',
                textShadow: '0 0 24px rgba(180,140,255,0.5), 0 1px 0 rgba(0,0,0,0.8)',
                letterSpacing: '0.06em',
              }}>Terminus</span>
              <span className="board-terminus-subtitle">Edge of the observable universe</span>
            </div>
          </div>
          <div className="board-terminus-rail board-terminus-rail--right" />
        </div>
        <div data-luminary-scroll data-testid="terminus-luminary-row" className="board-terminus-cards relative overflow-x-auto no-scrollbar">
          {safeLuminaries.map(luminary => {
            const claimedByPlayer = claimedByLuminaryId.get(luminary.id) ?? null;
            const luminaryAffinity = affinityByLuminaryId.get(luminary.id) ?? null;
            const isArrivalVisuallyHeld = arrivalPendingIds.has(luminary.id)
              || pendingSuppressArrivalIdsRef.current.has(luminary.id)
              || arrivalHeldIds.has(luminary.id);
            const visibleClaimedByPlayer = isArrivalVisuallyHeld ? null : claimedByPlayer;
            const isLive = !!luminaryAffinity
              && turnCount > luminaryAffinity.summonedAtTurnCount;

            return (
              <TerminusLuminarySlot
                key={luminary.id}
                luminary={luminary}
                claimedByPlayer={visibleClaimedByPlayer}
                luminaryAffinity={luminaryAffinity}
                isLive={isLive}
                isClaimedThisSession={claimedThisSession.includes(luminary.id)}
                isArrivalVisuallyHeld={isArrivalVisuallyHeld}
                costMode={costMode}
                playerBonuses={me?.bonuses}
                isMyTurn={isMyTurn}
                isArmed={armedLumIds.has(luminary.id)}
                isFlashing={flashLumId === luminary.id}
                burnCount={luminary.id === 'lum_bloom' ? burnPileCount : undefined}
                suspendIdleMotion={suspendIdleMotion}
                onSelect={setSelectedLuminary}
              />
            );
          })}
        </div>
      </div>


    </>
  );
}
