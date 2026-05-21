"""
Normalize all six gem token PNGs to a consistent 512×512 canvas.

For each file:
  1. Load with full alpha channel
  2. Check visible pixel coverage — if below MIN_COVERAGE_PCT the file has
     likely been inadvertently replaced with degraded art; skip it with a
     loud warning rather than locking in the bad content.
  3. Auto-detect tight bounding box of non-transparent pixels
  4. Crop to that bounding box
  5. Scale the cropped artwork so it fills exactly FILL_PCT of a 512×512 canvas
  6. Center on the new canvas and save (overwrite in place)

Missing files are skipped with a WARN message — the script continues with
the remaining files and exits 1 only when every file failed.

PROTECTED FILES — do not regenerate these in asset-generation sessions:
  attached_assets/luminae_radiance_emblem_v2.png
  attached_assets/luminae_singularity_emblem_v1.png
  attached_assets/generated_images/gem_flare.png
  attached_assets/generated_images/gem_continuum.png
  attached_assets/generated_images/gem_verdance.png
  attached_assets/generated_images/gem_abyss.png
These tokens were restored from commit 4758e88 after multiple inadvertent
replacements degraded them (singularity dropped to 3% coverage / 33 KB).
If you intentionally want to update a token, do so deliberately and remove
the coverage guard for that specific file.
"""

from PIL import Image
import os
import sys

CANVAS = 512
FILL_PCT = 0.78       # artwork occupies 78% of the canvas dimension
MIN_COVERAGE_PCT = 0.28  # visible pixel ratio below this = likely degraded art

# Resolve paths relative to the repo root (two levels above this script).
_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

FILES = [
    os.path.join(_REPO_ROOT, "attached_assets/luminae_radiance_emblem_v2.png"),
    os.path.join(_REPO_ROOT, "attached_assets/luminae_singularity_emblem_v1.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_flare.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_continuum.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_verdance.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_abyss.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_radiance.png"),
    os.path.join(_REPO_ROOT, "attached_assets/generated_images/gem_singularity.png"),
]


def visible_coverage(img: Image.Image) -> float:
    """Return fraction of pixels with alpha > 20 (0.0 – 1.0)."""
    rgba = img.convert("RGBA")
    total = rgba.width * rgba.height
    if total == 0:
        return 0.0
    visible = sum(1 for _, _, _, a in rgba.getdata() if a > 20)
    return visible / total


def normalize(path: str) -> str:
    """
    Normalize a single gem PNG in place.

    Returns one of:
      "ok"       — file was successfully normalized
      "skip"     — file exists but was fully transparent (nothing to do)
      "warn"     — file was missing, could not be opened, or failed coverage check
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

    # Coverage guard — refuse to normalize (and overwrite) degraded art.
    coverage = visible_coverage(img)
    if coverage < MIN_COVERAGE_PCT:
        print(
            f"  PROTECTED {path}\n"
            f"      coverage={coverage:.1%} is below minimum {MIN_COVERAGE_PCT:.0%} "
            f"— file appears to have been replaced with degraded art.\n"
            f"      Skipping normalization to avoid locking in bad content.\n"
            f"      Restore from git (commit 4758e88) or replace with correct art."
        )
        return "warn"

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
        f"coverage {coverage:.1%}  |  "
        f"bbox {bbox}  |  "
        f"artwork {new_w}×{new_h} @ ({offset_x},{offset_y})  |  "
        f"{orig_kb} KB → {new_kb} KB"
    )
    return "ok"


def main() -> None:
    print(f"Normalizing gem token PNGs → {CANVAS}×{CANVAS}, fill={int(FILL_PCT*100)}%  (min coverage {MIN_COVERAGE_PCT:.0%})\n")

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
