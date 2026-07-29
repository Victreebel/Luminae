export const LUMINARY_EFFECT_PHASE_ORDER = [
  'announce',
  'frame',
  'target',
  'resolve',
  'reveal',
  'aftermath',
] as const;

export type LuminaryEffectPhaseId = (typeof LUMINARY_EFFECT_PHASE_ORDER)[number];

export interface LuminaryEffectPhaseContext {
  signal: AbortSignal;
  reducedMotion: boolean;
  wait: (durationMs: number) => Promise<void>;
  waitFor: (
    register: (done: () => void) => void,
    fallbackMs: number,
  ) => Promise<void>;
}

export interface LuminaryEffectPhase {
  id: LuminaryEffectPhaseId;
  durationMs?: number;
  reducedDurationMs?: number;
  run?: (context: LuminaryEffectPhaseContext) => void | Promise<void>;
}

export interface LuminaryEffectSequenceOptions {
  phases: readonly LuminaryEffectPhase[];
  reducedMotion?: boolean;
  onPhaseChange?: (phase: LuminaryEffectPhaseId) => void;
  onSkip?: (phase: LuminaryEffectPhaseId | null) => void;
  onComplete: (skipped: boolean) => void;
  onError?: (error: unknown) => void;
}

export interface LuminaryEffectSequenceController {
  start: () => void;
  skip: () => void;
  cancel: () => void;
  currentPhase: () => LuminaryEffectPhaseId | null;
}

const phaseIndex = new Map<LuminaryEffectPhaseId, number>(
  LUMINARY_EFFECT_PHASE_ORDER.map((phase, index) => [phase, index]),
);

export function validateLuminaryEffectPhases(
  phases: readonly LuminaryEffectPhase[],
): void {
  let previousIndex = -1;
  for (const phase of phases) {
    const nextIndex = phaseIndex.get(phase.id);
    if (nextIndex === undefined || nextIndex <= previousIndex) {
      throw new Error(`Luminary effect phase order is invalid at "${phase.id}"`);
    }
    previousIndex = nextIndex;
  }
}

function abortableWait(durationMs: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted || durationMs <= 0) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(finish, durationMs);

    function finish() {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    }

    signal.addEventListener('abort', finish, { once: true });
  });
}

function abortableWaitFor(
  register: (done: () => void) => void,
  fallbackMs: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted) return Promise.resolve();

  return new Promise((resolve) => {
    let settled = false;
    const fallback = setTimeout(finish, Math.max(0, fallbackMs));

    function finish() {
      if (settled) return;
      settled = true;
      clearTimeout(fallback);
      signal.removeEventListener('abort', finish);
      resolve();
    }

    signal.addEventListener('abort', finish, { once: true });
    try {
      register(finish);
    } catch {
      finish();
    }
  });
}

/**
 * Runs one Luminary effect as a canonical sequence of causal phases.
 *
 * The controller owns phase advancement and exactly-once completion. Visual
 * directors remain free to supply bespoke work inside a phase, but they cannot
 * acknowledge the activation or advance the queue independently.
 */
export function createLuminaryEffectSequence(
  options: LuminaryEffectSequenceOptions,
): LuminaryEffectSequenceController {
  validateLuminaryEffectPhases(options.phases);

  const abortController = new AbortController();
  const reducedMotion = !!options.reducedMotion;
  let started = false;
  let finished = false;
  let cancelled = false;
  let activePhase: LuminaryEffectPhaseId | null = null;

  const finish = (skipped: boolean) => {
    if (finished || cancelled) return;
    finished = true;
    options.onComplete(skipped);
  };

  const context: LuminaryEffectPhaseContext = {
    signal: abortController.signal,
    reducedMotion,
    wait: (durationMs) => abortableWait(durationMs, abortController.signal),
    waitFor: (register, fallbackMs) => (
      abortableWaitFor(register, fallbackMs, abortController.signal)
    ),
  };

  const run = async () => {
    try {
      for (const phase of options.phases) {
        if (abortController.signal.aborted) return;
        activePhase = phase.id;
        options.onPhaseChange?.(phase.id);
        await phase.run?.(context);
        if (abortController.signal.aborted) return;
        const durationMs = reducedMotion
          ? (phase.reducedDurationMs ?? phase.durationMs ?? 0)
          : (phase.durationMs ?? 0);
        await context.wait(durationMs);
      }
      if (!abortController.signal.aborted) finish(false);
    } catch (error) {
      if (abortController.signal.aborted) return;
      options.onError?.(error);
      finish(false);
    }
  };

  return {
    start: () => {
      if (started || finished || cancelled) return;
      started = true;
      void run();
    },
    skip: () => {
      if (finished || cancelled) return;
      const skippedPhase = activePhase;
      abortController.abort();
      try {
        options.onSkip?.(skippedPhase);
      } finally {
        finish(true);
      }
    },
    cancel: () => {
      if (finished || cancelled) return;
      cancelled = true;
      abortController.abort();
    },
    currentPhase: () => activePhase,
  };
}

export function luminaryEffectSequenceDuration(
  phases: readonly LuminaryEffectPhase[],
  reducedMotion = false,
): number {
  return phases.reduce((total, phase) => (
    total + (
      reducedMotion
        ? (phase.reducedDurationMs ?? phase.durationMs ?? 0)
        : (phase.durationMs ?? 0)
    )
  ), 0);
}
