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
