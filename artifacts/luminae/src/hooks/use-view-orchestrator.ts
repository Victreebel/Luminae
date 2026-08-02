/**
 * useViewOrchestrator — Smooth view preparation for Luminary cinematics.
 *
 * Before a Luminary activation cinematic plays, this hook:
 *   1. Snapshots the current view state (forgeCompact + board scrollTop).
 *   2. Keeps Full View when every Forge mold and Archive can fit together.
 *   3. Otherwise fades the Forge, switches to Compact View, then fades back in.
 *   4. Smooth-scrolls the board to frame the complete Forge after layout settles.
 *
 * A Luminary sequence may span several cinematics and aftermath effects. Call
 * `beginSequence()` once before that chain and `endSequence()` after its final
 * effect. Intermediate `restore()` calls then end local camera work without
 * restoring the player's view; the original snapshot is restored exactly once.
 *
 * Manual view changes are respected with independent semantics:
 *   - `onManualToggle()` — called when the player toggles Compact View.
 *     Only prevents the Compact View portion of restore.
 *   - Non-programmatic board scroll events during orchestration — only prevent
 *     the scroll portion of restore; Compact View restoration is unaffected.
 *
 * This complete-Forge rule is independent of effect target count. Luminary
 * presentations may interrupt the normal view, but always restore it afterward.
 */

import { useRef, useCallback, useEffect, useState } from 'react';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Orchestration model ──────────────────────────────────────────────────────

interface OrchestrationModel {
  /** Unique Artifact/player IDs from claims, keyword events, Eminence changes, or Affinity returns. */
  entityIds: Set<string>;
  /** Source Luminary ID extracted from the luminaryPulse step. */
  luminaryId: string | null;
  /** True when a compatibility `forgeRefill` or `deckScry` step affects the full Forge. */
  hasForgeWide: boolean;
  /**
   * True when any targetClaim step is present — indicates a brand-strike or
   * card-condemning effect where the full Forge should stay in view so every
   * tier is visible during the burn animation, regardless of how many cards
   * are condemned.
   */
  hasTargetClaim: boolean;
}

function buildOrchestrationModel(procedure: AnimationProcedureStep[]): OrchestrationModel {
  const entityIds = new Set<string>();
  let luminaryId: string | null = null;
  let hasForgeWide = false;
  let hasTargetClaim = false;

  for (const step of procedure) {
    switch (step.type) {
      case 'luminaryPulse':
        luminaryId = step.luminaryId;
        break;
      case 'targetClaim':
        hasTargetClaim = true;
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
      case 'eminenceChange':
      case 'affinityReturn':
        step.playerIds.forEach(id => entityIds.add(id));
        break;
      case 'forgeRefill':
      case 'deckScry':
      case 'archiveReturn':
        hasForgeWide = true;
        break;
      default:
        break;
    }
  }
  return { entityIds, luminaryId, hasForgeWide, hasTargetClaim };
}

// ─── DOM helpers ─────────────────────────────────────────────────────────────

/**
 * Resolves a DOM element for a target entity ID.
 *
 * Selector priority:
 *   1. [data-card-id]       — Artifact in the Forge (UUID-like card IDs)
 *   2. [data-luminary-id]   — Luminary portal on the board
 *   3. [data-opponent-chip] — opponent Eminence/Affinity panels
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
 *   • The Forge section ([data-forge-section]) when the effect is Forge-wide
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

  // Forge section for board-wide effects
  if (model.hasForgeWide) {
    const forgeEl = document.querySelector<HTMLElement>('[data-forge-section]');
    if (forgeEl) bounds = expandBounds(bounds, forgeEl, board, boardRect, scrollTop);
  }

  // Brand-strike / card-condemning effects: expand to the 3-tier card grid
  // ([data-forge-tiers]) so the camera frames all three tiers, not the full
  // Forge section (which includes the Luminary portal strip above and would
  // push Tier 1 off the bottom of the viewport).
  if (model.hasTargetClaim && !model.hasForgeWide) {
    const tiersEl = document.querySelector<HTMLElement>('[data-forge-tiers]');
    if (tiersEl) bounds = expandBounds(bounds, tiersEl, board, boardRect, scrollTop);
  }

  return bounds;
}

interface ForgeBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function forgeBoundsFitViewport(
  bounds: ForgeBounds,
  viewport: { width: number; height: number },
  safePad = 12,
): boolean {
  const heightFits = bounds.bottom - bounds.top <= viewport.height - 2 * safePad;
  const widthFits = (
    bounds.right - bounds.left <= viewport.width - 2 * safePad &&
    bounds.left >= safePad &&
    bounds.right <= viewport.width - safePad
  );
  return heightFits && widthFits;
}

export function forgeCameraScrollTop(
  bounds: Pick<ForgeBounds, 'top' | 'bottom'>,
  viewportHeight: number,
  safePad = 12,
): number {
  const forgeHeight = bounds.bottom - bounds.top;
  if (forgeHeight <= viewportHeight - 2 * safePad) {
    return Math.max(0, bounds.top - (viewportHeight - forgeHeight) / 2);
  }
  return Math.max(0, bounds.top - safePad);
}

/**
 * Measures all twelve Forge molds plus the three Archives as one camera subject.
 * Empty molds still participate, so sparse rows cannot produce a false fit.
 */
