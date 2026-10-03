import React from 'react';
import { ChevronDown, Clock3, Focus, Landmark } from 'lucide-react';
import type {
  CivilizationSceneKind,
  CivilizationVisualMilestone,
  CivilizationVisualState,
} from '@/lib/civilizationVisualState';
import { CARD_RUNTIME_ART } from '@/lib/cardArtManifest';

interface CivilizationHistoryRibbonProps {
  visualState: CivilizationVisualState;
  currentScene: CivilizationSceneKind;
  onFocusMilestone: (milestone: CivilizationVisualMilestone) => void;
}

function milestoneTime(milestone: CivilizationVisualMilestone): string {
  return milestone.turnCount === null ? 'Historical record' : `Turn ${milestone.turnCount}`;
}

function milestoneArtwork(milestone: CivilizationVisualMilestone): string | null {
  return milestone.artifactId ? CARD_RUNTIME_ART[milestone.artifactId] ?? null : null;
}

function HistoryMilestoneMarker({
  milestone,
  compact = false,
}: {
  milestone: CivilizationVisualMilestone;
  compact?: boolean;
}) {
  const artwork = milestoneArtwork(milestone);

  if (artwork) {
    return (
      <span
        className={`relative shrink-0 overflow-hidden ${compact ? 'h-5 w-5' : 'h-8 w-8'}`}
        style={{
          background: `linear-gradient(145deg, rgba(255,255,255,0.72), ${milestone.tone}D8 22%, rgba(10,16,26,0.98) 58%, ${milestone.tone}8C 100%)`,
          clipPath: 'polygon(15% 0, 85% 0, 100% 10%, 100% 76%, 50% 100%, 0 76%, 0 10%)',
          filter: `drop-shadow(0 0 ${compact ? 5 : 9}px ${milestone.tone}45)`,
        }}
        data-testid="civilization-history-artifact-thumbnail"
        data-artifact-id={milestone.artifactId ?? undefined}
        aria-hidden="true"
      >
        <span
          className="absolute overflow-hidden bg-[#030712]"
          style={{
            inset: 1,
            clipPath: 'polygon(15% 0, 85% 0, 100% 10%, 100% 75%, 50% 100%, 0 75%, 0 10%)',
          }}
        >
          <img
            src={artwork}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
            draggable={false}
          />
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.18), transparent 26%, rgba(1,4,11,0.38) 82%, rgba(1,4,11,0.62))',
              boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16)',
            }}
          />
        </span>
      </span>
    );
  }

  return (
    <span
      className={`${compact ? 'h-2 w-2' : 'mt-1 h-2 w-2'} shrink-0 rotate-45 border bg-[#07101a]`}
      style={{ borderColor: `${milestone.tone}A6`, boxShadow: `0 0 8px ${milestone.tone}35` }}
      aria-hidden="true"
    />
  );
}

export function CivilizationHistoryRibbon({
  visualState,
  currentScene,
  onFocusMilestone,
}: CivilizationHistoryRibbonProps) {
  const [expanded, setExpanded] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const meaningfulMilestones = visualState.milestones.filter((milestone) => (
    milestone.kind !== 'maturity' || visualState.milestones.length === 1
  ));
  const visibleMilestones = meaningfulMilestones.slice(-5);
  if (visualState.milestones.length === 0) return null;

  return (
    <section
      className="border-t border-white/10 bg-[#050914]/94"
      data-testid="civilization-history-ribbon"
      aria-label="Civilization history"
    >
      <button
        type="button"
        className="grid min-h-12 w-full items-center gap-3 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/60"
        style={{ gridTemplateColumns: 'auto minmax(0, 1fr) auto' }}
        aria-expanded={expanded}
        aria-label={`Civilization history, ${visualState.milestones.length} records`}
        onClick={() => setExpanded((current) => !current)}
      >
        <span
          className="grid h-8 w-8 place-items-center border border-white/12 bg-white/[0.035]"
          style={{ color: visualState.identities[currentScene].primaryTone }}
          aria-hidden="true"
        >
          <Landmark className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-white/42">Civilization history</span>
          <span className="mt-1 flex min-w-0 items-center gap-1.5" aria-hidden="true">
            <span className="h-px flex-1 bg-white/10" style={{ minWidth: '0.5rem' }} />
            {visibleMilestones.map((milestone) => (
              <HistoryMilestoneMarker key={milestone.id} milestone={milestone} compact />
            ))}
            <span className="h-px flex-1 bg-white/10" style={{ minWidth: '0.5rem' }} />
          </span>
        </span>
        <span className="flex items-center text-white/46">
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/8 px-3 pb-3 pt-2" data-testid="civilization-history-expanded">
          <ol className="grid gap-1 sm:grid-cols-2">
            {[...visualState.milestones].reverse().map((milestone) => {
              const active = selectedId === milestone.id;
              const canFocus = Boolean(milestone.siteId || milestone.scene);
              return (
                <li key={milestone.id}>
                  <button
                    type="button"
                    className="grid min-h-11 w-full items-start gap-2 border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    style={{
                      gridTemplateColumns: 'auto minmax(0, 1fr) auto',
                      borderColor: active ? `${milestone.tone}7A` : 'rgba(255,255,255,0.08)',
                      background: active ? `${milestone.tone}10` : 'rgba(255,255,255,0.018)',
                    }}
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedId((current) => current === milestone.id ? null : milestone.id);
                      if (canFocus) onFocusMilestone(milestone);
                    }}
                  >
                    <HistoryMilestoneMarker milestone={milestone} />
                    <span className="min-w-0">
                      <strong className="block truncate text-[11px] font-semibold text-white/86">{milestone.label}</strong>
                      <span className="mt-0.5 block text-[9px] uppercase tracking-[0.09em] text-white/38">
                        {milestoneTime(milestone)} / {milestone.kind}
                      </span>
                      {active && (
                        <span
                          className="mt-1.5 block text-[10px] leading-relaxed"
                          style={{ color: 'rgba(255, 255, 255, 0.64)' }}
                        >
                          {milestone.detail}
                        </span>
                      )}
                    </span>
                    {canFocus && (
                      <span className="mt-0.5 text-white/28" title={`Focus ${milestone.scene ?? currentScene} scene`}>
                        <Focus className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-2 flex items-center gap-1.5 text-[9px] leading-relaxed text-white/34">
            <Clock3 className="h-3 w-3 shrink-0" aria-hidden="true" />
            Historical changes remain recorded even when their present capability is damaged or lost.
          </p>
        </div>
      )}
    </section>
  );
}
