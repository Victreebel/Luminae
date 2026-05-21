"""
Compress card artwork and Luminary panel/entity/aura/avatar PNGs.

Strategy (per category):
  cards/    896×1280  →  448×640   (half linear, ~4× file-size reduction)
  luminaries/*/panel  →  512×512   (panels are never rendered larger than ~350px)
  luminaries/*/entity →  512×730   (entities scale to fit; half linear)
  luminaries/*/aura   →  512×512   (soft glow overlay; half linear is plenty)
  avatars/            →  256×256   (small UI chips; quarter linear)

Files that are historical drafts (suffixes: _prev, _clean, _pregapfix,
_transparent_orig, _ophanim_*) are also compressed with the same targets so
they don't bloat the repo, but are otherwise unchanged semantically.

The reference image (references/) is skipped — it is a dev asset, not a game asset.
Already-small files (< TARGET_SKIP_KB) are skipped too.

All images are saved as RGB PNG (no alpha stripping for transparency-bearing
files — alpha is preserved).
"""

from __future__ import annotations

import os
import glob
from PIL import Image

# ── Targets ──────────────────────────────────────────────────────────────────
CARD_TARGET    = (448, 640)   # w × h (portrait card art)
PANEL_TARGET   = (512, 512)   # luminary panel (square)
ENTITY_TARGET  = (512, 730)   # luminary entity (portrait, approx half of 896×1280)
AURA_TARGET    = (512, 512)   # luminary aura (square)
AVATAR_TARGET  = (256, 256)   # player avatar chip

# Resolve repo root relative to this file's location:
#   scripts/src/compress-art-assets.py  →  scripts/src  →  scripts  →  repo root
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_REPO_ROOT  = os.path.dirname(os.path.dirname(_SCRIPT_DIR))

ASSETS_ROOT    = os.path.join(_REPO_ROOT, "artifacts", "luminae", "src", "assets")
TARGET_SKIP_KB = 120          # already small — skip to avoid double-processing

# ── Helpers ───────────────────────────────────────────────────────────────────

def compress(path: str, target_wh: tuple[int, int]) -> None:
    import io
    orig_kb = os.path.getsize(path) // 1024
    if orig_kb < TARGET_SKIP_KB:
        print(f"  SKIP {path}  ({orig_kb} KB — already small)")
        return

    img = Image.open(path)
    orig_size = img.size

    # Skip if already at or below target dimensions (no upscaling benefit)
    tw, th = target_wh
    if orig_size[0] <= tw and orig_size[1] <= th:
        # Still try optimize-only re-save into a buffer to check if it helps
        if img.mode not in ("RGBA", "LA", "PA"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, "PNG", optimize=True)
        candidate_kb = buf.tell() // 1024
        if candidate_kb >= orig_kb:
            print(f"  SKIP {path}  ({orig_kb} KB — already optimal size)")
            return
        buf.seek(0)
        with open(path, "wb") as f:
            f.write(buf.read())
        print(
            f"  OK  {path}\n"
            f"      {orig_size} (no resize)  |  "
            f"{orig_kb} KB → {candidate_kb} KB  (−{100*(orig_kb-candidate_kb)//orig_kb}%)"
        )
        return

    # Preserve alpha when present
    if img.mode not in ("RGBA", "LA", "PA"):
        img = img.convert("RGB")

    # Fit inside target box preserving aspect ratio
    img.thumbnail((tw, th), Image.LANCZOS)

    # Write to buffer first; only replace the file if the result is smaller
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    candidate_kb = buf.tell() // 1024
    if candidate_kb >= orig_kb:
        print(f"  SKIP {path}  ({orig_kb} KB — re-encode not smaller, keeping original)")
        return

    buf.seek(0)
    with open(path, "wb") as f:
        f.write(buf.read())

    saved_pct = 100 * (orig_kb - candidate_kb) // orig_kb if orig_kb else 0
    print(
        f"  OK  {path}\n"
        f"      {orig_size} → {img.size}  |  "
        f"{orig_kb} KB → {candidate_kb} KB  (−{saved_pct}%)"
    )


def process_category(
    pattern: str,
    target: tuple[int, int],
    label: str,
) -> tuple[int, int]:
    paths = sorted(glob.glob(pattern, recursive=True))
    before_total = sum(os.path.getsize(p) for p in paths)
    print(f"\n── {label} ({len(paths)} files) ──")
    for p in paths:
        compress(p, target)
    after_total = sum(os.path.getsize(p) for p in paths)
    return before_total, after_total


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    grand_before = 0
    grand_after  = 0

    # Card artwork — every PNG inside assets/cards/
    b, a = process_category(
        f"{ASSETS_ROOT}/cards/*.png",
        CARD_TARGET,
        "Card artwork",
    )
    grand_before += b; grand_after += a

    # Luminary panels (all files named panel*.png under luminaries/)
    b, a = process_category(
        f"{ASSETS_ROOT}/luminaries/*/panel*.png",
        PANEL_TARGET,
        "Luminary panels",
    )
    grand_before += b; grand_after += a

    # Luminary entities (all files named entity*.png under luminaries/)
    b, a = process_category(
        f"{ASSETS_ROOT}/luminaries/*/entity*.png",
        ENTITY_TARGET,
        "Luminary entities",
    )
    grand_before += b; grand_after += a

    # Luminary auras
    b, a = process_category(
        f"{ASSETS_ROOT}/luminaries/*/aura*.png",
        AURA_TARGET,
        "Luminary auras",
    )
    grand_before += b; grand_after += a

    # Avatars
    b, a = process_category(
        f"{ASSETS_ROOT}/avatars/*.png",
        AVATAR_TARGET,
        "Avatars",
    )
    grand_before += b; grand_after += a

    saved  = grand_before - grand_after
    pct    = 100 * saved // grand_before if grand_before else 0
    print(
        f"\n{'='*60}\n"
        f"Total before : {grand_before // 1024 // 1024} MB "
        f"({grand_before // 1024} KB)\n"
        f"Total after  : {grand_after  // 1024 // 1024} MB "
        f"({grand_after  // 1024} KB)\n"
        f"Space saved  : {saved // 1024 // 1024} MB "
        f"({saved // 1024} KB)  −{pct}%\n"
    )


if __name__ == "__main__":
    main()