function computeFullForgeBounds(board: HTMLElement): ForgeBounds | null {
  const tiers = document.querySelector<HTMLElement>('[data-forge-tiers]');
  if (!tiers || !board.contains(tiers)) return null;

  const elements = Array.from(
    tiers.querySelectorAll<HTMLElement>('[data-slot-key], [data-deck-tier]'),
  ).filter((el) => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
  });
  if (elements.length === 0) return null;

  const boardRect = board.getBoundingClientRect();
  const scrollTop = board.scrollTop;
  return elements.reduce<ForgeBounds>((bounds, el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: Math.min(bounds.top, rect.top - boardRect.top + scrollTop),
      bottom: Math.max(bounds.bottom, rect.bottom - boardRect.top + scrollTop),
      left: Math.min(bounds.left, rect.left - boardRect.left),
      right: Math.max(bounds.right, rect.right - boardRect.left),
    };
  }, {
    top: Number.POSITIVE_INFINITY,
    bottom: Number.NEGATIVE_INFINITY,
    left: Number.POSITIVE_INFINITY,
    right: Number.NEGATIVE_INFINITY,
  });
}

function fullForgeFitsIfScrolled(board: HTMLElement): boolean {
  const bounds = computeFullForgeBounds(board);
  if (!bounds) return false;
  return forgeBoundsFitViewport(
    bounds,
    { width: board.clientWidth, height: board.clientHeight },
  );
}

// ─── Forge section opacity fade ──────────────────────────────────────────────

const FADE_FULL_MS  = 120;
const FADE_SHORT_MS = 40;

/**
 * Brief opacity cross-fade on the Forge section during a Compact View
 * layout switch so the snap reflow is visually softened.
 *
 * When `immediate` is true, the action fires synchronously with no animation.
 */
