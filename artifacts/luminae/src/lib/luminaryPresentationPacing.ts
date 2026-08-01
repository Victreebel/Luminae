export type LuminaryPlaybackMode = 'standard' | 'swift';

interface LuminaryPacingProfile {
  durationScale: number;
  readBaseMs: number;
  readPerWordMs: number;
  minReadMs: number;
  maxReadMs: number;
  maxGroupStaggerMs: number;
}

export const LUMINARY_PACING_PROFILES: Record<
  LuminaryPlaybackMode,
  LuminaryPacingProfile
> = {
  standard: {
    durationScale: 1,
    readBaseMs: 450,
    readPerWordMs: 220,
    minReadMs: 1_050,
    maxReadMs: 2_400,
    maxGroupStaggerMs: 650,
  },
  swift: {
    durationScale: 0.68,
    readBaseMs: 360,
    readPerWordMs: 165,
    minReadMs: 780,
    maxReadMs: 1_650,
    maxGroupStaggerMs: 460,
  },
};

export function normalizeLuminaryPlaybackMode(
  value: unknown,
): LuminaryPlaybackMode {
  return value === 'swift' ? 'swift' : 'standard';
}

function normalizeTimelineRate(value: number): number {
  return Number.isFinite(value) ? Math.max(1, value) : 1;
}

export function luminaryPacedDuration(
  durationMs: number,
  mode: LuminaryPlaybackMode = 'standard',
  timelinePlaybackRate = 1,
): number {
  const profile = LUMINARY_PACING_PROFILES[mode];
  return Math.max(
    0,
    Math.round(
      (durationMs * profile.durationScale) /
        normalizeTimelineRate(timelinePlaybackRate),
    ),
  );
}

export function luminaryReadDuration(
  copy: string | undefined,
  mode: LuminaryPlaybackMode = 'standard',
  timelinePlaybackRate = 1,
): number {
  const profile = LUMINARY_PACING_PROFILES[mode];
  const wordCount = copy?.trim().split(/\s+/).filter(Boolean).length ?? 0;
  const rawDuration = Math.min(
    profile.maxReadMs,
    Math.max(
      profile.minReadMs,
      profile.readBaseMs + wordCount * profile.readPerWordMs,
    ),
  );
  return Math.max(
    0,
    Math.round(rawDuration / normalizeTimelineRate(timelinePlaybackRate)),
  );
}

/**
 * Returns a per-target delay whose complete stagger envelope stays bounded.
 * Large target groups therefore read as one event instead of extending the
 * cinematic by a fixed amount for every Artifact.
 */
export function boundedLuminaryStagger(
  targetCount: number,
  preferredStaggerMs: number,
  mode: LuminaryPlaybackMode = 'standard',
  timelinePlaybackRate = 1,
): number {
  if (targetCount <= 1) return 0;
  const profile = LUMINARY_PACING_PROFILES[mode];
  const scaledPreferred = luminaryPacedDuration(
    preferredStaggerMs,
    mode,
    timelinePlaybackRate,
  );
  const maxEnvelope = Math.round(
    profile.maxGroupStaggerMs / normalizeTimelineRate(timelinePlaybackRate),
  );
  return Math.max(
    0,
    Math.min(scaledPreferred, Math.floor(maxEnvelope / (targetCount - 1))),
  );
}

export function luminaryGroupDuration(
  targetCount: number,
  itemDurationMs: number,
  preferredStaggerMs: number,
  mode: LuminaryPlaybackMode = 'standard',
  timelinePlaybackRate = 1,
): number {
  return (
    luminaryPacedDuration(itemDurationMs, mode, timelinePlaybackRate) +
    Math.max(0, targetCount - 1) *
      boundedLuminaryStagger(
        targetCount,
        preferredStaggerMs,
        mode,
        timelinePlaybackRate,
      )
  );
}
