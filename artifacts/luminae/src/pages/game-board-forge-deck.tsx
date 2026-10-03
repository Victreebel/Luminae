import React, { useLayoutEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { ARCHIVE_CAPACITY_BY_TIER, useArchivePresentation } from '@/lib/archivePresentation';
import { PendingActionOverlay } from './game-card';
import { TIER_CIVILIZATION } from './game-constants';
import './game-board-forge-deck.css';

interface ArchiveDraw {
  key: number;
  amount: number;
}

function getArchiveMetrics(tier: 1 | 2 | 3, remaining?: number) {
  const capacity = ARCHIVE_CAPACITY_BY_TIER[tier];
  const safeRemaining = remaining == null
    ? capacity
    : Math.min(Math.max(remaining, 0), capacity);
  const ratio = safeRemaining / capacity;
  const state = safeRemaining === 0
    ? 'empty'
    : ratio <= 0.25
      ? 'critical'
      : ratio <= 0.5
        ? 'low'
        : 'stable';

  return {
    capacity,
    fill: `${ratio * 100}%`,
    state,
  };
}

export function ArchiveVessel({
  tier,
  remaining,
  draw,
  className = '',
}: {
  tier: 1 | 2 | 3;
  remaining?: number;
  draw?: ArchiveDraw;
  className?: string;
}) {
  const presentation = useArchivePresentation();
  const roman = tier === 3 ? 'III' : tier === 2 ? 'II' : 'I';
  const archive = getArchiveMetrics(tier, remaining);
  const archiveStyle = {
    '--archive-fill': archive.fill,
    '--archive-depleted-fill': `${Math.min(draw?.amount ?? 0, archive.capacity) / archive.capacity * 100}%`,
  } as React.CSSProperties;

  return (
    <div
      className={`archive-vessel archive-vessel--tier-${tier} ${className}`}
      data-archive-capacity={archive.capacity}
      data-archive-presentation={presentation}
      data-archive-state={archive.state}
      data-archive-remaining={remaining}
      style={archiveStyle}
      aria-hidden="true"
    >
      {presentation === 'cards' ? (
        <span className="archive-vessel__card-stack">
          <span className="archive-vessel__card-shadow archive-vessel__card-shadow--back" />
          <span className="archive-vessel__card-shadow archive-vessel__card-shadow--middle" />
          <span className="archive-vessel__card-face">
            {tier === 3 ? <CardBackTier3 /> : tier === 2 ? <CardBackTier2 /> : <CardBackTier1 />}
          </span>
        </span>
      ) : (
        <>
          <span className="archive-vessel__halo" />
          <span className="archive-vessel__crystal">
            <span className="archive-vessel__charge" />
            {draw && (
              <span key={draw.key} className="archive-vessel__release" />
            )}
            <span className="archive-vessel__facet" />
            <span className="archive-vessel__ticks" />
          </span>
          <span className="archive-vessel__tier">{roman}</span>
        </>
      )}
    </div>
  );
}

export interface ForgeDeckPileProps {
  deckCount: number;
  /** Cards drawn by the engine whose Forge transfer has not reached its reveal beat. */
  pendingDrawCount?: number;
  deckDisabled: boolean;
  deckTitle: string;
  isDeckPending: boolean;
  isObserved?: boolean;
  pendingLabel?: string;
  forgeCompact: boolean;
  onCancelPlan: () => void | Promise<void>;
  onDeckTap: () => void;
  tier: 1 | 2 | 3;
}

export function ForgeDeckPile({
  deckCount,
  pendingDrawCount = 0,
  deckDisabled,
  deckTitle,
  isDeckPending,
  isObserved = false,
  pendingLabel = 'Encrypt pending',
  forgeCompact,
  onCancelPlan,
  onDeckTap,
  tier,
}: ForgeDeckPileProps) {
  const [display, setDisplay] = useState({ count: Math.max(0, deckCount), draw: undefined as ArchiveDraw | undefined });
  useLayoutEffect(() => {
    setDisplay(previous => {
      const actual = Math.max(0, deckCount);
      // Hold only a real, confirmed decrease while its replacement is hidden.
      // The liquid-to-Artifact reveal releases one unit with its deal cue.
      const count = Math.max(actual, Math.min(previous.count, actual + Math.max(0, pendingDrawCount)));
      if (count === previous.count) return previous;
      return {
        count,
        draw: count < previous.count
          ? { key: (previous.draw?.key ?? 0) + 1, amount: previous.count - count }
          : undefined,
      };
    });
  }, [deckCount, pendingDrawCount]);
  const countLabel = display.count > 0 ? display.count : forgeCompact ? '∅' : 'Empty';
  const countClassName = forgeCompact
    ? 'absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold tabular-nums px-0.5'
    : 'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums px-1';

  return (
    <div
      data-deck-tier={tier}
      data-planned={isDeckPending ? 'true' : undefined}
      data-observed={isObserved ? 'true' : undefined}
      className={`${forgeCompact
        ? 'board-forge-archive board-forge-compact-deck relative shrink-0'
        : 'board-forge-archive relative shrink-0'} ${deckDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
      title={deckTitle}
    >
      <ArchiveVessel tier={tier} remaining={display.count} draw={display.draw} />
      {display.draw && (
        <span key={display.draw.key} className="archive-draw-amount" data-archive-draw-amount={display.draw.amount} aria-hidden="true">
          −{display.draw.amount}
        </span>
      )}
      <div
        className={`board-forge-archive-count ${countClassName}`}
        style={display.count > 0
          ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
          : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
        }
      >
        <span key={`${display.count}:${display.draw?.key ?? 0}`} className={display.draw ? 'archive-count-settle' : undefined}>{countLabel}</span>
      </div>
      {isObserved && !isDeckPending && (
        <span
          className="absolute bottom-1 left-1 z-20 flex h-4 w-4 items-center justify-center rounded-full border border-sky-300/45 bg-sky-950/80 text-sky-200 shadow-[0_0_8px_rgba(125,211,252,0.35)]"
          aria-hidden="true"
        >
          <Eye className="h-2.5 w-2.5" />
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          if (deckDisabled) return;
          onDeckTap();
        }}
        disabled={deckDisabled}
        className="absolute inset-0 z-30 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/80"
        aria-label={`${TIER_CIVILIZATION[tier]} Archive, ${display.count} concealed Artifact${display.count === 1 ? '' : 's'} remaining. ${deckTitle}`}
      />
      {isDeckPending && (
        <PendingActionOverlay
          label={pendingLabel}
          compact={forgeCompact}
          onCancel={onCancelPlan}
        />
      )}
    </div>
  );
}
