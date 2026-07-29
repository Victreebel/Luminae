import React from 'react';
import { AFFINITY_KEYS, AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import backgroundCosmos from '@assets/generated_images/background_cosmos.png';
import type { GamePlayerState, GameState, Luminary, LuminaryActiveState } from '@workspace/api-client-react';
import { LuminaryCard } from './game-luminary';

type LuminaryAffinityState = LuminaryActiveState;

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
  state: GameState;
  tutorialAttention: string | null | undefined;
  tutorialZone: string | null | undefined;
}

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
  state,
  tutorialAttention,
  tutorialZone,
}: BoardTerminusProps) {
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
          {safeLuminaries.map(l => {
            const claimedByPlayer = safePlayers.find(p => (p.claimedLuminaryIds ?? []).includes(l.id)) ?? null;
            const claimedByNames = claimedByPlayer ? [claimedByPlayer.playerName] : [];
            const turnCount: number = state.turnCount;

            // Real server affinity state
            const serverLumAffinity = (state.luminaryAffinities as LuminaryAffinityState[])
              .find((la) => la.luminaryId === l.id) ?? null;
            // isLive: bonus active starting the turn AFTER arrival
            const isLive = !!serverLumAffinity && turnCount > serverLumAffinity.summonedAtTurnCount;

            // Suppress the claimed vortex/portal while an arrival cutscene is active
            // for this luminary. The server marks it claimed immediately (for rules /
            // persistence), but visually the portal must not appear until the shatter
            // animation has fully resolved. isArrivalInProgress covers every entry in
            // the queue (not just the head) so queued-but-not-yet-playing cutscenes
            // are also suppressed. Dev-test entries (isDevTest=true) have no real
            // claimedByPlayer, so they are excluded to keep the dev preview working.
            const isArrivalCutscenePending = arrivalQueue.some(e => e.id === l.id && !e.isDevTest)
              || pendingSuppressArrivalIdsRef.current.has(l.id);
            const isArrivalVisuallyHeld = isArrivalCutscenePending || arrivalVisualHoldIds.includes(l.id);

            // Visible claimed state — cleared during active cutscene/return hold so
            // the shattered source panel cannot briefly reappear before the claimed
            // vortex is ready.
            const visibleClaimedByPlayer = isArrivalVisuallyHeld ? null : claimedByPlayer;
            const visibleClaimedByNames  = isArrivalVisuallyHeld ? []   : claimedByNames;
            const edgeKey = ((serverLumAffinity?.activeAffinity as AffinityKey | undefined)
              ?? (AFFINITY_KEYS.find(k => k !== 'singularity' && (l.requirements[k as AffinityKey] ?? 0) > 0) as AffinityKey | undefined)
              ?? 'singularity') as AffinityKey;
            const edgeMeta = AFFINITY_META[edgeKey];
            const isAwakened = !!visibleClaimedByPlayer;

            return (
              <div
                key={l.id}
                data-testid="terminus-luminary-slot"
                data-luminary-id={l.id}
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
                    data-luminary-id={l.id}
                    aria-label={`${l.name} summoning`}
                  />
                ) : (
                  <LuminaryCard
                    luminary={l}
                    claimedByNames={visibleClaimedByNames}
                    isReleased={claimedThisSession.includes(l.id)}
                    luminaryAffinity={serverLumAffinity}
                    claimedByPlayer={visibleClaimedByPlayer}
                    isLive={isLive}
                    playerBonuses={me?.bonuses}
                    isMyTurn={isMyTurn}
                    onOpenSheet={() => setSelectedLuminary(l)}
                    isArmed={armedLumIds.has(l.id)}
                    isFlashing={flashLumId === l.id}
                    burnCount={l.id === 'lum_bloom' ? (state.burnPile ?? []).length : undefined}
                    costMode={costMode}
                    showActiveAffinity
                    showClaimedIdentity
                    showClaimedPresence={false}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>


    </>
  );
}
