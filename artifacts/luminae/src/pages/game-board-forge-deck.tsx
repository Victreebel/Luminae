import React from 'react';
import { PendingActionOverlay } from './game-card';

const ARCHIVE_CAPACITY_BY_TIER: Record<1 | 2 | 3, number> = {
  1: 36,
  2: 26,
  3: 16,
};

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
  className = '',
}: {
  tier: 1 | 2 | 3;
  remaining?: number;
  className?: string;
}) {
  const roman = tier === 3 ? 'III' : tier === 2 ? 'II' : 'I';
  const archive = getArchiveMetrics(tier, remaining);
  const archiveStyle = {
    '--archive-fill': archive.fill,
  } as React.CSSProperties;

  return (
    <div
      className={`archive-vessel archive-vessel--tier-${tier} ${className}`}
      data-archive-capacity={archive.capacity}
      data-archive-state={archive.state}
      style={archiveStyle}
      aria-hidden="true"
    >
      <span className="archive-vessel__halo" />
      <span className="archive-vessel__crystal">
        <span className="archive-vessel__charge" />
        <span className="archive-vessel__facet" />
        <span className="archive-vessel__ticks" />
      </span>
      <span className="archive-vessel__tier">{roman}</span>
    </div>
  );
}

export interface ForgeDeckPileProps {
  deckCount: number;
  deckDisabled: boolean;
  deckTitle: string;
  isDeckPending: boolean;
  forgeCompact: boolean;
  onCancelPlan: () => void | Promise<void>;
  onDeckTap: () => void;
  showAvatarSeed: boolean;
  tier: 1 | 2 | 3;
}

export function ForgeDeckPile({
  deckCount,
  deckDisabled,
  deckTitle,
  isDeckPending,
  forgeCompact,
  onCancelPlan,
  onDeckTap,
  showAvatarSeed,
  tier,
}: ForgeDeckPileProps) {
  const countLabel = deckCount > 0 ? deckCount : forgeCompact ? '∅' : 'Empty';
  const countClassName = forgeCompact
    ? 'absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold tabular-nums px-0.5'
    : 'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums px-1';
  const seedClassName = forgeCompact
    ? 'pointer-events-none absolute bottom-1 left-1 w-[14px] h-[14px] flex items-center justify-center rounded-full'
    : 'pointer-events-none absolute bottom-1.5 left-1.5 w-[16px] h-[16px] flex items-center justify-center rounded-full';
  const seedFontSize = forgeCompact ? 8 : 9;

  return (
    <div
      data-deck-tier={tier}
      data-planned={isDeckPending ? 'true' : undefined}
      className={`${forgeCompact
        ? 'board-forge-archive board-forge-compact-deck relative shrink-0'
        : 'board-forge-archive relative shrink-0'} ${deckDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
      title={deckTitle}
    >
      <ArchiveVessel tier={tier} remaining={deckCount} />
      <div
        className={`board-forge-archive-count ${countClassName}`}
        style={deckCount > 0
          ? { background: 'rgba(10,10,20,0.78)', border: '1px solid rgba(192,164,114,0.38)', boxShadow: '0 1px 4px rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.9)' }
          : { background: 'rgba(40,10,10,0.85)', border: '1px solid rgba(160,60,60,0.5)', color: 'rgba(255,120,120,0.9)' }
        }
      >
        {countLabel}
      </div>
      {showAvatarSeed && (
        <div
          className={seedClassName}
          style={{ background: 'rgba(4,12,8,0.90)', border: '1px solid #4ade80', boxShadow: forgeCompact ? '0 0 6px #4ade8066' : '0 0 8px #4ade8066' }}
          title="Avatar Seeds waiting in this tier"
        >
          <span style={{ fontSize: seedFontSize, lineHeight: 1 }}>🌿</span>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (deckDisabled) return;
          onDeckTap();
        }}
        disabled={deckDisabled}
        className="absolute inset-0 z-30 rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300/80"
        aria-label={`Tier ${tier} Archive, ${deckCount} concealed Artifact${deckCount === 1 ? '' : 's'} remaining. ${deckTitle}`}
      />
      {isDeckPending && (
        <PendingActionOverlay
          label="Encrypt pending"
          compact={forgeCompact}
          onCancel={onCancelPlan}
        />
      )}
    </div>
  );
}
