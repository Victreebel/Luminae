/**
 * useViewOrchestrator — Smooth view preparation for multi-target Luminary cinematics.
 *
 * Before a multi-target Luminary activation cinematic plays, this hook:
 *   1. Snapshots the current view state (marketCompact + board scrollTop).
 *   2. Fades the market section, switches to Compact View, fades back in.
 *   3. Smooth-scrolls the board to center all affected zones after the layout settles.
 *
 * After the cinematic completes, `restore()` reverses these changes.  Pass
 * `{ immediate: true }` to skip all animations (required on skip/fast-forward paths).
 *
 * Manual view changes are respected with independent semantics:
 *   - `onManualToggle()` — called when the player toggles Compact View.
 *     Only prevents the Compact View portion of restore.
 *   - Non-programmatic board scroll events during orchestration — only prevent
 *     the scroll portion of restore; Compact View restoration is unaffected.
 *
 * Single-target effects skip orchestration entirely.  An effect is
 * "multi-target" when it has >1 distinct entity ID, OR contains a market-wide
 * step (marketRedraw / deckScry), OR combines a source Luminary portal with any
 * entity target.
 */

import { useRef, useCallback } from 'react';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Orchestration model ──────────────────────────────────────────────────────

interface OrchestrationModel {
  /** Unique card / player IDs from targetClaim, keywordEvent(s), scoreChange, crystalReturn. */
  entityIds: Set<string>;
  /** Source Luminary ID extracted from the luminaryPulse step. */
  luminaryId: string | null;
  /** True when marketRedraw or deckScry is present — board-wide / zone-level effect. */
  hasMarketWide: boolean;
}

function buildOrchestrationModel(procedure: AnimationProcedureStep[]): OrchestrationModel {
  const entityIds = new Set<string>();
  let luminaryId: string | null = null;
  let hasMarketWide = false;

  for (const step of procedure) {
    switch (step.type) {
      case 'luminaryPulse':
        luminaryId = step.luminaryId;
        break;
      case 'targetClaim':
        step.targetIds.forEach(id => entityIds.add(id));
        break;
      case 'keywordEvent':
        step.targetIds.forEach(id => entityIds.add(id));
        break;
      case 'reveal':
        step.cardIds.forEach(id => entityIds.add(id));
        break;
      case 'keywordEvents':
        step.events.forEach(ev => ev.targetIds.forEach(id => entityIds.add(id)));
        break;
      case 'scoreChange':
      case 'crystalReturn':
        step.playerIds.forEach(id => entityIds.add(id));
        break;
      case 'marketRedraw':
      case 'deckScry':
        hasMarketWide = true;
        break;
      default:
        break;
    }
  }
  return { entityIds, luminaryId, hasMarketWide };
}

/**
 * Returns true when a procedure spans multiple board zones or targets multiple
 * entities — the threshold above which view orchestration fires.
 *
 * Conditions (any one suffices):
 *   • >1 distinct entity target
 *   • marketRedraw or deckScry present (board-wide multi-slot effect)
 *   • Luminary portal source + any entity target (two distinct zones)
 */
