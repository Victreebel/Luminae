"""
Normalize all six gem token PNGs to a consistent 512×512 canvas.

For each file:
  1. Load with full alpha channel
  2. Auto-detect tight bounding box of non-transparent pixels
  3. Crop to that bounding box
  4. Scale the cropped artwork so it fills exactly FILL_PCT of a 512×512 canvas
  5. Center on the new canvas and save (overwrite in place)
"""

from PIL import Image
import os

CANVAS = 512
FILL_PCT = 0.78  # artwork occupies 78% of the canvas dimension

FILES = [
    "attached_assets/luminae_radiance_emblem_v2.png",
    "attached_assets/luminae_singularity_emblem_v1.png",
    "attached_assets/generated_images/gem_flare.png",
    "attached_assets/generated_images/gem_continuum.png",
    "attached_assets/generated_images/gem_verdance.png",
    "attached_assets/generated_images/gem_abyss.png",
]


def normalize(path: str) -> None:
    img = Image.open(path).convert("RGBA")
    orig_size = img.size
    orig_kb = os.path.getsize(path) // 1024

    bbox = img.getbbox()
    if bbox is None:
        print(f"  SKIP {path} — fully transparent, nothing to do")
        return

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


def main() -> None:
    print(f"Normalizing {len(FILES)} gem token PNGs → {CANVAS}×{CANVAS}, fill={int(FILL_PCT*100)}%\n")
    for path in FILES:
        normalize(path)
    print("\nDone.")


if __name__ == "__main__":
    main()
