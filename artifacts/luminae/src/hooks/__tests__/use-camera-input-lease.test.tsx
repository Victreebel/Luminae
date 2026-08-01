import { useRef } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useCameraInputLease } from '@/hooks/use-camera-input-lease';

function CameraLeaseFixture({ active }: { active: boolean }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useCameraInputLease({ active, boardRef, passthroughRef: panelRef });

  return (
    <>
      <div ref={boardRef} data-testid="board" tabIndex={-1} />
      <div ref={panelRef} data-testid="panel" />
      <button type="button">Skip effect</button>
    </>
  );
}

describe('useCameraInputLease', () => {
  it('blocks manual board and passthrough scrolling only while leased', () => {
    const { getByTestId, rerender } = render(
      <CameraLeaseFixture active={false} />,
    );
    const board = getByTestId('board');
    const panel = getByTestId('panel');

    expect(
      board.dispatchEvent(new WheelEvent('wheel', { cancelable: true })),
    ).toBe(true);

    rerender(<CameraLeaseFixture active />);

    expect(
      board.dispatchEvent(new WheelEvent('wheel', { cancelable: true })),
    ).toBe(false);
    expect(
      panel.dispatchEvent(new Event('touchmove', { cancelable: true })),
    ).toBe(false);
    expect(
      board.dispatchEvent(new MouseEvent('mousedown', {
        button: 1,
        cancelable: true,
      })),
    ).toBe(false);
  });

  it('blocks keyboard scrolling without disabling interactive controls', () => {
    const { getByRole } = render(<CameraLeaseFixture active />);

    const scrollKey = new KeyboardEvent('keydown', {
      key: 'PageDown',
      bubbles: true,
      cancelable: true,
    });
    expect(window.dispatchEvent(scrollKey)).toBe(false);

    const skipButton = getByRole('button', { name: 'Skip effect' });
    const buttonActivation = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    expect(skipButton.dispatchEvent(buttonActivation)).toBe(true);
  });
});
