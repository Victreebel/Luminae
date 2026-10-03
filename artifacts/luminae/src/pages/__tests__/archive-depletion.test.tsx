import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ForgeDeckPile, type ForgeDeckPileProps } from '../game-board-forge-deck';
import { ForgeReplacementDealAnimation } from '@/components/ForgeReplacementDealAnimation';
import { gameAudio } from '@/lib/audio';
import { FORGE_REFILL_DURATION_MS, getForgeRefillRevealMs } from '@/lib/forgeRefillTiming';

vi.hoisted(() => {
  if (!('AnimationEvent' in window)) vi.stubGlobal('AnimationEvent', Event);
});
vi.mock('@/lib/audio', () => ({
  gameAudio: { startForgeRefill: vi.fn(() => ({ reveal: vi.fn(), complete: vi.fn(), cancel: vi.fn() })) },
}));
vi.mock('@/components/ForgeMoltenSurface', () => ({ ForgeMoltenSurface: () => null }));

const base: ForgeDeckPileProps = {
  deckCount: 10,
  deckDisabled: false,
  deckTitle: 'Encrypt a concealed Artifact',
  isDeckPending: false,
  forgeCompact: false,
  onCancelPlan: () => {},
  onDeckTap: () => {},
  tier: 3,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.clearAllMocks(); });

describe('Archive depletion', () => {
  it.each([false, true])('drops with the fade-in cue while formation remains active (compact=%s)', forgeCompact => {
    function Transfer({ drawn }: { drawn: boolean }) {
      const [complete, setComplete] = useState(false);
      const [revealed, setRevealed] = useState(false);
      const transferring = drawn && !complete;
      return <>
        <ForgeDeckPile {...base} forgeCompact={forgeCompact} deckCount={drawn ? 9 : 10} pendingDrawCount={transferring && !revealed ? 1 : 0} />
        {transferring && <ForgeReplacementDealAnimation
          animKey="draw" cardId="artifact" tier={3} placement="inline"
          deckRect={{ x: 0, y: 0, w: 30, h: 140 }} slotRect={{ x: 0, y: 0, w: 103, h: 147 }}
          animX={[0]} animY={[0]} animRotateY={[0]} animScale={[1]} faceScale={1}
          cardFace={<span>Artifact</span>} onReveal={() => setRevealed(true)} onComplete={() => setComplete(true)}
        />}
      </>;
    }
    const { container, rerender } = render(<Transfer drawn={false} />);
    rerender(<Transfer drawn />);
    const crystal = container.querySelector('.archive-vessel') as HTMLElement;
    expect(crystal.dataset.archiveRemaining).toBe('10');
    expect(container.querySelector('.archive-draw-amount')).toBeNull();
    const sound = vi.mocked(gameAudio.startForgeRefill).mock.results.at(-1)!.value;
    expect(sound.complete).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(getForgeRefillRevealMs(FORGE_REFILL_DURATION_MS) - 1); });
    expect(crystal.dataset.archiveRemaining).toBe('10');
    expect(sound.reveal).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(sound.reveal).toHaveBeenCalledOnce();
    expect(sound.complete).not.toHaveBeenCalled();
    expect(screen.getByTestId('forge-replacement-deal-animation')).toBeInTheDocument();
    expect(crystal.dataset.archiveRemaining).toBe('9');
    expect(crystal.style.getPropertyValue('--archive-fill')).toBe('50%');
    expect(container.querySelector('.board-forge-archive-count')).toHaveTextContent('9');
    expect(container.querySelector('.archive-draw-amount')).toHaveTextContent('−1');
    const release = container.querySelector('.archive-vessel__release');
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', { value: 'forge-refill-lifecycle' });
    fireEvent(screen.getByTestId('forge-replacement-deal-animation'), event);
    expect(sound.complete).toHaveBeenCalledOnce();
    expect(sound.reveal).toHaveBeenCalledOnce();
    expect(crystal.dataset.archiveRemaining).toBe('9');
    expect(container.querySelector('.archive-vessel__release')).toBe(release);
  });

  it('releases staggered draws individually and catches up if remaining transfers are skipped', () => {
    const { container, rerender } = render(<ForgeDeckPile {...base} />);
    const crystal = container.querySelector('.archive-vessel')!;
    for (const pending of [4, 3, 2]) {
      rerender(<ForgeDeckPile {...base} deckCount={6} pendingDrawCount={pending} />);
      expect(crystal).toHaveAttribute('data-archive-remaining', String(6 + pending));
      if (pending < 4) expect(container.querySelector('.archive-draw-amount')).toHaveTextContent('−1');
    }
    rerender(<ForgeDeckPile {...base} deckCount={6} pendingDrawCount={0} />);
    expect(crystal).toHaveAttribute('data-archive-remaining', '6');
    expect(container.querySelector('.archive-draw-amount')).toHaveTextContent('−2');
  });

  it('does not invent an Archive draw on mount or when hiding unchanged cards', () => {
    const { container, rerender } = render(<ForgeDeckPile {...base} pendingDrawCount={4} />);
    rerender(<ForgeDeckPile {...base} pendingDrawCount={0} />);
    expect(container.querySelector('.archive-vessel')).toHaveAttribute('data-archive-remaining', '10');
    expect(container.querySelector('.archive-draw-amount')).toBeNull();
  });

  it('removes depletion feedback when cards return to the Archive', () => {
    const { container, rerender } = render(<ForgeDeckPile {...base} />);
    rerender(<ForgeDeckPile {...base} deckCount={9} />);
    expect(container.querySelector('.archive-draw-amount')).toHaveTextContent('−1');
    rerender(<ForgeDeckPile {...base} deckCount={10} />);
    expect(container.querySelector('.archive-vessel')).toHaveAttribute('data-archive-remaining', '10');
    expect(container.querySelector('.archive-draw-amount')).toBeNull();
  });

  it('keeps an exhausted Archive disabled while its last unit is visibly transferring', () => {
    const { container, rerender } = render(<ForgeDeckPile {...base} deckCount={1} />);
    rerender(<ForgeDeckPile {...base} deckCount={0} pendingDrawCount={1} deckDisabled />);
    expect(container.querySelector('.archive-vessel')).toHaveAttribute('data-archive-remaining', '1');
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<ForgeDeckPile {...base} deckCount={0} pendingDrawCount={0} deckDisabled />);
    expect(container.querySelector('.archive-vessel')).toHaveAttribute('data-archive-state', 'empty');
    expect(container.querySelector('.board-forge-archive-count')).toHaveTextContent('Empty');
  });
});
