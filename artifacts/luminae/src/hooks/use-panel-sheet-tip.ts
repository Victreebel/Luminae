import { useState, useEffect } from 'react';

/**
 * Beat IDs where tapping the bottom player panel is meaningful.
 * Exported so tests can import the canonical set rather than maintain a copy.
 */
export const PANEL_TAPPABLE_BEATS = new Set([
  'b9b_forge_complete',
  'b11_forge_reserved',
  'b12_tier2',
  'b13_tier3',
  'b14_win_condition',
  'b16_final_forge',
]);

/**
 * Manages the artifact-detail sheet and the "tap to inspect" tip visibility
 * across panel-tappable tutorial beats.
 *
 * Mount-time invariant: `panelSheetEverOpened` initialises to `false` so the
 * tip is always visible on first render — even when `beatId` is already in
 * PANEL_TAPPABLE_BEATS (e.g. after a hot-reload or a mid-tutorial session
 * restore). The beat-change effect resets the flag whenever the beat
 * *transitions into* a panel-tappable beat (steady-state path); useState(false)
 * covers the mount-time edge case and must never be changed to true here.
 */
export function usePanelSheetTip(beatId: string) {
  const [panelSheetOpen, setPanelSheetOpen] = useState(false);
  const [panelSheetEverOpened, setPanelSheetEverOpened] = useState(false);

  // Close the artifact sheet whenever the beat advances; also reset the
  // "ever opened" flag so the tip reappears on each distinct panel-tappable beat.
  useEffect(() => {
    setPanelSheetOpen(false);
    if (PANEL_TAPPABLE_BEATS.has(beatId)) {
      setPanelSheetEverOpened(false);
    }
  }, [beatId]);

  const isPanelHighlighted = PANEL_TAPPABLE_BEATS.has(beatId);

  /** Toggle the sheet open/closed; marks the tip as seen on first open. */
  const togglePanelSheet = () => {
    setPanelSheetOpen(o => {
      const next = !o;
      if (next) setPanelSheetEverOpened(true);
      return next;
    });
  };

  /** Explicitly close the sheet (e.g. backdrop tap, close button, dialogue advance). */
  const closePanelSheet = () => setPanelSheetOpen(false);

  return {
    panelSheetOpen,
    panelSheetEverOpened,
    isPanelHighlighted,
    togglePanelSheet,
    closePanelSheet,
  };
}
