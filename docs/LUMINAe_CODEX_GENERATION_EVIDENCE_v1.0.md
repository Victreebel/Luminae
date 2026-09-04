# LUMINAe Codex Generation Evidence v1.0

## Purpose

This record closes the repository-local evidence gap for image assets linked to
four retained Codex sessions. It does not replace legal review. It records the
actual generation requests, revised prompts, explicit and recent-conversation
reference-image paths and hashes, output call IDs, output hashes, and whether a
generation was text-only or reference-based.

The compact machine-readable record is
`LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json`. Embedded image bytes and unrelated
conversation content are intentionally omitted.

## Reproduction

The manifest was produced with:

```sh
node scripts/extract-codex-image-provenance.mjs \
  --output docs/LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json \
  --session /Users/chaoscalligraphy/.codex/sessions/2026/06/28/rollout-2026-06-28T12-40-05-019f0f1a-3ada-77c0-b34d-0f5f7067d6a0.jsonl \
  --session /Users/chaoscalligraphy/.codex/sessions/2026/07/03/rollout-2026-07-03T12-01-18-019f28b6-86b8-7822-865d-9143293a2845.jsonl \
  --session /Users/chaoscalligraphy/.codex/sessions/2026/07/16/rollout-2026-07-16T09-28-27-019f6b1d-41ed-79d3-a7f3-de8ca203f26a.jsonl \
  --session /Users/chaoscalligraphy/.codex/sessions/2026/08/10/rollout-2026-08-10T05-10-25-019feaf0-02f7-71b0-970e-38fd223cd3b2.jsonl
```

The Civilization derivative map was produced with:

```sh
node scripts/map-codex-generated-assets.mjs \
  --manifest docs/LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json \
  --assets artifacts/luminae/src/assets/civilization \
  --session-id 019feaf0-02f7-71b0-970e-38fd223cd3b2 \
  --output docs/LUMINAe_CIVILIZATION_GENERATION_MAP_v1.0.csv
```

## Recovered Evidence

- 120 generation events were extracted across four sessions.
- 104 output files remain locally available and hashable.
- Every extracted request has a parsed prompt.
- Reference-based requests include the recorded paths and SHA-256 values for
  available input files.
- The session JSONL files are pinned by SHA-256 at extraction time. The active
  session can continue growing after extraction, so a later refresh may produce
  a new session-file hash without changing earlier generation records.

## Civilization Family

The map covers 33 Civilization-family images. It uses exact SHA-256 equality
when possible and a normalized 96 by 54 pixel RMSE comparison for encoded PNG,
JPEG, and WebP derivatives.

- All 33 images have exact or high-confidence source-output matches and
  recursively resolve to text-only Codex generations or recorded first-party
  derivatives.
- `chronicle-triangulation-orthe-v1.jpg` used
  `num_last_images_to_include: 1`. The extractor resolves that input to the
  immediately preceding text-only Orthe output and records both source hashes.
- No Civilization-family asset is promoted solely from its folder name or a
  visual resemblance without a pinned runtime hash and mapped source output.

## Other Codex-Linked Assets

The recovered prompts materially improve the evidence for the two Blueprint
cards and the identified Luminary derivatives. Most of those generations are
edits of earlier project artwork. Their output provenance is now strong, and the
two formerly untraced project references have been resolved:

- `antimatter_detonator_device.jpg` is a Playwright canvas capture of the
  project-owned Three.js Antimatter manifestation scene at timeline progress
  `1.000`. The session records the capture script, route, output path, and exact
  SHA-256 `df6db691193b3dcddd90a6ae266635e2f9e97913dafec935d6e37c143475004b`.
- `final-hunger-verdance/panel-concept.png` is byte-identical to Codex output
  `exec-5fae31bc-2655-4b8b-b9a4-e509beef9931.png`. The retained request edited
  `lum_hunger/panel.png`, and both the output and copied concept have SHA-256
  `57906bdd457d3fbb57e5c4fef5bf903fca94d863a503c866e1ae4d696d77af09`.

No Codex-linked production derivative now has an unknown local source root.
These outputs remain `PARTIAL_PROVENANCE` because their inherited card and
Luminary inputs ultimately resolve to the Replit-linked families whose
commercial agreement and input attestation are still pending.

## Evidence Boundary

`FULLY_RECORDED` means the local generation and derivative chain is complete. It
does not certify uniqueness, trademark clearance, or any external agreement.
Release review must still retain the applicable OpenAI terms and confirm that
all non-generated inputs in any remaining reference-based chain were owned or
licensed.
