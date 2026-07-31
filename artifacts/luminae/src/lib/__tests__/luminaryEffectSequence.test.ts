import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createLuminaryEffectSequence,
  luminaryEffectSequenceDuration,
  validateLuminaryEffectPhases,
} from '../luminaryEffectSequence';

afterEach(() => {
  vi.useRealTimers();
});

describe('Luminary effect phase contract', () => {
  it('rejects phases that run out of causal order', () => {
    expect(() => validateLuminaryEffectPhases([
      { id: 'announce' },
      { id: 'resolve' },
      { id: 'target' },
    ])).toThrow(/phase order/i);
  });

  it('runs every phase in order and completes exactly once', async () => {
    vi.useFakeTimers();
    const visited: string[] = [];
    const completions: boolean[] = [];
    const controller = createLuminaryEffectSequence({
      phases: [
        { id: 'announce', durationMs: 20 },
        { id: 'frame', durationMs: 20 },
        { id: 'target', durationMs: 20 },
        { id: 'resolve', durationMs: 20 },
        { id: 'reveal', durationMs: 20 },
        { id: 'aftermath', durationMs: 20 },
      ],
      onPhaseChange: phase => visited.push(phase),
      onComplete: skipped => completions.push(skipped),
    });

    controller.start();
    controller.start();
    await vi.runAllTimersAsync();

    expect(visited).toEqual([
      'announce',
      'frame',
      'target',
      'resolve',
      'reveal',
      'aftermath',
    ]);
    expect(completions).toEqual([false]);
  });

  it('skips only the active sequence and never enters later phases', async () => {
    vi.useFakeTimers();
    const visited: string[] = [];
    const skippedAt: Array<string | null> = [];
    const completions: boolean[] = [];
    const controller = createLuminaryEffectSequence({
      phases: [
        { id: 'announce', durationMs: 1_000 },
        { id: 'frame' },
        { id: 'target' },
      ],
      onPhaseChange: phase => visited.push(phase),
      onSkip: phase => skippedAt.push(phase),
      onComplete: skipped => completions.push(skipped),
    });

    controller.start();
    await Promise.resolve();
    controller.skip();
    controller.skip();
    await vi.runAllTimersAsync();

    expect(visited).toEqual(['announce']);
    expect(skippedAt).toEqual(['announce']);
    expect(completions).toEqual([true]);
  });

  it('advances one active phase without skipping the effect', async () => {
    vi.useFakeTimers();
    const visited: string[] = [];
    const completions: boolean[] = [];
    const controller = createLuminaryEffectSequence({
      phases: [
        { id: 'announce', durationMs: 1_000 },
        { id: 'frame', durationMs: 1_000 },
        { id: 'target', durationMs: 20 },
      ],
      onPhaseChange: phase => visited.push(phase),
      onComplete: skipped => completions.push(skipped),
    });

    controller.start();
    await Promise.resolve();
    controller.advance();
    await Promise.resolve();

    expect(visited).toEqual(['announce', 'frame']);
    expect(completions).toEqual([]);

    await vi.runAllTimersAsync();
    expect(visited).toEqual(['announce', 'frame', 'target']);
    expect(completions).toEqual([false]);
  });

  it('uses reduced phase durations when supplied', () => {
    const phases = [
      { id: 'announce' as const, durationMs: 900, reducedDurationMs: 120 },
      { id: 'frame' as const, durationMs: 300, reducedDurationMs: 0 },
      { id: 'aftermath' as const, durationMs: 400, reducedDurationMs: 80 },
    ];

    expect(luminaryEffectSequenceDuration(phases)).toBe(1_600);
    expect(luminaryEffectSequenceDuration(phases, true)).toBe(200);
  });
});
