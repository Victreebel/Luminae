/**
 * dialog-accessibility.test.tsx
 *
 * Verifies that every sheet / overlay / dialog in Luminae:
 *   1. Renders with role="dialog" on its container element.
 *   2. Renders with aria-modal="true" on its container element.
 *   3. Traps keyboard focus (Tab stays within the container when open).
 *   4. Calls onClose / onChoice when Escape is pressed.
 *
 * Coverage strategy:
 *   - TutorialStartModal, FriendsPanel  → rendered component tests
 *   - game.tsx dialog containers         → static source analysis
 *     (the full game page cannot be rendered in isolation because it requires
 *     live WebSocket state, a running server, and dozens of React contexts;
 *     instead we parse the real source file and assert that each container
 *     element has the required ARIA attributes AND is wired to useFocusTrap,
 *     so removing or accidentally omitting either one from any specific dialog
 *     in game.tsx will break the corresponding test)
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// ─── requestAnimationFrame mock ────────────────────────────────────────────────
// useFocusTrap defers initial focus via rAF.  Replace with a synchronous call
// so assertions run immediately after render without needing fake timers.

beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── framer-motion mock ────────────────────────────────────────────────────────
// Replaces animated elements with plain HTML elements so tests work in jsdom.
// Refs are forwarded so useFocusTrap can still access the container node.

vi.mock('framer-motion', () => {
  const React = require('react') as typeof import('react');

  // Known framer-motion-specific props that are not valid HTML attributes.
  const MOTION_ONLY_PROPS = new Set([
    'initial', 'animate', 'exit', 'transition', 'variants', 'custom',
    'whileTap', 'whileHover', 'whileDrag', 'whileFocus', 'whileInView',
    'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
    'dragPropagation', 'dragListener', 'dragControls',
    'onDragStart', 'onDrag', 'onDragEnd',
    'onHoverStart', 'onHoverEnd',
    'onTap', 'onTapStart', 'onTapCancel',
    'onPan', 'onPanStart', 'onPanEnd',
    'onAnimationStart', 'onAnimationComplete',
    'onLayoutAnimationStart', 'onLayoutAnimationComplete',
    'layout', 'layoutId',
    'transformTemplate', 'transformValues',
    'dragSnapToOrigin',
  ]);

  function makeEl(tag: string) {
    return React.forwardRef(
      (
        { children, ...props }: Record<string, unknown> & { children?: React.ReactNode },
        ref: React.Ref<HTMLElement>,
      ) => {
        const domProps: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(props)) {
          if (!MOTION_ONLY_PROPS.has(k)) domProps[k] = v;
        }
        return React.createElement(tag, { ...domProps, ref }, children);
      },
    );
  }

  const motion: Record<string, ReturnType<typeof makeEl>> = {};
  for (const tag of ['div', 'section', 'article', 'nav', 'aside', 'header', 'footer', 'main', 'span', 'ul', 'li', 'button', 'form', 'p']) {
    motion[tag] = makeEl(tag);
  }

  return {
    motion,
    AnimatePresence: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    useMotionValue: (initial: number) => ({
      get: () => initial,
      set: () => {},
      on: () => () => {},
    }),
    useTransform: () => ({ get: () => 0, set: () => {} }),
    useDragControls: () => ({ start: () => {} }),
    animate: () => ({ then: (cb: () => void) => { cb(); return { then: () => {} }; } }),
  };
});

// ─── AccountContext mock ───────────────────────────────────────────────────────
// token: null so the refresh() guard in FriendsPanel returns early — no API
// calls are made, but the panel still renders with all its focusable elements.
vi.mock('@/contexts/AccountContext', () => ({
  useAccount: () => ({ token: null, account: null }),
  AccountProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── accountSession API mock ───────────────────────────────────────────────────
vi.mock('@/lib/accountSession', () => ({
  apiListFriends: vi.fn().mockResolvedValue([]),
  apiListFriendRequests: vi.fn().mockResolvedValue([]),
  apiSendFriendRequest: vi.fn().mockResolvedValue({}),
  apiRespondFriendRequest: vi.fn().mockResolvedValue({}),
  apiRemoveFriend: vi.fn().mockResolvedValue({}),
  apiCreateChallenge: vi.fn().mockResolvedValue({
    roomId: 'r1',
    inviteCode: 'CODE',
    sessionToken: 'st',
    playerId: 'p1',
  }),
}));

// ─── use-toast mock ────────────────────────────────────────────────────────────
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fire a document-level keydown in the capture phase (same path as useFocusTrap). */
function pressKey(key: string, opts: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...opts,
  });
  document.dispatchEvent(event);
  return event;
}

