# lum_pale — Illustrated Asset Slot

Drop final illustrated assets here. All formats are accepted (.webp preferred).
Vite discovers files at build time via import.meta.glob; missing files fall back
to the procedural SVG entity art automatically — no code changes needed.

## Expected files

| Filename      | Purpose                                                          |
|---------------|------------------------------------------------------------------|
| panel.webp    | Sealed board panel art — shown in the objective tile and as the  |
|               | shattering vessel in the summoning cutscene.                     |
|               | Aspect ratio: square (1:1) or portrait up to 3:4.               |
|               | Will be displayed with object-fit:cover inside the tile frame.  |
| entity.webp   | Freed entity cutout — transparent background PNG/WebP.           |
|               | The entity silhouette only; no card border, no portrait frame.  |
|               | Displayed during the cutscene reveal over the live game board.  |
|               | Recommended: 400×560 px transparent PNG or WebP.                |
| aura.webp     | Aura / cosmic light layer — transparent background PNG/WebP.    |
|               | Sits behind the entity during the reveal (screen blend mode).   |
|               | Soft radial glow or particle field; can be a wide square.       |
|               | Recommended: 512×512 px transparent PNG or WebP.                |

## Art direction notes

Visual universe: cosmic crystalline entities from the same civilization shown
on the artifact cards — geometric faceted forms, luminous rune geometry,
recognizable silhouettes at small scale (the board tile is ~112×112 px).
