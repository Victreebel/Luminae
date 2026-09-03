import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LuminaryEffectCaptionRail,
  LuminaryEffectResultReceipt,
  LuminaryEffectSkipControl,
} from '../LuminaryEffectChrome';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => (
    window.setTimeout(() => callback(performance.now()), 16)
  ));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LuminaryEffectSkipControl', () => {
  it('uses a tap for one beat and a hold for only the current effect', () => {
    const onAdvance = vi.fn();
    const onSkip = vi.fn();
    render(
      <LuminaryEffectSkipControl
        color="#f97316"
        onAdvance={onAdvance}
        onSkip={onSkip}
      />,
    );
    const control = screen.getByRole('button');

    fireEvent.click(control);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.pointerDown(control, {
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerUp(control, { pointerId: 1, pointerType: 'touch' });
    fireEvent.click(control);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it('can join the caption rail without changing its skip behavior', () => {
    render(
      <LuminaryEffectSkipControl
        color="#f97316"
        onSkip={vi.fn()}
        docked
      />,
    );

    expect(screen.getByRole('button')).toHaveClass('lum-effect-skip-control--docked');
  });
});

describe('LuminaryEffectCaptionRail', () => {
  it('keeps the resolving mechanic readable in a reserved chrome lane', () => {
    render(
      <LuminaryEffectCaptionRail
        effectName="Balance Due"
        luminaryName="The Pale Merchant"
        resultLabel="Vesper returns"
        description="2 Continuum"
        triggeringPlayerName="Recalescence"
        queueLabel="ARRIVAL EFFECT · 2 OF 3"
        primaryColor="#cbd5e1"
      />,
    );

    const rail = screen.getByTestId('luminary-effect-caption-rail');
    expect(rail).toHaveAccessibleName(
      'ARRIVAL EFFECT · 2 OF 3. Balance Due. Vesper returns. 2 Continuum. The Pale Merchant. Recalescence',
    );
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Balance Due')).toBeInTheDocument();
    expect(screen.getByText('2 Continuum')).toBeInTheDocument();
  });
});

describe('LuminaryEffectResultReceipt', () => {
  it('lingers after a sequence, collapses without disappearing, and remains dismissible', () => {
    const onDismiss = vi.fn();
    render(
      <LuminaryEffectResultReceipt
        receipts={[
          {
            eventId: 'effect-1',
            effectName: 'Balance Due',
            result: '3 holdings returned 6 Affinity tokens to the Well.',
            primaryColor: '#cbd5e1',
          },
          {
            eventId: 'effect-2',
            effectName: 'Cinder Mandate',
            result: '3 Artifacts burned.',
            primaryColor: '#ef4444',
          },
        ]}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByText('Balance Due')).toBeInTheDocument();
    expect(screen.getByText('3 Artifacts burned.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse resolved effects' })).toBeEnabled();

    act(() => vi.advanceTimersByTime(10_000));

    const collapsed = screen.getByRole('button', {
      name: 'Show details: Cinder Mandate: 3 Artifacts burned.',
    });
    expect(collapsed).toBeEnabled();
    fireEvent.click(collapsed);
    expect(screen.getByText('Balance Due')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss resolved effects' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('stays compact and noninteractive while another effect is resolving', () => {
    render(
      <LuminaryEffectResultReceipt
        activeSequence
        receipts={[
          {
            eventId: 'effect-1',
            effectName: 'Balance Due',
            result: '6 Affinity tokens returned to the Well.',
            primaryColor: '#cbd5e1',
          },
        ]}
        onDismiss={vi.fn()}
      />,
    );

    const receipt = screen.getByTestId('luminary-effect-result-receipt');
    expect(receipt).toHaveClass('lum-effect-receipt--during-sequence');
    expect(screen.getByRole('button', {
      name: 'Balance Due: 6 Affinity tokens returned to the Well.',
    })).toHaveAttribute('aria-expanded', 'false');

    act(() => vi.advanceTimersByTime(15_000));
    expect(receipt).toHaveClass('lum-effect-receipt--collapsed');
  });
});
