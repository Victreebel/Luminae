import React from 'react';
import { Eye } from 'lucide-react';
import { CardBackTier1, CardBackTier2, CardBackTier3 } from '@/components/ArtifactCardBack';
import { useArchivePresentation } from '@/lib/archivePresentation';
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
  const presentation = useArchivePresentation();
  const roman = tier === 3 ? 'III' : tier === 2 ? 'II' : 'I';
  const archive = getArchiveMetrics(tier, remaining);
  const archiveStyle = {
    '--archive-fill': archive.fill,
  } as React.CSSProperties;

  return (
    <div
      className={`archive-vessel archive-vessel--tier-${tier} ${className}`}
      data-archive-capacity={archive.capacity}
      data-archive-presentation={presentation}
      data-archive-state={archive.state}
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
  deckDisabled: boolean;
  deckTitle: string;
  inline?: boolean;
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
  deckDisabled,
  deckTitle,
  inline = false,
  isDeckPending,
  isObserved = false,
  pendingLabel = 'Encrypt pending',
  forgeCompact,
  onCancelPlan,
  onDeckTap,
  tier,
}: ForgeDeckPileProps) {
  const countLabel = deckCount > 0 ? deckCount : forgeCompact || inline ? '∅' : 'Empty';
  const countClassName = forgeCompact
    ? 'absolute top-1 right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[8px] font-bold tabular-nums px-0.5'
    : 'absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold tabular-nums px-1';

  const archiveLabel = `Tier ${tier} Archive, ${deckCount} concealed Artifact${deckCount === 1 ? '' : 's'} remaining`;

  if (inline) {
    const pendingAction = pendingLabel.replace(/\s+pending$/i, '');
    return (
      <div
        data-deck-tier={tier}
        data-planned={isDeckPending ? 'true' : undefined}
        data-observed={isObserved ? 'true' : undefined}
        className={`board-forge-inline-archive relative shrink-0 ${deckDisabled ? 'cursor-not-allowed opacity-50' : ''}`}
        title={deckTitle}
      >
        <button
          type="button"
          onClick={() => {
            if (deckDisabled) return;
            if (isDeckPending) {
              void onCancelPlan();
              return;
            }
            onDeckTap();
          }}
          disabled={deckDisabled}
          className="board-forge-inline-archive-button focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80"
          aria-label={isDeckPending ? `Cancel pending ${pendingAction}` : `${archiveLabel}. ${deckTitle}`}
        >
          <ArchiveVessel tier={tier} remaining={deckCount} className="archive-vessel--inline" />
          <span className="board-forge-archive-count board-forge-archive-count--inline">
            {countLabel}
          </span>
          {isObserved && !isDeckPending && <Eye className="board-forge-inline-archive-eye" aria-hidden="true" />}
          {isDeckPending && <span className="board-forge-inline-archive-cancel" aria-hidden="true">x</span>}
        </button>
      </div>
    );
  }

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
        aria-label={`${archiveLabel}. ${deckTitle}`}
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
