# LUMINAe Public Social Generation Record v1.0

**Creation date:** 2026-08-25  
**Output:** `artifacts/luminae/public/opengraph.jpg`  
**Generator:** `scripts/generate-public-social.mjs`

## Provenance

The public social preview is an original code-native composition created for LUMINAe in the current task. It uses the verified first-party `icon_affinity.svg`, deterministic SVG geometry, repository-defined colors, and locally rasterized generic font glyphs. It contains no gameplay screenshot, inherited card or Luminary artwork, remote resource, stock media, or image-generation input.

The generator creates the background geometry and star field deterministically, composites the verified mark, renders the title and tagline, and encodes the result as a progressive JPEG. No network access is required.

## Reproduction

From the repository root:

```bash
node scripts/generate-public-social.mjs
```

## Pinned Output

| Path | Dimensions | SHA-256 |
| --- | ---: | --- |
| `artifacts/luminae/public/opengraph.jpg` | 1280 x 720 | `17e2703d4af4022ab8276db83c2d62554028ab7465fa38bbe572293c72128ab4` |

Any later visual change requires regenerating the file, updating this hash, and rerunning the asset provenance audit.