function isMultiTarget(model: OrchestrationModel): boolean {
  if (model.hasMarketWide) return true;
  if (model.entityIds.size > 1) return true;
  if (model.luminaryId !== null && model.entityIds.size >= 1) return true;
  return false;
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves a DOM element for a target entity ID.
 *
 * Selector priority:
 *   1. [data-card-id]       — market card (UUID-like card IDs)
 *   2. [data-luminary-id]   — Luminary portal on the board
 *   3. [data-opponent-chip] — opponent score/crystal panels
 *
 * The local player's affinity well is pinned outside the scroll container
 * (always visible), so it intentionally returns null here.
 */
function resolveEntityElement(id: string): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`) ??
    document.querySelector<HTMLElement>(`[data-luminary-id="${CSS.escape(id)}"]`) ??
    document.querySelector<HTMLElement>(`[data-opponent-chip="${CSS.escape(id)}"]`)
  );
}

/**
 * Expands a bounding box (board-relative, scroll-adjusted) to include `el` if
 * it is a descendant of `board`.
 */
function expandBounds(
  bounds: { top: number; bottom: number } | null,
  el: HTMLElement,
  board: HTMLElement,
  boardRect: DOMRect,
  scrollTop: number,
): { top: number; bottom: number } | null {
  if (!board.contains(el)) return bounds;
  const rect    = el.getBoundingClientRect();
  const elTop    = rect.top    - boardRect.top + scrollTop;
  const elBottom = rect.bottom - boardRect.top + scrollTop;
  if (!bounds) return { top: elTop, bottom: elBottom };
  return {
    top:    Math.min(bounds.top,    elTop),
    bottom: Math.max(bounds.bottom, elBottom),
  };
}

/**
 * Computes the union bounding rect (board-relative) covering:
 *   • All resolved entity targets (cards, luminary portals, opponent chips)
 *   • The source Luminary portal ([data-luminary-id])
 *   • The market section ([data-market-section]) when the effect is market-wide
 *
 * Returns null when no in-scroll-container elements are found (e.g. all targets
 * are pinned fixed panels outside the board).
 */
function computeTargetBounds(
  model: OrchestrationModel,
  board: HTMLElement,
): { top: number; bottom: number } | null {
  const boardRect = board.getBoundingClientRect();
  const scrollTop = board.scrollTop;
  let bounds: { top: number; bottom: number } | null = null;

  // Entity targets (cards, players, etc.)
  for (const id of model.entityIds) {
    const el = resolveEntityElement(id);
    if (el) bounds = expandBounds(bounds, el, board, boardRect, scrollTop);
  }

  // Source Luminary portal (always include for framing)
  if (model.luminaryId) {
    const lumEl = document.querySelector<HTMLElement>(
      `[data-luminary-id="${CSS.escape(model.luminaryId)}"]`,
    );
    if (lumEl) bounds = expandBounds(bounds, lumEl, board, boardRect, scrollTop);
  }

  // Market section for board-wide effects
  if (model.hasMarketWide) {
    const marketEl = document.querySelector<HTMLElement>('[data-market-section]');
    if (marketEl) bounds = expandBounds(bounds, marketEl, board, boardRect, scrollTop);
  }

  return bounds;
}

// ─── Viewport-fit check ───────────────────────────────────────────────────────

/**
 * Returns true when all target elements (entity targets + source Luminary +
 * market section if market-wide) already fit within the board's current scroll
 * viewport, meaning no compact switch or scroll adjustment is needed.
 *
 * Elements outside the scroll container (pinned panels) are ignored — they are
 * always visible and do not require scrolling.
 *
 * A small tolerance (8 px) absorbs sub-pixel rounding from `getBoundingClientRect`.
 */
function elementsAlreadyInView(model: OrchestrationModel, board: HTMLElement): boolean {
  const bounds = computeTargetBounds(model, board);
  // No matching elements inside the scroll container — pinned panels are always
  // visible, so no reframing is required.
  if (!bounds) return true;
  const scrollTop    = board.scrollTop;
  const scrollBottom = scrollTop + board.clientHeight;
  const TOLERANCE    = 8; // px — absorbs sub-pixel rounding
  return bounds.top >= scrollTop - TOLERANCE && bounds.bottom <= scrollBottom + TOLERANCE;
}

// ─── Market section opacity fade ─────────────────────────────────────────────

const FADE_FULL_MS  = 120;
const FADE_SHORT_MS = 40;

/**
 * Brief opacity cross-fade on the market section element during a Compact View
 * layout switch so the snap reflow is visually softened.
 *
 * When `immediate` is true, the action fires synchronously with no animation.
 */
function fadeMarketAndSwitch(
  action: () => void,
  fadeTo: number,
  abridged: boolean,
  immediate: boolean,
): void {
  if (immediate) {
    action();
    return;
  }
  const market = document.querySelector<HTMLElement>('[data-market-section]');
  if (!market) {
    action();
    return;
  }
  const durationMs = abridged ? FADE_SHORT_MS : FADE_FULL_MS;
  market.style.transition = `opacity ${durationMs}ms ease-in-out`;
  market.style.opacity    = String(fadeTo);

  requestAnimationFrame(() => {
    action();
    market.style.opacity = '1';
    const cleanup = setTimeout(() => {
      market.style.transition = '';
      market.style.opacity    = '';
    }, durationMs + 16);
    (market as HTMLElement & { _orchCleanup?: ReturnType<typeof setTimeout> })
      ._orchCleanup = cleanup;
  });
}

// ─── Programmatic-scroll guard ───────────────────────────────────────────────

/**
 * Scrolls the board and holds `isProgrammaticScrollRef.current = true` for the
 * entire duration of the scroll operation — including all intermediate `scroll`
 * events emitted by smooth scrolling.
 *
 * For `behavior: 'smooth'` we use the `scrollend` event (supported in
 * Chrome 114+, Firefox 109+, Safari 17.4+) with a 1.5 s timeout fallback.
 * For instant/unspecified behavior a single rAF is sufficient.
 *
 * The `released` flag prevents double-release when both `scrollend` and the
 * fallback fire.
 */
function programmaticScrollTo(
  board: HTMLElement,
  options: ScrollToOptions,
  isProgrammaticRef: React.MutableRefObject<boolean>,
): void {
  isProgrammaticRef.current = true;
  board.scrollTo(options);

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      isProgrammaticRef.current = false;
    }
  };

  if (options.behavior === 'smooth') {
    // Hold flag until the browser signals scroll completion.
    board.addEventListener('scrollend', release, { once: true });
    // Fallback for any browser gap (e.g. scrollend not fired if already at
    // destination, or on older Safari).
    const fallback = setTimeout(release, 1500);
    // Cancel the fallback if scrollend fires first.
    board.addEventListener('scrollend', () => clearTimeout(fallback), { once: true });
  } else {
    // Instant scroll: one rAF covers the single synchronous scroll event.
    requestAnimationFrame(release);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface RestoreOptions {
  /** When true, all animations are bypassed — required for skip/fast-forward paths. */
  immediate?: boolean;
}

export interface ViewOrchestrator {
  /**
   * Call before mounting the LuminaryActivationCinematic.
   * Snapshots current view state and, if the procedure is multi-target, switches
   * to Compact View and scrolls to center all affected zones.
   */
  prepare: (procedure: AnimationProcedureStep[]) => void;

  /**
   * Call from the cinematic's onComplete.
   * Independently reverts Compact View (unless player toggled it manually) and
   * scroll position (unless player scrolled manually).
   * Pass `{ immediate: true }` from skip/fast-forward paths.
   */
  restore: (options?: RestoreOptions) => void;

  /**
   * Call when the player manually toggles Compact View mid-animation.
   * Prevents restore() from reverting the Compact View state only.
   * Does not affect scroll restoration.
   */
  onManualToggle: () => void;
}

interface UseViewOrchestratorOptions {
  marketCompact: boolean;
  setMarketCompact: React.Dispatch<React.SetStateAction<boolean>>;
  boardRef: React.RefObject<HTMLElement | null>;
  abridgedAnims: boolean;
}

const MEASURE_DELAY_ALREADY_COMPACT_MS = 16;
const MEASURE_DELAY_SWITCHED_MS        = 48;

interface ViewSnapshot {
  marketCompact: boolean;
  scrollTop: number;
}

export function useViewOrchestrator({
  marketCompact,
  setMarketCompact,
  boardRef,
  abridgedAnims,
}: UseViewOrchestratorOptions): ViewOrchestrator {
  // Live refs — callbacks never capture stale props
  const marketCompactRef      = useRef(marketCompact);
  marketCompactRef.current    = marketCompact;
  const setMarketCompactRef   = useRef(setMarketCompact);
  setMarketCompactRef.current = setMarketCompact;
  const boardRefRef    = useRef(boardRef);
  boardRefRef.current  = boardRef;
  const abridgedRef    = useRef(abridgedAnims);
  abridgedRef.current  = abridgedAnims;

  // Per-cinematic state
  const snapshotRef        = useRef<ViewSnapshot | null>(null);
  const modelRef           = useRef<OrchestrationModel | null>(null);
  const didSwitchCompact   = useRef(false);

  // Independent override flags — separate semantics for compact vs. scroll.
  // playerToggledCompact: set only by onManualToggle(); prevents compact restore.
  // playerScrolled: set by non-programmatic scroll event; prevents scroll restore only.
  const playerToggledCompactRef = useRef(false);
  const playerScrolledRef       = useRef(false);

  // True while a programmatic board.scrollTo() is in progress — suppresses
  // the scroll-override flag for ALL frames of a smooth scroll sequence.
  const isProgrammaticScrollRef = useRef(false);

  // Timer for deferred scroll-centering
  const scrollTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Scroll listener cleanup
  const scrollListenerRef = useRef<(() => void) | null>(null);

  const removeScrollListener = useCallback(() => {
    scrollListenerRef.current?.();
    scrollListenerRef.current = null;
  }, []);

  const resetPerCinematic = useCallback(() => {
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    removeScrollListener();
    snapshotRef.current            = null;
    modelRef.current               = null;
    didSwitchCompact.current       = false;
    playerToggledCompactRef.current = false;
    playerScrolledRef.current       = false;
    isProgrammaticScrollRef.current = false;
  }, [removeScrollListener]);

  const prepare = useCallback((procedure: AnimationProcedureStep[]) => {
    resetPerCinematic();

    const model = buildOrchestrationModel(procedure);

    // Single-target effects — no orchestration needed
    if (!isMultiTarget(model)) return;

    const currentCompact = marketCompactRef.current;
    const board          = boardRefRef.current.current;

    // Viewport-fit bypass: if all target elements are already visible in the
    // current scroll viewport, there is nothing to reframe — skip orchestration
    // entirely regardless of whether compact mode is on or off.
    if (board && elementsAlreadyInView(model, board)) return;

    snapshotRef.current = {
      marketCompact: currentCompact,
      scrollTop:     board?.scrollTop ?? 0,
    };
    modelRef.current = model;

    // ── Attach scroll-override listener ───────────────────────────────────
    // Non-programmatic scroll during the orchestration window: player is
    // manually reframing → suppress scroll restore only (not compact restore).
    if (board) {
      const handleScroll = () => {
        if (!isProgrammaticScrollRef.current && snapshotRef.current !== null) {
          playerScrolledRef.current = true;
        }
      };
      board.addEventListener('scroll', handleScroll, { passive: true });
      scrollListenerRef.current = () =>
        board.removeEventListener('scroll', handleScroll);
    }

    // ── Switch to Compact View if needed (with opacity fade) ──────────────
    if (!currentCompact) {
      didSwitchCompact.current = true;
      fadeMarketAndSwitch(
        () => setMarketCompactRef.current(true),
        0.45,
        abridgedRef.current,
        false, // never immediate on entry
      );
    }

    // ── Deferred scroll-centering ─────────────────────────────────────────
    // Fires after the layout settles. Full mode: smooth scroll.
    // Abridged mode: instant scroll (still centers — no skip).
    if (board) {
      const delayMs = currentCompact
        ? MEASURE_DELAY_ALREADY_COMPACT_MS
        : MEASURE_DELAY_SWITCHED_MS;
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null;
        if (playerScrolledRef.current || !modelRef.current) return;
        const bounds = computeTargetBounds(modelRef.current, board);
        const behavior: ScrollBehavior = abridgedRef.current ? 'instant' : 'smooth';
        if (!bounds) {
          // All targets are pinned outside the scroll container — show market top.
          programmaticScrollTo(board, { top: 0, behavior }, isProgrammaticScrollRef);
          return;
        }
        const boardHeight    = board.clientHeight;
        const targetHeight   = bounds.bottom - bounds.top;
        const idealScrollTop = bounds.top - (boardHeight - targetHeight) / 2;
        programmaticScrollTo(
          board,
          { top: Math.max(0, idealScrollTop), behavior },
          isProgrammaticScrollRef,
        );
      }, delayMs);
    }
  }, [resetPerCinematic]);

  const restore = useCallback((options?: RestoreOptions) => {
    const immediate = options?.immediate ?? false;

    removeScrollListener();
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (!snapshotRef.current) return;

    const playerToggledCompact = playerToggledCompactRef.current;
    const playerScrolled       = playerScrolledRef.current;
    const { marketCompact: wasCompact, scrollTop: savedScroll } = snapshotRef.current;

    // Clear per-cinematic state before async effects fire below
    snapshotRef.current             = null;
    modelRef.current                = null;
    playerToggledCompactRef.current = false;
    playerScrolledRef.current       = false;

    // Restore Compact View — suppressed only by explicit compact toggle, not by scroll.
    if (didSwitchCompact.current && !wasCompact && !playerToggledCompact) {
      didSwitchCompact.current = false;
      fadeMarketAndSwitch(
        () => setMarketCompactRef.current(false),
        0.45,
        abridgedRef.current,
        immediate,
      );
    }

    // Restore scroll position — suppressed only by manual scroll, not by compact toggle.
    if (!playerScrolled) {
      const board = boardRefRef.current.current;
      if (board) {
        const behavior: ScrollBehavior = immediate ? 'instant'
          : abridgedRef.current        ? 'instant'
          : 'smooth';
        programmaticScrollTo(board, { top: savedScroll, behavior }, isProgrammaticScrollRef);
      }
    }
  }, [removeScrollListener]);

  const onManualToggle = useCallback(() => {
    // Only suppress compact restore — does not affect scroll restoration.
    if (snapshotRef.current !== null) {
      playerToggledCompactRef.current = true;
    }
  }, []);

  return { prepare, restore, onManualToggle };
}
