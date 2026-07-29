import { useEffect } from 'react';

export interface GameKeyboardShortcutOptions {
  isAnyOverlayOpen: boolean;
  onBoard: () => void;
  onHand: () => void;
  onLog: () => void;
  onToggleReserved: () => void;
  onToggleForged: () => void;
  onToggleRules: () => void;
}

function isTextEntryElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return !!target.closest(
    'input, textarea, select, [contenteditable="true"], [data-chat-composer]',
  );
}

/**
 * Registers document-level keyboard shortcuts for navigating the main game panels.
 *
 * Shortcuts:
 *   b — Board tab
 *   h — Hand tab
 *   l — Log tab
 *   r — Toggle Reserved cards overlay
 *   f — Toggle Forged cards overlay
 *   ? — Toggle Rules sheet
 *
 * All shortcuts are suppressed while:
 *   - Any modal/overlay/sheet is open (focus-trap handles Escape for those)
 *   - The active element is a text input, textarea, select, or contenteditable
 *   - A modifier key (Ctrl, Alt, Meta) is held
 */
export function useGameKeyboardShortcuts({
  isAnyOverlayOpen,
  onBoard,
  onHand,
  onLog,
  onToggleReserved,
  onToggleForged,
  onToggleRules,
}: GameKeyboardShortcutOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (isTextEntryElement(e.target)) return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        if (isTextEntryElement(active)) return;
      }

      if (isAnyOverlayOpen) return;

      switch (e.key) {
        case 'b':
        case 'B':
          e.preventDefault();
          onBoard();
          break;
        case 'h':
        case 'H':
          e.preventDefault();
          onHand();
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          onLog();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          onToggleReserved();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          onToggleForged();
          break;
        case '?':
          e.preventDefault();
          onToggleRules();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isAnyOverlayOpen, onBoard, onHand, onLog, onToggleReserved, onToggleForged, onToggleRules]);
}
