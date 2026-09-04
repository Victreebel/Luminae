# LUMINAe Public Icon Generation Record v1.0

**Creation date:** 2026-08-25  
**Source:** `artifacts/luminae/public/favicon.svg`  
**Generator:** `scripts/generate-public-icons.mjs`

## Provenance

The public icon family was replaced with an original, code-native SVG mark authored for LUMINAe in the current task. The source uses only primitive SVG geometry and repository-defined colors. It contains no embedded raster image, external font, trademark, or remote resource.

The mark depicts the five natural Affinity color families as facets around a pale aperture and central white lumen. `icon_affinity.svg` is the transparent-background variant. The PNG files are deterministic Sharp renders of `favicon.svg`; no image-generation model or reference media was used.

## Reproduction

From the repository root:

```bash
node scripts/generate-public-icons.mjs
```

The generator renders the same 512 x 512 SVG at the dimensions required by browser, PWA, and native surfaces. It does not fetch network resources.

## Pinned Outputs

| Path | Dimensions | SHA-256 |
| --- | ---: | --- |
| `artifacts/luminae/public/favicon.svg` | 512 x 512 viewBox | `7679930f56d33d3fe9764ce21d576a169edd924b369df1c613dc5436fb7bc52e` |
| `artifacts/luminae/public/icon_affinity.svg` | 512 x 512 viewBox | `201a6549162c8162aa5b6738d5af3694214cf7b65769d074745cd3f0e5038a09` |
| `artifacts/luminae/public/favicon-32.png` | 32 x 32 | `4ac60ae5600b29de2c0253bf63cb44a775748c8d69c3442cbbe233b3d8992f60` |
| `artifacts/luminae/public/apple-touch-icon.png` | 180 x 180 | `03ea79c8141c8fe1905913daa9b4c84afd9ec2ec690f5840c8f027c580059cc3` |
| `artifacts/luminae/public/icon-192.png` | 192 x 192 | `bf2f7051964fa298ca296210e0bebb305a993868ee8ed97c87b824cbc953380f` |
| `artifacts/luminae/public/icon-512.png` | 512 x 512 | `35675800738521b6b6ea8cc72006dd6001823318da512782cbb222a712b4c684` |

Any later visual change requires regenerating the PNG family, updating these hashes, and rerunning the asset provenance audit.
