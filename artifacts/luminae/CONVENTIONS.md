# Luminae UI Conventions

## Dropdown Menu Toggle Pattern

### Rule: no icon-swap, no `DropdownMenuCheckboxItem`

All boolean settings in a `DropdownMenu` communicate their on/off state
**exclusively through the icon** — never through the built-in checkbox indicator
provided by `DropdownMenuCheckboxItem`.

`DropdownMenuCheckboxItem` renders both the item's children *and* a Radix-managed
checkbox indicator (the small check mark). When the item also contains a custom
icon, that produces a redundant double-indicator (icon + check) that is visually
inconsistent and breaks the established convention.

Use a plain `<DropdownMenuItem>` and apply one of the two patterns below.

---

### Pattern A — Icon swap (binary toggle)

Swap between two distinct icons to signal the current state. Change the label
text to match.

```tsx
<DropdownMenuItem onClick={toggleMute}>
  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
  {muted ? 'Unmute' : 'Mute'}
</DropdownMenuItem>
```

---

### Pattern B — Icon color change (non-binary or non-label toggle)

Keep the same icon but change its color/opacity to signal the state. The label
stays constant.

```tsx
<DropdownMenuItem onClick={toggleAbridgedAnims}>
  <Zap
    className={`h-4 w-4 ${
      abridgedAnims ? 'text-yellow-400' : 'text-muted-foreground opacity-50'
    }`}
  />
  Abridged animations
</DropdownMenuItem>
```

---

### ESLint enforcement

The `luminae/no-dropdown-checkbox-item` rule (defined in `eslint.config.js`)
enforces this convention across the entire `src/` tree. If you receive the lint
error, adopt Pattern A or Pattern B above.

If you genuinely need a checkbox-style indicator for a *different* purpose
(not a settings toggle), suppress the rule inline and explain why:

```tsx
// eslint-disable-next-line luminae/no-dropdown-checkbox-item
// Reason: <explain why a checkbox indicator is appropriate here>
<DropdownMenuCheckboxItem ...>
```

---

## Dialog Focus-Trap Pattern

### Rule: every `role="dialog"` element must call `useFocusTrap()`

Any component that renders an element with `role="dialog"` must call the
`useFocusTrap` hook (from `src/hooks/use-focus-trap.ts`).  Without it,
keyboard focus leaks into the background while the dialog is open, breaking
accessibility for keyboard and screen-reader users.

The hook handles three things automatically:

- **Focus on open** — moves focus to the first focusable element inside the
  container as soon as the dialog becomes visible.
- **Tab cycling** — Tab / Shift+Tab wrap within the container's focusable
  descendants; focus cannot escape to background content.
- **Escape to close** — pressing Escape calls `onClose` (can be disabled via
  `options.handleEscape: false` when a higher-level handler already owns
  Escape for this overlay).

---

### Standard pattern

```tsx
import { useRef } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

function MyDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useRef<HTMLElement | null>(null);
  useFocusTrap(containerRef, isOpen, onClose);

  return (
    <div
      ref={(el) => { containerRef.current = el; }}
      role="dialog"
      aria-modal="true"
    >
      {/* dialog content */}
    </div>
  );
}
```

Key points:

- `containerRef` must be a `React.RefObject<HTMLElement | null>` (a `useRef`
  call in the same component).
- Pass the same `isOpen` boolean that gates the dialog's visibility.
- Use a ref-callback (`ref={(el) => { containerRef.current = el; }}`) on the
  dialog root so the ref works correctly inside conditional renders.
- Always add `aria-modal="true"` alongside `role="dialog"` so assistive
  technologies know the rest of the page is inert.

---

### Optional: disabling Escape handling

If a higher-level handler (e.g. `useEscapeToClose`) already owns Escape for
this overlay, pass `{ handleEscape: false }` to avoid double-closing:

```tsx
useFocusTrap(containerRef, isOpen, onClose, { handleEscape: false });
```

---

### ESLint enforcement

Two rules in `eslint.config.js` enforce dialog accessibility requirements
across the entire `src/` tree — both are set to `'error'`.

**`luminae/dialog-needs-focus-trap`** — every component that renders
`role="dialog"` must call `useFocusTrap()`.  If you receive this error, add
the standard pattern above.

**`luminae/dialog-needs-aria-modal`** — every `role="dialog"` element must
also have `aria-modal="true"`.  Without it, assistive technologies may allow
screen-reader users to navigate outside the dialog into background content.
If you receive this error, add the attribute directly:

```tsx
<div role="dialog" aria-modal="true">
```

If either constraint is satisfied externally (e.g. a Radix UI primitive that
manages focus and sets aria-modal internally), suppress the relevant rule
inline and explain why:

```tsx
// eslint-disable-next-line luminae/dialog-needs-focus-trap
// eslint-disable-next-line luminae/dialog-needs-aria-modal
// Reason: Radix Dialog manages focus and aria-modal internally via its own FocusScope
<div role="dialog">
```
