# LUMINAe Asset Provenance Audit v1.0

**Audit date:** 2026-08-25  
**Scope:** media under `artifacts/luminae/src/assets` and `artifacts/luminae/public`.

## Verdict

**PUBLICATION BLOCKED PENDING RIGHTS EVIDENCE.**

The reproducible inventory in `LUMINAe_ASSET_PROVENANCE_INVENTORY_v1.0.csv` contains 374 image/audio/vector files. Static reachability inspection marks 207 as referenced by runtime source or copied from `public`:

| Evidence state | Count | Release meaning |
| --- | ---: | --- |
| `VERIFIED` | 50 | Source and license are independently identifiable, or the asset is a pinned first-party work with retained generation/input evidence and no external media. |
| `PARTIAL_PROVENANCE` | 157 | Origin is identified, but the commercial agreement, input/reference rights, upstream license, or authorship record is incomplete. |
| `MISSING_PROVENANCE` | 0 | No production-reachable asset currently lacks a usable provenance record. |

The strict release gate therefore remains blocked by **157 unresolved shipped assets**.

This is not a finding that the assets are infringing. It is a finding that ownership, generation source, contributor assignment, stock license, commission agreement, or redistribution terms are not recorded in a way a release reviewer can verify.

## Method

Run:

```bash
pnpm run audit:assets
```

The script records repository path, media type, byte size, SHA-256, source/public reachability, asserted provenance class, evidence confidence, source/license references, and required release action. It applies the human-reviewable rules in `LUMINAe_ASSET_PROVENANCE_EVIDENCE_v1.0.csv`; filename or folder inference alone never produces `VERIFIED`. `pnpm run audit:assets:strict` fails while any referenced/public asset remains unresolved.

## Evidence Reconciliation

### Verified assets

Six Antimatter Detonator source recordings are verified as Creative Commons Zero from their named Freesound pages and the canonical CC0 deed:

- Lunardrive, `Metal Door Slam_SoundSmith.wav`;
- Rudmer_Rotteveel, `Ratchet Wrench Fast Multiple`;
- nuckan, `hydraulics.wav`;
- brunoboselli, `Air (or steam) pressure release`;
- RyanKingArt, `Metal Impact`;
- tgerginov, `Deep impact`.

The local mapping and modification description are retained in `artifacts/luminae/src/assets/audio/Blueprints/Antimatter/SOURCES.md`. Freesound identifies each recording as CC0, and [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) permits copying, modification, distribution, performance, and commercial use without permission.

