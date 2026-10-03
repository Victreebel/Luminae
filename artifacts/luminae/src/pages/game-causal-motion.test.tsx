import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HarnessConvergenceLayer } from './game-causal-motion';

function setRect(element: HTMLElement, x: number, y: number, width: number, height: number) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => new DOMRect(x, y, width, height),
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('compact Well Harness transfer', () => {
  it.each(['hidden', 'removed'] as const)(
    'reaches the moved holdings counter after the Harness button is %s',
    async (retraction) => {
      const harness = document.createElement('button');
      harness.dataset.testid = 'harness-button';
      setRect(harness, 260, 500, 80, 36);

      const held = document.createElement('span');
      held.dataset.affinityHeldTarget = '';
      setRect(held, 12, 440, 32, 32);

      const source = document.createElement('img');
      source.dataset.affinitySymbol = 'flare';
      setRect(source, 70, 440, 24, 24);
      document.body.append(harness, held, source);

      const view = render(
        <HarnessConvergenceLayer selectedAffinities={{ flare: 1 }} harnessBurstKeys={{}} />,
      );

      // Establish the visible selection route before the action retracts its controls.
      await waitFor(() => {
        const selection = document.querySelector('.causal-motion-layer path');
        expect(selection?.getAttribute('d')).toMatch(/^M 82 452 Q .+ 300 518$/);
      });

      if (retraction === 'hidden') {
        harness.style.display = 'none';
        setRect(harness, 0, 0, 0, 0);
      } else {
        harness.remove();
      }
      setRect(held, 12, 520, 32, 32);
      view.rerender(
        <HarnessConvergenceLayer selectedAffinities={{}} harnessBurstKeys={{ flare: 1 }} />,
      );

      await waitFor(() => {
        const transfer = document.querySelector('.causal-motion-layer path');
        expect(transfer?.getAttribute('d')).toMatch(/^M 300 518 Q .+ 28 536$/);
        expect(document.querySelector('.causal-motion-impact')).toHaveStyle({
          left: '28px',
          top: '536px',
        });
      });
    },
  );
});