function fadeForgeAndSwitch(
  action: () => void,
  fadeTo: number,
  abridged: boolean,
  immediate: boolean,
  onComplete?: () => void,
): void {
  if (immediate) {
    action();
    onComplete?.();
    return;
  }
  const forge = document.querySelector<HTMLElement>('[data-forge-section]');
  if (!forge) {
    action();
    onComplete?.();
    return;
  }
  const forgeWithCleanup = forge as HTMLElement & {
    _orchCleanup?: ReturnType<typeof setTimeout>;
  };
  if (forgeWithCleanup._orchCleanup) {
    clearTimeout(forgeWithCleanup._orchCleanup);
    forgeWithCleanup._orchCleanup = undefined;
  }
  const durationMs = abridged ? FADE_SHORT_MS : FADE_FULL_MS;
  forge.style.transition = `opacity ${durationMs}ms ease-in-out`;
  forge.style.opacity    = String(fadeTo);

  requestAnimationFrame(() => {
    action();
    forge.style.opacity = '1';
    const cleanup = setTimeout(() => {
      forge.style.transition = '';
      forge.style.opacity    = '';
      forgeWithCleanup._orchCleanup = undefined;
      onComplete?.();
    }, durationMs + 16);
    forgeWithCleanup._orchCleanup = cleanup;
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
  onComplete?: () => void,
): void {
  isProgrammaticRef.current = true;
  board.scrollTo(options);

  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      isProgrammaticRef.current = false;
      onComplete?.();
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

export interface PrepareOptions {
  /**
   * When true, bypasses both the `isMultiTarget` guard and the `elementsAlreadyInView`
   * early-exit, forcing a snapshot + compact switch + centering scroll regardless of
   * how many targets are present or whether they are already visible.
   *
   * Use for brand-strike orchestration: every brand strike should hold compact view
   * and center on the affected cards for its full duration, even when there is only
   * one target card and it happens to be in the current viewport.
   */
  forceOrchestrate?: boolean;

  /**
   * When true, signals that compact view is already on from a prior orchestration
   * session that intentionally skipped its restore() so the camera would stay held
   * across a phase boundary (e.g. activation cinematic → brand-strike burn).
   *
   * prepare() will NOT switch compact (it is already on), but it will record the
   * restore obligation so that when this session's restore() fires, the view returns
   * to non-compact — exactly as if THIS session had initiated the compact switch.
   *
   * Only meaningful when `currentCompact` is true at call time.
   */
  inheritCompact?: boolean;
}

export interface ViewOrchestrator {
  /**
   * Acquires sequence-level ownership of the camera. The first view snapshot is
   * retained across every prepare()/restore() pair until endSequence() releases it.
   */
  beginSequence: () => void;

  /**
   * Releases sequence ownership and performs the one final view restoration.
   */
  endSequence: (options?: RestoreOptions) => void;

  /**
   * Call before mounting the LuminaryActivationCinematic.
   * Snapshots current view state and, if the procedure is multi-target, switches
   * to Compact View and scrolls to center all affected zones.
   */
  prepare: (procedure: AnimationProcedureStep[], onSettled?: () => void, options?: PrepareOptions) => void;

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

  /**
   * True from the moment prepare() commits a snapshot until restore() is called.
   * Use to lock player-facing action buttons and UI controls for the duration of
   * a brand-strike or activation cinematic so clicks don't race with programmatic
   * scroll / layout changes.
   */
  isOrchestrating: boolean;

  /** True only while the saved pre-sequence view is being restored. */
  isRestoring: boolean;

  /**
   * True for the complete Luminary presentation chain, including pauses between
   * individual camera moves, aftermath effects, and delayed payoffs.
   */
  isSequenceActive: boolean;
}

interface UseViewOrchestratorOptions {
  forgeCompact: boolean;
  setForgeCompact: React.Dispatch<React.SetStateAction<boolean>>;
  boardRef: React.RefObject<HTMLElement | null>;
  abridgedAnims: boolean;
}

const MEASURE_DELAY_ALREADY_COMPACT_MS = 16;
const MEASURE_DELAY_SWITCHED_MS        = 48;

interface ViewSnapshot {
  forgeCompact: boolean;
  scrollTop: number;
}

export function useViewOrchestrator({
  forgeCompact,
  setForgeCompact,
  boardRef,
  abridgedAnims,
}: UseViewOrchestratorOptions): ViewOrchestrator {
  // Live refs — callbacks never capture stale props
  const forgeCompactRef      = useRef(forgeCompact);
  forgeCompactRef.current    = forgeCompact;
  const setForgeCompactRef   = useRef(setForgeCompact);
  setForgeCompactRef.current = setForgeCompact;
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

  // Exposed to callers so they can lock player actions during orchestration.
  const [isOrchestrating, setIsOrchestrating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isSequenceActive, setIsSequenceActive] = useState(false);
  const sequenceActiveRef = useRef(false);
  const pendingSequenceRestoreRef = useRef<RestoreOptions | null>(null);

  const removeScrollListener = useCallback(() => {
    scrollListenerRef.current?.();
    scrollListenerRef.current = null;
  }, []);

  const resetCameraMotion = useCallback(() => {
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    removeScrollListener();
    const forge = document.querySelector<HTMLElement>('[data-forge-section]') as
      | (HTMLElement & { _orchCleanup?: ReturnType<typeof setTimeout> })
      | null;
    if (forge?._orchCleanup) {
      clearTimeout(forge._orchCleanup);
      forge._orchCleanup = undefined;
      forge.style.transition = '';
      forge.style.opacity = '';
    }
    modelRef.current               = null;
    isProgrammaticScrollRef.current = false;
  }, [removeScrollListener]);

  const resetPerCinematic = useCallback(() => {
    resetCameraMotion();
    snapshotRef.current             = null;
    didSwitchCompact.current        = false;
    playerToggledCompactRef.current = false;
    playerScrolledRef.current       = false;
  }, [resetCameraMotion]);

  const beginSequence = useCallback(() => {
    if (sequenceActiveRef.current) return;
    sequenceActiveRef.current = true;
    pendingSequenceRestoreRef.current = null;
    setIsSequenceActive(true);

    // A prepare() may have acquired the camera just before React exposed the
    // presentation state. Preserve that snapshot; otherwise capture the baseline now.
    if (!snapshotRef.current) {
      const board = boardRefRef.current.current;
      if (board) {
        snapshotRef.current = {
          forgeCompact: forgeCompactRef.current,
          scrollTop: board.scrollTop,
        };
      }
    }
  }, []);

  const prepare = useCallback((procedure: AnimationProcedureStep[], onSettled?: () => void, options?: PrepareOptions) => {
    setIsRestoring(false);
    if (sequenceActiveRef.current) {
      // Keep the sequence's original snapshot and accumulated Compact restore
      // obligation while replacing only the active camera move.
      resetCameraMotion();
    } else {
      resetPerCinematic();
    }

    // onSettled fires exactly once, after the view has settled (or immediately
    // on any bypass path). Callers use it to capture fresh DOM rects only after
    // the compact switch + centering scroll have completed.
    let settledFired = false;
    const fireSettled = () => {
      if (settledFired) return;
      settledFired = true;
      onSettled?.();
    };

    const model = buildOrchestrationModel(procedure);
    const currentCompact = forgeCompactRef.current;
    const board          = boardRefRef.current.current;

    if (!board) {
      fireSettled();
      return;
    }

    // Full View survives only when all twelve molds and all three Archives fit
    // together after a vertical camera move. Otherwise the cinematic borrows
    // Compact View, regardless of how many entities the effect targets.
    const canFrameWithoutCompact =
      !currentCompact && fullForgeFitsIfScrolled(board);

    // Past all guards — take ownership of the view.
    setIsOrchestrating(true);

    if (!snapshotRef.current) {
      snapshotRef.current = {
        forgeCompact: currentCompact,
        scrollTop: board.scrollTop,
      };
    }
    modelRef.current = model;
    // Compact reflow can clamp scrollTop and emit a synthetic scroll event.
    // Treat the entire preparation window as camera-owned so that reflow cannot
    // masquerade as a player override and cancel the required centering move.
    isProgrammaticScrollRef.current = true;

    // A sequence lease forbids manual camera takeover. Outside a sequence, retain
    // the legacy independent override behavior for standalone orchestration.
    if (board && !sequenceActiveRef.current) {
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
    const shouldSwitchCompact = !currentCompact && !canFrameWithoutCompact;
    if (shouldSwitchCompact) {
      didSwitchCompact.current = true;
      fadeForgeAndSwitch(
        () => setForgeCompactRef.current(true),
        0.45,
        abridgedRef.current,
        false, // never immediate on entry
      );
    } else if (options?.inheritCompact) {
      // Compact is already on because a prior session (activation cinematic)
      // switched it and intentionally skipped its restore() to avoid a
      // premature zoom-in between phases.  Record the owed restore so that
      // THIS session's restore() will un-compact at the end — as if we had
      // initiated the compact switch ourselves.
      didSwitchCompact.current = true;
      snapshotRef.current!.forgeCompact = false;
    }

    // ── Deferred scroll-centering ─────────────────────────────────────────
    // Fires after the layout settles. Full mode: smooth scroll.
    // Abridged mode: instant scroll (still centers — no skip).
    if (board) {
      const delayMs = currentCompact || !shouldSwitchCompact
        ? MEASURE_DELAY_ALREADY_COMPACT_MS
        : MEASURE_DELAY_SWITCHED_MS;
      scrollTimerRef.current = setTimeout(() => {
        scrollTimerRef.current = null;
        if (playerScrolledRef.current || !modelRef.current) {
          // Player took over, or model cleared — no programmatic scroll will
          // fire, so settle now against the current view.
          fireSettled();
          return;
        }
        const forgeBounds = computeFullForgeBounds(board);
        const targetBounds = computeTargetBounds(modelRef.current, board);
        const bounds = forgeBounds ?? (
          targetBounds
            ? { ...targetBounds, left: 0, right: board.clientWidth }
            : null
        );
        const behavior: ScrollBehavior = abridgedRef.current ? 'instant' : 'smooth';
        if (!bounds) {
          // The Forge has not mounted yet; preserve the safest deterministic view.
          programmaticScrollTo(board, { top: 0, behavior }, isProgrammaticScrollRef, fireSettled);
          return;
        }
        // Center a fitting Forge; on extremely constrained Compact View, anchor
        // Tier III at the top rather than presenting an unstable partial center.
        const idealScrollTop = forgeCameraScrollTop(bounds, board.clientHeight);

        programmaticScrollTo(
          board,
          { top: Math.max(0, idealScrollTop), behavior },
          isProgrammaticScrollRef,
          fireSettled,
        );
      }, delayMs);
    } else {
      // No board ref — nothing to reframe; settle immediately.
      fireSettled();
    }
  }, [resetCameraMotion, resetPerCinematic]);

  const restoreNow = useCallback((options?: RestoreOptions) => {
    const immediate = options?.immediate ?? false;

    removeScrollListener();
    if (scrollTimerRef.current !== null) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }

    if (!snapshotRef.current) {
      setIsOrchestrating(false);
      setIsRestoring(false);
      return;
    }

    const playerToggledCompact = playerToggledCompactRef.current;
    const playerScrolled       = playerScrolledRef.current;
    const { forgeCompact: wasCompact, scrollTop: savedScroll } = snapshotRef.current;

    // Clear per-cinematic state before async effects fire below
    snapshotRef.current             = null;
    modelRef.current                = null;
    playerToggledCompactRef.current = false;
    playerScrolledRef.current       = false;

    let pendingRestoreOperations = 0;
    let operationsScheduled = false;
    const startRestoreOperation = () => {
      pendingRestoreOperations += 1;
      setIsOrchestrating(true);
      setIsRestoring(true);
    };
    const finishRestoreOperation = () => {
      pendingRestoreOperations = Math.max(0, pendingRestoreOperations - 1);
      if (operationsScheduled && pendingRestoreOperations === 0) {
        setIsOrchestrating(false);
        setIsRestoring(false);
      }
    };

    // Restore Compact View — suppressed only by explicit compact toggle, not by scroll.
    if (didSwitchCompact.current && !wasCompact && !playerToggledCompact) {
      startRestoreOperation();
      didSwitchCompact.current = false;
      fadeForgeAndSwitch(
        () => setForgeCompactRef.current(false),
        0.45,
        abridgedRef.current,
        immediate,
        finishRestoreOperation,
      );
    }

    // Restore scroll position — suppressed only by manual scroll, not by compact toggle.
    if (!playerScrolled) {
      const board = boardRefRef.current.current;
      if (board) {
        startRestoreOperation();
        const behavior: ScrollBehavior = immediate ? 'instant'
          : abridgedRef.current        ? 'instant'
          : 'smooth';
        programmaticScrollTo(
          board,
          { top: savedScroll, behavior },
          isProgrammaticScrollRef,
          finishRestoreOperation,
        );
      }
    }
    operationsScheduled = true;
    if (pendingRestoreOperations === 0) {
      setIsOrchestrating(false);
      setIsRestoring(false);
    }
  }, [removeScrollListener]);

  const restore = useCallback((options?: RestoreOptions) => {
    if (sequenceActiveRef.current) {
      pendingSequenceRestoreRef.current = {
        immediate:
          (pendingSequenceRestoreRef.current?.immediate ?? false) ||
          (options?.immediate ?? false),
      };
      setIsOrchestrating(false);
      resetCameraMotion();
      return;
    }
    restoreNow(options);
  }, [resetCameraMotion, restoreNow]);

  const endSequence = useCallback((options?: RestoreOptions) => {
    if (!sequenceActiveRef.current) return;

    sequenceActiveRef.current = false;
    setIsSequenceActive(false);
    const pending = pendingSequenceRestoreRef.current;
    pendingSequenceRestoreRef.current = null;
    restoreNow({
      immediate: (options?.immediate ?? false) || (pending?.immediate ?? false),
    });
  }, [restoreNow]);

  const onManualToggle = useCallback(() => {
    if (sequenceActiveRef.current) return;
    // Only suppress compact restore — does not affect scroll restoration.
    if (snapshotRef.current !== null) {
      playerToggledCompactRef.current = true;
    }
  }, []);

  useEffect(() => () => {
    sequenceActiveRef.current = false;
    pendingSequenceRestoreRef.current = null;
    resetPerCinematic();
  }, [resetPerCinematic]);

  return {
    beginSequence,
    endSequence,
    prepare,
    restore,
    onManualToggle,
    isOrchestrating,
    isRestoring,
    isSequenceActive,
  };
}
