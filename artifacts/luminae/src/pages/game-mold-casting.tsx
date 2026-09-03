import type { CSSProperties } from 'react';

export type MoldCastCause =
  | 'forge'
  | 'encrypt'
  | 'burn'
  | 'assimilate'
  | 'recurrence'
  | 'impact_extinction'
  | 'annihilation'
  | 'refill';

export interface MoldCastCue {
  id: string;
  cause: MoldCastCause;
  delayMs: number;
  durationMs: number;
}

export const MOLD_CAST_DURATION_MS = 680;
export const MOLD_CAST_STAGGER_MS = 72;

export function ArtifactMoldCastingOverlay({
  cue,
  compact,
}: {
  cue: MoldCastCue;
  compact?: boolean;
}) {
  const style = {
    '--mold-cast-delay': `${cue.delayMs}ms`,
    '--mold-cast-duration': `${cue.durationMs}ms`,
  } as CSSProperties;

  return (
    <div
      key={cue.id}
      className={`artifact-mold-cast${compact ? ' artifact-mold-cast--compact' : ''}`}
      data-testid="artifact-mold-cast"
      data-cast-cause={cue.cause}
      style={style}
      aria-hidden="true"
    >
      <span className="artifact-mold-cast__cavity" />
      <span className="artifact-mold-cast__alloy">
        <span className="artifact-mold-cast__alloy-flow" />
      </span>
      <span className="artifact-mold-cast__cooling" />
      <span className="artifact-mold-cast__sheen" />
      <span className="artifact-mold-cast__inscription artifact-mold-cast__inscription--eminence" />
      <span className="artifact-mold-cast__inscription artifact-mold-cast__inscription--affinity" />
      <span className="artifact-mold-cast__inscription artifact-mold-cast__inscription--cost" />
    </div>
  );
}