Three additional runtime sounds have exact SHA-256 matches to retained creator-and-asset-ID source filenames and live Pixabay pages: `Metal Clang` by DOBCommunications (`284809`), `Metal Hit Sound Effect` (`241374`), and `360-RISER IMPACT` by ALEXIS_GAMING_CAM (`370401`). Each source page identifies the [Pixabay Content License](https://pixabay.com/service/license-summary/), which permits integration and adaptation in a larger commercial creative work subject to its prohibited uses. The code-native `avatar_lumii.svg` is also pinned as first-party SVG geometry with no embedded raster, font, trademark, or external resource.

The four Antimatter Detonator variant plates were regenerated from text-only original briefs with no reference images or third-party media. `LUMINAe_ANTIMATTER_DEVICE_GENERATION_RECORD_v1.0.md` retains all prompts, source-output hashes, runtime hashes, processing parameters, and the input-rights attestation. These four exact runtime files are pinned as verified.

All 26 production-reachable Civilization plates now have pinned runtime hashes and complete local generation chains. `LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json` retains the text-only roots, explicit reference inputs, and the immediately preceding text-only input used by the Orthe edit. `LUMINAe_CIVILIZATION_GENERATION_MAP_v1.0.csv` maps all 33 retained Civilization-family source and runtime images; all chains resolve without an unknown input.

The browser/PWA icon family and social preview were replaced with original code-native compositions. `LUMINAe_PUBLIC_ICON_GENERATION_RECORD_v1.0.md` and `LUMINAe_PUBLIC_SOCIAL_GENERATION_RECORD_v1.0.md` retain their source files, deterministic generators, dimensions, and exact hashes. They contain no inherited game artwork or external media.

### Generated assets with partial evidence

**Thirteen shipped assets have strong local Codex generation linkage and retained inherited-input paths.** The two Blueprint cards and 11 Luminary derivatives have exact or high-confidence pixel matches to outputs in named local Codex generation sessions. Their prompts, source paths/hashes, and generation outputs are retained in `LUMINAe_CODEX_GENERATION_EVIDENCE_v1.0.json`. The two formerly untraced project references are now closed: `antimatter_detonator_device.jpg` is a retained Playwright capture of the project-owned Three.js manifestation scene, and the Final Hunger panel concept is byte-identical to a retained Codex edit of the Replit-linked Final Hunger panel. No Codex derivative has an unknown local root. The outputs stay partial only because their inherited card/Luminary inputs resolve to the Replit-linked families whose commercial agreement remains pending release review.

**One hundred forty-four shipped assets have Replit Agent generation linkage and recovered paid-use evidence.** The 90 card images, 41 remaining Luminary images, eight player avatars, and five Affinity images are tied to `.agents/agent_assets_metadata.toml` and generation/compression commits. Authenticated billing records show paid Agent Usage throughout the 2026-05-03 through 2026-06-12 generation window, and invoice/project UUID evidence ties that usage to Luminae. The current account reports Replit Core. Replit's [February 23, 2026 consumer terms](https://replit.com/terms-of-service-02-23-2026) identify consumer use as non-commercial, while its [Commercial Agreement](https://replit.com/commercial-agreement), updated February 26, 2026, assigns Output Content to the customer subject to Input Content rights and applicable third-party terms. The billing portal does not identify which agreement governed the historical use, so written Replit confirmation remains required. `uploads = []`, the 90-card prompt brief, and retained generation tasks materially strengthen input evidence but do not replace the controller attestation. `LUMINAe_REPLIT_ASSET_RIGHTS_EVIDENCE_PACKET_v1.0.md` records the remaining proof needed to clear this group without regeneration.

No production-reachable audio file currently lacks source/license evidence. Fourteen undocumented legacy samples remain excluded from the production bundle. Most replacements are code-native Web Audio cues; the three physical glass cues are deterministic first-party PCM renders with their generator and exact hashes retained in `LUMINAe_LUMINARY_GLASS_AUDIO_GENERATION_RECORD_v1.0.md`. Their exact disposition is recorded in `LUMINAe_PROCEDURAL_AUDIO_REPLACEMENT_RECORD_v1.0.md` and the closure queue.

### Missing evidence closure

No production-reachable asset remains in `MISSING_PROVENANCE`. Fourteen undocumented samples have no runtime references; equivalent cues use project-authored Web Audio or deterministic DSP renders, so the legacy files are source-only and must remain excluded from production manifests. Four undocumented Antimatter plates were replaced by verified text-only generations, and all inherited public-brand assets were replaced by first-party code-native media. `LUMINAe_ASSET_PROVENANCE_CLOSURE_QUEUE_v1.0.csv` now records all 29 original closure items as closed.

## Closure Queue

1. Retain Replit's response to the support request submitted on 2026-08-25 confirming whether the paid Agent use evidenced for Luminae was governed by the February 2026 Commercial Agreement (or another agreement granting the required rights), including any applicable third-party image/model terms.
2. Obtain release/legal acceptance of the dated controller confirmation and corroborating input evidence; use `LUMINAe_ASSET_CONTROLLER_ATTESTATION_v1.0.md` only if a formal signature is requested.
3. Keep all 14 source-only legacy samples excluded from production manifests.
4. Run `pnpm run audit:assets:strict`; require zero partial and zero missing shipped assets before legal/release sign-off.

Static source matching is conservative. A `SOURCE_ONLY_OR_UNCONFIRMED` result does not prove an asset is absent from a dynamic import, build transform, native resource, or marketing package. Final sign-off must inspect production web manifests, Android bundles, Mac packages, and store-listing media.

## Required Evidence Per Asset

Accept one source-attributed record per unique SHA-256:

- original work: author, creation date, project ownership or written assignment;
- commissioned work: contract/invoice and commercial-use/derivative rights;
- AI-assisted/generated work: tool/service, account/controller, generation date/session, source inputs, applicable terms at creation, and confirmation that no unlicensed reference asset was incorporated;
- stock/third-party work: supplier, item URL/ID, license version/date, purchaser, permitted platforms, and modification evidence;
- open-license work: source URL, copyright notice, exact license, modification record, and required attribution/license copy;
- sound recording: recording/composition rights separately where applicable.

Do not use filename, folder, visual style, or chat history alone as commercial rights evidence.

## Fonts

The live page requests Inter, Cinzel, and Cinzel Decorative from Google Fonts. Inter's official Google Fonts source records SIL Open Font License 1.1; Cinzel's upstream repository also carries an OFL file. Before release:

1. retain the exact license/copyright records for all three families;
2. decide whether to self-host release-pinned font files for native consistency and reduced third-party disclosure;
3. if Google hosting remains, ensure the privacy disclosure and CSP match the network request;
4. verify offline/native fallback typography does not break layout.

References: [Inter OFL](https://github.com/google/fonts/blob/main/ofl/inter/OFL.txt), [Cinzel upstream](https://github.com/NDISCOVER/Cinzel).

## Release Closure

Public distribution may proceed only when:

- every runtime/store media SHA has a verified evidence record;
- unverified source assets are excluded from production packages;
- required attribution and license copies ship in an appropriate notices file;
- generated derivatives link back to their source evidence;
- store screenshots, trailers, icons, and feature graphics are included in the same audit;
- legal/release review signs the final inventory rather than relying on this engineering classification.

This audit is an engineering evidence classification, not legal advice or a warranty of non-infringement.
