import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { usePanelSheetTip, PANEL_TAPPABLE_BEATS } from '@/hooks/use-panel-sheet-tip';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// All tests import and exercise the real usePanelSheetTip hook and the real
// PANEL_TAPPABLE_BEATS constant — so any regression in the production logic
// causes a test failure here.

describe('usePanelSheetTip — "tap to inspect" tip invariants', () => {
  // ── Mount-time invariant ────────────────────────────────────────────────────
  //
  // panelSheetEverOpened must initialise to false even when beatId is already
  // in PANEL_TAPPABLE_BEATS on first render (hot-reload / session restore).

  describe('mount-time invariant', () => {
    it('tip is visible on mount when beatId is already in PANEL_TAPPABLE_BEATS', () => {
      const { result } = renderHook(() =>
        usePanelSheetTip('b9b_forge_complete'),
      );

      expect(result.current.panelSheetEverOpened).toBe(false);
      expect(result.current.isPanelHighlighted).toBe(true);
      // tip = isPanelHighlighted && !panelSheetEverOpened
      expect(result.current.isPanelHighlighted && !result.current.panelSheetEverOpened).toBe(true);
    });

    it('tip is not shown when beatId is not in PANEL_TAPPABLE_BEATS on mount', () => {
      const { result } = renderHook(() =>
        usePanelSheetTip('b1_welcome'),
      );

      expect(result.current.isPanelHighlighted).toBe(false);
    });

    it('PANEL_TAPPABLE_BEATS contains the expected set of beats', () => {
      const expected = [
        'b9b_forge_complete',
        'b11_forge_reserved',
        'b12_tier2',
        'b13_tier3',
        'b14_win_condition',
        'b16_final_forge',
      ];
      for (const id of expected) {
        expect(PANEL_TAPPABLE_BEATS.has(id)).toBe(true);
      }
    });
  });

  // ── Beat-transition reset ───────────────────────────────────────────────────

  describe('beat-transition reset', () => {
    it('resets panelSheetEverOpened to false when beat transitions into a panel-tappable beat', () => {
      const { result, rerender } = renderHook(
        ({ beatId }: { beatId: string }) => usePanelSheetTip(beatId),
        { initialProps: { beatId: 'b8_harvest' } },
      );

      // Open the sheet on the previous (non-panel-tappable) beat
      act(() => { result.current.togglePanelSheet(); });
      expect(result.current.panelSheetEverOpened).toBe(true);

      // Beat advances into a panel-tappable beat — flag must reset
      act(() => { rerender({ beatId: 'b9b_forge_complete' }); });

      expect(result.current.panelSheetEverOpened).toBe(false);
      expect(result.current.isPanelHighlighted && !result.current.panelSheetEverOpened).toBe(true);
    });

    it('resets the flag on every distinct panel-tappable beat transition', () => {
      const { result, rerender } = renderHook(
        ({ beatId }: { beatId: string }) => usePanelSheetTip(beatId),
        { initialProps: { beatId: 'b9b_forge_complete' } },
      );

      // Open the sheet on the first panel-tappable beat
      act(() => { result.current.togglePanelSheet(); });
      expect(result.current.panelSheetEverOpened).toBe(true);

      // Advance through a non-tappable beat then into the next tappable beat
      act(() => { rerender({ beatId: 'b10_non_tappable' }); });
      act(() => { rerender({ beatId: 'b11_forge_reserved' }); });

      expect(result.current.panelSheetEverOpened).toBe(false);
      expect(result.current.isPanelHighlighted).toBe(true);
    });

    it('does NOT reset the flag when transitioning to a non-panel-tappable beat', () => {
      const { result, rerender } = renderHook(
        ({ beatId }: { beatId: string }) => usePanelSheetTip(beatId),
        { initialProps: { beatId: 'b9b_forge_complete' } },
      );

      act(() => { result.current.togglePanelSheet(); });
      expect(result.current.panelSheetEverOpened).toBe(true);

      // Transition to a non-tappable beat — flag must NOT reset
      act(() => { rerender({ beatId: 'b10_non_tappable' }); });

      expect(result.current.panelSheetEverOpened).toBe(true);
    });
  });

  // ── Stays reset until sheet is opened ──────────────────────────────────────

  describe('flag stays false until the sheet is opened on the new beat', () => {
    it('tip remains visible (flag stays false) between the beat transition and first sheet open', () => {
      const { result, rerender } = renderHook(
        ({ beatId }: { beatId: string }) => usePanelSheetTip(beatId),
        { initialProps: { beatId: 'b8_harvest' } },
      );

      // Transition into panel-tappable beat
      act(() => { rerender({ beatId: 'b12_tier2' }); });
      expect(result.current.panelSheetEverOpened).toBe(false);
      expect(result.current.isPanelHighlighted).toBe(true);

      // Sheet has not been opened yet — flag still false
      expect(result.current.panelSheetEverOpened).toBe(false);

      // Player opens the sheet → flag flips to true → tip hides
      act(() => { result.current.togglePanelSheet(); });
      expect(result.current.panelSheetEverOpened).toBe(true);
      expect(result.current.isPanelHighlighted && !result.current.panelSheetEverOpened).toBe(false);
    });

    it('toggling the sheet open marks panelSheetEverOpened true and panelSheetOpen true', () => {
      const { result } = renderHook(() =>
        usePanelSheetTip('b14_win_condition'),
      );

      expect(result.current.panelSheetOpen).toBe(false);
      act(() => { result.current.togglePanelSheet(); });
      expect(result.current.panelSheetOpen).toBe(true);
      expect(result.current.panelSheetEverOpened).toBe(true);
    });

    it('toggling the sheet closed does not reset panelSheetEverOpened', () => {
      const { result } = renderHook(() =>
        usePanelSheetTip('b16_final_forge'),
      );

      act(() => { result.current.togglePanelSheet(); }); // open
      act(() => { result.current.togglePanelSheet(); }); // close

      expect(result.current.panelSheetOpen).toBe(false);
      expect(result.current.panelSheetEverOpened).toBe(true);
    });
  });
});