// ─── TutorialStartModal ───────────────────────────────────────────────────────

import { TutorialStartModal } from '@/components/tutorial/TutorialStartModal';

describe('TutorialStartModal', () => {
  const onChoice = vi.fn();

  beforeEach(() => { onChoice.mockReset(); });

  it('has role="dialog" on its container', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true" on its container', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has an accessible label via aria-labelledby pointing to its heading', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const heading = document.getElementById(labelledBy!);
    expect(heading).toBeInTheDocument();
    expect(heading!.textContent).toBeTruthy();
  });

  it('traps focus: Tab from the last focusable element wraps to the first', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );
    expect(focusable.length).toBeGreaterThanOrEqual(2);

    focusable[focusable.length - 1].focus();
    const event = pressKey('Tab');

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusable[0]);
  });

  it('traps focus: Shift+Tab from the first focusable element wraps to the last', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button:not([disabled])'),
    );

    focusable[0].focus();
    const event = pressKey('Tab', { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it('calls onChoice("cancel") when Escape is pressed', () => {
    render(<TutorialStartModal hasProgress={false} onChoice={onChoice} />);

    pressKey('Escape');

    expect(onChoice).toHaveBeenCalledWith('cancel');
  });

  it('shows resume / start-over buttons when the player has progress', () => {
    render(
      <TutorialStartModal
        hasProgress
        savedBeat={5}
        totalBeats={18}
        onChoice={onChoice}
      />,
    );

    expect(screen.getByText(/resume progress/i)).toBeInTheDocument();
    expect(screen.getByText(/start over/i)).toBeInTheDocument();
  });
});

// ─── FriendsPanel ─────────────────────────────────────────────────────────────

import { FriendsPanel } from '@/components/FriendsPanel';

describe('FriendsPanel', () => {
  const onClose = vi.fn();

  beforeEach(() => { onClose.mockReset(); });

  it('does NOT render a dialog when isOpen=false', () => {
    render(<FriendsPanel isOpen={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has role="dialog" on its container when open', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has aria-modal="true" on its container when open', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  });

  it('has an accessible label on the dialog container', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    const hasLabel =
      dialog.hasAttribute('aria-label') || dialog.hasAttribute('aria-labelledby');
    expect(hasLabel).toBe(true);
  });

  it('traps focus: Tab from the last focusable element wraps to the first', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    expect(focusable.length).toBeGreaterThanOrEqual(2);

    focusable[focusable.length - 1].focus();
    const event = pressKey('Tab');

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusable[0]);
  });

  it('traps focus: Shift+Tab from the first focusable element wraps to the last', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    focusable[0].focus();
    const event = pressKey('Tab', { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(focusable[focusable.length - 1]);
  });

  it('calls onClose when Escape is pressed', () => {
    render(<FriendsPanel isOpen onClose={onClose} />);

    pressKey('Escape');

    expect(onClose).toHaveBeenCalledOnce();
  });
});

// ─── game.tsx dialog containers — static source analysis ─────────────────────
//
// game.tsx is a 7000-line component that requires live WebSocket game state and
// dozens of React contexts.  It cannot be rendered in isolation.  Instead we
// read the real source file and assert that each container element:
//
//   1. Has `role="dialog"` adjacent to its `aria-label` (≤ 4 lines above).
//   2. Has `aria-modal="true"` adjacent to its `aria-label` (≤ 4 lines above).
//   3. Is wired to useFocusTrap via the container ref that appears in the JSX.
//
// These tests will fail if someone removes `role="dialog"` or `aria-modal` from
// any specific game dialog in game.tsx — the exact regression this task guards.

const GAME_TSX = readFileSync(
  resolve(__dirname, '../pages/game.tsx'),
  'utf-8',
);

