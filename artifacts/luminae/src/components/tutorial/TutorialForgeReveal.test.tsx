import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import { TutorialForgeReveal } from './TutorialForgeReveal';
import { gameAudio } from '@/lib/audio';
import { FORGE_REFILL_COMPLETION_BUFFER_MS, FORGE_REFILL_DURATION_MS, getForgeRefillRevealMs } from '@/lib/forgeRefillTiming';

vi.mock('@/components/ForgeMoltenSurface', () => ({ ForgeMoltenSurface: () => null }));
vi.mock('@/lib/audio', () => ({ gameAudio: { startForgeRefill: vi.fn(() => ({ reveal: vi.fn(), complete: vi.fn(), cancel: vi.fn() })) } }));
const card = { id: 't1r01', tier: 1, name: 'Artifact', cost: {}, bonusAffinity: 'flare', eminence: 0 } as ArtifactCard;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.clearAllMocks(); });

it('plays the fade-in cue before unlocking the interactive tutorial Artifact', () => {
  const onComplete = vi.fn();
  render(<TutorialForgeReveal card={card} costs={{}} slotKey="1-0" shouldAnimate delay={420} onComplete={onComplete}>
    <button>Forge Artifact</button>
  </TutorialForgeReveal>);
  expect(screen.queryByRole('button', { name: 'Forge Artifact' })).not.toBeInTheDocument();
  expect(screen.getByTestId('forge-replacement-deal-animation')).toHaveAttribute('data-placement', 'slot');
  act(() => { vi.advanceTimersByTime(420 + getForgeRefillRevealMs(FORGE_REFILL_DURATION_MS)); });
  expect(vi.mocked(gameAudio.startForgeRefill).mock.results[0].value.reveal).toHaveBeenCalledOnce();
  expect(screen.queryByRole('button', { name: 'Forge Artifact' })).not.toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(FORGE_REFILL_DURATION_MS + FORGE_REFILL_COMPLETION_BUFFER_MS - getForgeRefillRevealMs(FORGE_REFILL_DURATION_MS) - 1); });
  expect(onComplete).not.toHaveBeenCalled();
  act(() => { vi.advanceTimersByTime(1); });
  expect(onComplete).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Forge Artifact' })).toBeVisible();
  expect(vi.mocked(gameAudio.startForgeRefill).mock.results[0].value.complete).toHaveBeenCalledOnce();
});

it('shows previously introduced Artifacts immediately on a resumed lesson', () => {
  render(<TutorialForgeReveal card={card} costs={{}} slotKey="1-0" shouldAnimate={false} onComplete={vi.fn()}>
    <button>Forge Artifact</button>
  </TutorialForgeReveal>);
  expect(screen.getByRole('button', { name: 'Forge Artifact' })).toBeVisible();
  expect(gameAudio.startForgeRefill).not.toHaveBeenCalled();
});
