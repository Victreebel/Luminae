import { useCallback, useRef, useState } from 'react';

/**
 * Roving-tabindex keyboard navigation for the Forge's 3-by-N Artifact grid.
 *
 * Tier rows are ordered [tier3, tier2, tier1] (indices 0, 1, 2) matching
 * the render order in the Forge section of the Board tab.
 *
 * Keyboard behaviour:
 *   ArrowRight — next card in the same tier row (wraps to first)
 *   ArrowLeft  — previous card in the same tier row (wraps to last)
 *   ArrowDown  — same column position in the next tier row (wraps)
 *   ArrowUp    — same column position in the previous tier row (wraps)
 *   Enter / Space — activate the focused card (opens detail sheet)
 *
 * Null / ghost card slots are skipped automatically during navigation.
 * The roving-tabindex pattern means only one Artifact in the entire Forge
 * has tabIndex=0 at any time; all others have tabIndex=-1. This keeps
 * the Tab key out of the card grid (one stop per grid), while arrow keys
 * move within it.
 *
 * Usage:
 *   const { getCardFocusProps } = useForgeKeyboardNav(tierCardLists);
 *   // In render:
 *   <div {...getCardFocusProps(tierIdx, validCardIdx, card, () => openCardSheet(card, false))}>
 *     <ArtifactCardView ... />
 *   </div>
 */

export interface CardFocusProps {
  tabIndex: number;
  role: 'button';
  'aria-label': string;
  'data-forge-tier': number;
  'data-forge-col': number;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => void;
}

export interface ForgeGridNav {
  /**
   * Returns props to spread on the focusable wrapper for an Artifact in the Forge.
   * @param tierIdx   Index into the tier array passed to the hook (0=tier3, 1=tier2, 2=tier1).
   * @param colIdx    Column index among *valid* (non-null, non-ghost) cards in this tier.
   * @param cardName  Human-readable card name for aria-label.
   * @param eminence  Eminence value of the Artifact, included in aria-label.
   * @param tierNum   The game tier number (1/2/3) for aria-label.
   * @param onTap     Callback to open the card detail sheet.
   */
  getCardFocusProps(
    tierIdx: number,
    colIdx: number,
    cardName: string,
    eminence: number,
    tierNum: number,
    onTap: () => void,
  ): CardFocusProps;

  /** True if keyboard focus is currently inside the Forge grid. */
  isForgeFocused: boolean;
}

/**
 * @param tierCardCounts  Array of valid-card counts per tier row, ordered [tier3, tier2, tier1].
 *                        Pass `state.forgeTierX.filter(c => c).length` for each tier.
 */
export function useForgeKeyboardNav(
  forgeRowCardCounts: number[],
): ForgeGridNav {
  // [tierIdx, colIdx] of the currently keyboard-focused card, or null.
  const [focusedPos, setFocusedPos] = useState<[number, number] | null>(null);
  // Track whether any card in The Forge has DOM focus.
  const [isForgeFocused, setIsForgeFocused] = useState(false);

  // Keep tier counts in a ref so keydown handlers always see the latest value.
  const countsRef = useRef(forgeRowCardCounts);
  countsRef.current = forgeRowCardCounts;

  const focusCard = useCallback((tierIdx: number, colIdx: number) => {
    setFocusedPos([tierIdx, colIdx]);
    const el = document.querySelector<HTMLElement>(
      `[data-forge-tier="${tierIdx}"][data-forge-col="${colIdx}"]`,
    );
    el?.focus({ preventScroll: false });
  }, []);

  const getCardFocusProps = useCallback(
    (
      tierIdx: number,
      colIdx: number,
      cardName: string,
      eminence: number,
      tierNum: number,
      onTap: () => void,
    ): CardFocusProps => {
      const isFocused =
        focusedPos !== null &&
        focusedPos[0] === tierIdx &&
        focusedPos[1] === colIdx;

      // Default tab stop: first card of tier 0 when nothing is focused yet.
      const isDefaultStop =
        focusedPos === null && tierIdx === 0 && colIdx === 0;

      return {
        tabIndex: isFocused || isDefaultStop ? 0 : -1,
        role: 'button',
        'aria-label': `${cardName}, Tier ${tierNum}${eminence > 0 ? `, ${eminence} Eminence` : ''}`,
        'data-forge-tier': tierIdx,
        'data-forge-col': colIdx,

        onFocus: () => {
          setFocusedPos([tierIdx, colIdx]);
          setIsForgeFocused(true);
        },

        onBlur: () => {
          // Delay so we can check if focus moved to another Artifact in the Forge.
          setTimeout(() => {
            const active = document.activeElement;
            if (!active || !active.hasAttribute('data-forge-tier')) {
              setIsForgeFocused(false);
            }
          }, 0);
        },

        onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            onTap();
            return;
          }

          const counts = countsRef.current;
          const numTiers = counts.length;

          if (
            e.key !== 'ArrowLeft' &&
            e.key !== 'ArrowRight' &&
            e.key !== 'ArrowUp' &&
            e.key !== 'ArrowDown'
          ) {
            return;
          }

          e.preventDefault();
          e.stopPropagation();

          let nextTier = tierIdx;
          let nextCol = colIdx;

          if (e.key === 'ArrowRight') {
            const count = counts[tierIdx] ?? 1;
            nextCol = (colIdx + 1) % count;
          } else if (e.key === 'ArrowLeft') {
            const count = counts[tierIdx] ?? 1;
            nextCol = (colIdx - 1 + count) % count;
          } else if (e.key === 'ArrowDown') {
            nextTier = (tierIdx + 1) % numTiers;
            // Clamp column to the row's available cards.
            nextCol = Math.min(colIdx, Math.max(0, (counts[nextTier] ?? 1) - 1));
          } else if (e.key === 'ArrowUp') {
            nextTier = (tierIdx - 1 + numTiers) % numTiers;
            nextCol = Math.min(colIdx, Math.max(0, (counts[nextTier] ?? 1) - 1));
          }

          focusCard(nextTier, nextCol);
        },
      };
    },
    [focusedPos, focusCard],
  );

  return { getCardFocusProps, isForgeFocused };
}
