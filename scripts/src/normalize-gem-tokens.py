"""
Normalize all six gem token PNGs to a consistent 512×512 canvas.

For each file:
  1. Load with full alpha channel
  2. Auto-detect tight bounding box of non-transparent pixels
  3. Crop to that bounding box
  4. Scale the cropped artwork so it fills exactly FILL_PCT of a 512×512 canvas
  5. Center on the new canvas and save (overwrite in place)

Missing files are skipped with a WARN message — the script continues with
the remaining files and exits 1 only when every file failed.
"""

from PIL import Image
import os
import sys

CANVAS = 512
FILL_PCT = 0.78  # artwork occupies 78% of the canvas dimension

# Resolve paths relative to the repo root (two levels above this script).
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

FILES = [
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_radiance.png"),
    os.path.join(_REPO_ROOT, "attached_assets/luminae_singularity_emblem_v1.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_flare.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_continuum.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_verdance.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_abyss.png"),
]


def normalize(path: str) -> str:
    """
    Normalize a single gem PNG in place.

    Returns one of:
      "ok"   — file was successfully normalized
      "skip" — file exists but was fully transparent (nothing to do)
      "warn" — file was missing or could not be opened
    """
    if not os.path.exists(path):
        print(f"  WARN {path} — file not found, skipping")
        return "warn"

    try:
        img = Image.open(path).convert("RGBA")
    except Exception as exc:
        print(f"  WARN {path} — could not open: {exc}")
        return "warn"

    orig_size = img.size
    orig_kb = os.path.getsize(path) // 1024

    bbox = img.getbbox()
    if bbox is None:
        print(f"  SKIP {path} — fully transparent, nothing to do")
        return "skip"

    cropped = img.crop(bbox)
    cw, ch = cropped.size

    target_px = int(CANVAS * FILL_PCT)
    scale = target_px / max(cw, ch)
    new_w = round(cw * scale)
    new_h = round(ch * scale)

    resized = cropped.resize((new_w, new_h), Image.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    offset_x = (CANVAS - new_w) // 2
    offset_y = (CANVAS - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y), resized)

    canvas.save(path, "PNG", optimize=True)
    new_kb = os.path.getsize(path) // 1024
    print(
        f"  OK  {path}\n"
        f"      {orig_size} → {CANVAS}×{CANVAS}  |  "
        f"bbox {bbox}  |  "
        f"artwork {new_w}×{new_h} @ ({offset_x},{offset_y})  |  "
        f"{orig_kb} KB → {new_kb} KB"
    )
    return "ok"


def main() -> None:
    print(f"Normalizing {len(FILES)} gem token PNGs → {CANVAS}×{CANVAS}, fill={int(FILL_PCT*100)}%\n")

    counts = {"ok": 0, "skip": 0, "warn": 0}
    for path in FILES:
        result = normalize(path)
        counts[result] += 1

    print(
        f"\nSummary: {counts['ok']} OK  |  {counts['skip']} SKIP  |  {counts['warn']} WARN"
    )

    if counts["ok"] == 0 and counts["skip"] == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