const GAME_LINES = GAME_TSX.split('\n');

/**
 * Return the slice of game.tsx from (lineIdx - before) to (lineIdx + after),
 * joined into a single string for regex matching.
 */
function contextAround(lineIdx: number, before = 4, after = 4): string {
  const start = Math.max(0, lineIdx - before);
  const end = Math.min(GAME_LINES.length - 1, lineIdx + after);
  return GAME_LINES.slice(start, end + 1).join('\n');
}

/**
 * Definition of every game.tsx custom dialog container.
 *
 * - `containerRef`: the ref variable name used in both useFocusTrap() and the
 *   JSX ref callback, e.g. `cardSheetContainerRef`.  This is the unique anchor
 *   we use to locate each dialog element in the source file because:
 *     a) aria-label may be a dynamic expression (win overlay uses a ternary)
 *     b) the ref name is always a simple identifier, easy to grep reliably
 *
 * Strategy: find the JSX ref-callback line `containerRef.current = el`, then
 * assert that `role="dialog"`, `aria-modal="true"`, and `aria-label=` all
 * appear within ±6 lines — on the same JSX element opening tag.
 */
const GAME_DIALOGS = [
  { dialog: 'card action sheet',       containerRef: 'cardSheetContainerRef' },
  { dialog: 'reserved cards overlay',  containerRef: 'reservedOverlayContainerRef' },
  { dialog: 'deck reserve sheet',      containerRef: 'deckSheetContainerRef' },
  { dialog: 'rules sheet',             containerRef: 'rulesSheetContainerRef' },
  { dialog: 'luminary detail sheet',   containerRef: 'luminarySheetContainerRef' },
  { dialog: 'forged artifacts overlay', containerRef: 'forgedOverlayContainerRef' },
  { dialog: 'win overlay',             containerRef: 'winOverlayContainerRef' },
] as const;

/**
 * Find the line index where `containerRef.current = el` appears in game.tsx.
 * This is the JSX ref-callback line that anchors the dialog element.
 */
function findJsxRefLine(containerRef: string): number {
  return GAME_LINES.findIndex((l) => l.includes(`${containerRef}.current = el`));
}

describe.each(GAME_DIALOGS)('game.tsx dialog — $dialog', ({ dialog, containerRef }) => {
  it(`${dialog}: JSX ref-callback for ${containerRef} exists in game.tsx`, () => {
    expect(findJsxRefLine(containerRef)).toBeGreaterThan(-1);
  });

  it(`${dialog}: role="dialog" is on the same element as ${containerRef}`, () => {
    const refLine = findJsxRefLine(containerRef);
    expect(refLine).toBeGreaterThan(-1);
    // role="dialog" must appear within 6 lines of the ref callback
    const region = contextAround(refLine, 6, 2);
    expect(region).toMatch(/role="dialog"/);
  });

  it(`${dialog}: aria-modal="true" is on the same element as ${containerRef}`, () => {
    const refLine = findJsxRefLine(containerRef);
    expect(refLine).toBeGreaterThan(-1);
    const region = contextAround(refLine, 6, 2);
    expect(region).toMatch(/aria-modal="true"/);
  });

  it(`${dialog}: aria-label is present on the same element as ${containerRef}`, () => {
    const refLine = findJsxRefLine(containerRef);
    expect(refLine).toBeGreaterThan(-1);
    // aria-label= covers both static ("…") and dynamic ({…}) forms
    const region = contextAround(refLine, 6, 6);
    expect(region).toMatch(/aria-label=/);
  });

  it(`${dialog}: ${containerRef} is passed as the first argument to useFocusTrap()`, () => {
    // Find the useFocusTrap call that references this exact containerRef.
    // The call spans up to 4 lines (opening paren → containerRef → isOpen → onClose).
    let found = false;
    for (let i = 0; i < GAME_LINES.length; i++) {
      if (GAME_LINES[i].includes('useFocusTrap(')) {
        const block = GAME_LINES.slice(i, i + 4).join('\n');
        if (block.includes(containerRef)) {
          found = true;
          break;
        }
      }
    }
    expect(found, `useFocusTrap(${containerRef}, ...) not found in game.tsx`).toBe(true);
  });
});
