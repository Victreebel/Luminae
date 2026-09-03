# LUMINAe Release Validation Results v1.0

**Validation date:** 2026-08-25  
**Repository:** `/Users/chaoscalligraphy/.codex/worktrees/4aa4/Lumiane`  
**Branch:** `codex/prepub-release`  
**Base commit:** `7f2a09ff08a7f325363c413963b4f5ce08eb74c2`  
**Audited state:** current dirty integration worktree, not a clean release candidate

## Verdict

**ENGINEERING FOUNDATION READY FOR STAGING; PUBLICATION REMAINS BLOCKED.**

The repository now contains the launch progression, Civilization teaching, opening Blueprint pool, Lume ledger, native purchase-verification foundation, Android shells, production Mac path, safety/operations controls, production budgets, and enforceable Blueprint-secrecy checks. Public distribution is not authorized until asset rights, human story gates, device/store validation, deployed migration validation, and production credentials are complete.

## Automated Results

| Gate | Result | Evidence |
|---|---|---|
| Workspace typecheck | PASS | `pnpm -r --if-present run typecheck`; 9 workspace projects checked, 0 errors. Client reports 16 existing React hook warnings. |
| Canonical registry checks | PASS | Version stamps, terminology, Summon colors, and Luminary file checks passed. Summon-color coverage validates all 17 illustrated Luminaries and 13 aura styles; Luminary-file coverage validates the required panel/entity assets without reviving the retired aura slot. |
| Presentation coordination | PASS | `pnpm run verify:coordination`; 8 client files / 52 tests and 3 API files / 7 tests passed, followed by both TypeScript checks. |
| API tests | PASS | 24 files, 357 tests. Includes public lore, state projection, Blueprint, Chronicle, Civilization, Lume, moderation, store, purchase, and timer coverage. |
| Client tests | PASS | 87 files, 627 tests. Includes Civilization scenes, Blueprint cards/presentation, Lumii, Chronicles, accessibility-oriented controls, audio lifecycle, native billing bridge, and game presentation. |
| Production web build | PASS | Vite and API builds completed. Latest client validation after the full procedural-audio and public-brand replacement: 28,015.1 KB / 35,840 KB budget. Entry JS: 194.6 KB gzip / 200 KB. Global CSS: 107.5 KB gzip / 110 KB. |
| Blueprint secrecy | PASS | `pnpm run verify:blueprint-secrecy`; five eager bundles inspected, full Blueprint names confined to hashed `sealed-*` reveal chunks, semantic Blueprint filenames rejected, and sealed chunks/assets absent from the service-worker precache. |
| Launch-surface composition | PASS | `pnpm run test:prepublication-surfaces`; 21 passed and three desktop-only skips. Trace, Recurrence, Triangulation, Lumii threshold, opened Vault, Civilization portrait/Scan, Foundry, and Worldshield were checked on desktop and Pixel 5 portrait for viewport containment, horizontal overflow, debug counters, compact Civilization guidance, mobile Scan/Vault navigation, and uncaught page errors. |
| Mobile dialog keyboard behavior | PASS | 42 Pixel 5 dialog checks passed across Tutorial, Friends, card actions, encrypted Artifacts, Archive Encryption, Rules, and the final game-over card. Role/`aria-modal`, forward/reverse focus wrap, arrow-key containment, and the intended Escape behavior were verified. |
| Live mobile action geometry | PASS | The maintained Playwright audit passed against a real room at 390 x 844: the turn announcement was centered; Harness remained aligned with visible Affinity wells; Encryption remained on-screen at its Archive source and during transfer; and the Forge card remained on-screen in the active compact/full presentation. The legacy audit command now delegates to this single source of truth. |
| WebSocket idle stability | PASS | The Vite HMR and game WebSockets remained connected for a 60-second idle window with no reconnect, unexpected close warning, or additional `/ws` open. |
| Public Artifact lore | PASS | All 90 Artifact records projected without `blueprintRole` or `blueprintFamilies`; public `practicalCapability` remains available for Civilization causality. |
| Rollback-only migration fixtures | PASS | The `0015_civilization_records` validator passed fresh, partial-upgrade, and already-complete fixtures; the `0016_chronicle_campaign_foundation` validator passed legacy and column-present fixtures; and the `0018_lume_ledger` plus `0019_release_safety_operations` validator preserved balances and repeatability. All ran against local PostgreSQL inside rolled-back transactions without retaining schemas or data. |
| Local web smoke | PASS | Existing preview server returned HTTP 200 for `/` and `/dev/triangulation-chronicle?phase=resolved` on port 5191. |
| Release environment contract | PASS | Mac and Android validators accepted complete HTTPS placeholder release contracts and rejected neither required field nor version-code rules. Production values remain external configuration. |
| Asset inventory | COMPLETE / BLOCKED | 371 media files inventoried; 204 referenced/public. Forty-seven assets are verified, 157 have partial origin evidence, and none lack a usable provenance record. All 157 unresolved inherited-art records still block `audit:assets:strict`. |
| Replacement regression check | PASS | All 627 client tests passed; client typecheck completed with zero errors and 16 existing hook warnings. Built manifests contain the pinned replacement plates and cleared sample sources, while all 14 excluded legacy samples are absent. Desktop, mobile, reduced-motion, icon, and social-preview inspection found no clipping or console errors. |
| Worktree formatting | PASS | `git diff --check` completed cleanly. The regenerated inventory records 538 modified or untracked paths in the preserved integration worktree. |
| Release workflow syntax | PASS / REMOTE RUN PENDING | The expanded workflow parses as YAML and now installs Chromium explicitly, runs canonical registry checks, and provisions an ephemeral PostgreSQL/API/Vite stack for the live dialog, geometry, and 60-second socket suites. A hosted run requires pushing a reviewed release candidate. |

## Build Observations

- PWA precache is limited to 44 entries / 3.21 MB and excludes sealed Blueprint reveal assets.
- The production build remains within declared budgets, but Vite reports the main game chunk at approximately 230 KB gzip and the dedicated Antimatter manifestation chunk at approximately 161 KB gzip. Representative low/mid-range Android frame testing remains mandatory.
- Entry JavaScript has only 5.5 KB gzip of declared headroom and global CSS only 2.5 KB. Further launch work should prefer lazy routes, existing components, and scoped styles; budget increases require an explicit performance review.
- Vite reports five third-party UI sourcemap lookup notices, a stale Browserslist database notice, and large-chunk advisories. None failed the build; they remain maintenance/performance observations.
- Client tests emit jsdom `localStorage` path and unimplemented `scrollTo` notices. The suite still completes with all tests passing.

## Validation Not Completed Locally

| Gate | Why it remains open | Required closure |
|---|---|---|
| Android compile | The host has no Java runtime. No native package was produced. | CI installs Temurin 21 and compiles Play/Galaxy debug flavors. Run signed store bundles only with release credentials. |
| Mac signing/notarization | Credentials and production service are external; native repackaging was not requested. | Smoke-test the HTTPS production client, then sign and notarize the downloadable beta. |
| Store purchases | Google and Samsung sandbox credentials, tester accounts, callbacks, refund feeds, and signing identities are external. | Complete each provider's pending, duplicate, restore, refund, offline, account-switch, and cross-device matrix independently. |
| Staging/production operations | Separate hosts, databases, secrets, log sinks, backups, and monitors do not exist inside the repository. | Provision environments and execute `LUMINAe_RELEASE_OPERATIONS_v1.0.md`. |
| Hosted release workflow | The current dirty worktree has not been pushed as a reviewed release candidate. | Run `.github/workflows/release-gates.yml` remotely and retain the web/API/data, live-game presentation, and both Android flavor results. |

## Human Gates

The following remain publication blockers even though supporting runtime and preview infrastructure exists:

- Trace and Recurrence pacing/comprehension/reduced-motion evidence.
- Triangulation pacing, both reference defeats, Rehearsal, mobile readability, audio, and frame-stability approval before adding it to `RELEASED_PRIMARY_CHRONICLE_IDS`.
- Every Lumii approach, remembered response, Black Market Key reset, early leave, withdrawal, defeat, victory, reconnect, interrupted reveal, and opened-hub state.
- Foundry and Worldshield manifestation clarity, simultaneous ordering, reconnect, mute, and reduced-motion behavior.
- A minimum of 12 external players across the full fresh-account journey.
- Keyboard/focus, screen-reader labeling, contrast, reduced-motion, and non-audio-meaning review.
- Low- and mid-range Android plus representative Samsung late-game frame validation with multiple Luminaries, Civilization rendering, Chronicles, and Blueprint effects.

## Market Optimization Pass

- Replaced Chronicle `0 / 1` preparedness readouts with `PREPARED` / `UNPREPARED` so the boss-story HUDs read as authored states rather than test counters.
- Compacted the first mobile Civilization teaching cue so the civilization portrait remains the primary visual; full causal detail is still available through Scan and the Archive.
- Added a mobile `Recovered` / `Sealed Records` switch to the opened Vault, preventing the shipping hub from becoming one long compressed desktop layout.
- Added `/dev/blueprint-presentation` for rapid, exact production-overlay review of Foundry and Worldshield with full/reduced motion and mute controls.
- Strengthened Foundry's launch reveal with a segmented orbital assembly ring, converging lift spines, and mantle platform built from low-cost SVG paths, opacity, and transforms rather than new media or particles.
- Added repeatable desktop/Android-portrait browser coverage for all launch-critical cinematic surfaces.

## Hard Publication Blockers

1. Resolve the remaining 157 partial provenance records and pass `pnpm run audit:assets:strict`. Authenticated billing proves paid Replit Agent use tied to Luminae, and the controller provided a dated confirmation of original/project-only inputs with no unlicensed outside references. The written agreement/model-terms request was submitted to Replit on 2026-08-25. Both formerly untraced Codex roots are now closed through retained session evidence. Clearance remains blocked pending Replit's response and release review; `LUMINAe_ASSET_CONTROLLER_ATTESTATION_v1.0.md` is optional if a formal signature is requested. The original 29-asset closure queue is fully closed; all Civilization plates, public icons/social media, documented audio, and replacement Antimatter plates are evidenced.
2. Complete and sign the human story/accessibility/device matrix.
3. Pass rollback-only migrations against staging restored from a production-like backup.
4. Pass Google Play and Samsung IAP sandbox matrices without double grants or reconciliation gaps.
5. Provision and verify production authentication, reconnect, WebSocket monitoring, backups, deletion processing, telemetry, and support operations.
6. Reach a clean reviewed release candidate with no unresolved P0/P1 defects, private Blueprint leaks, migration data loss, or material frame regression.

## Release Boundary

Launch ends at the stable opened Vault hub after Antimatter presentation. The First Charge, Basilisk continuation, later campaigns, competitive Blueprint approval, additional Blueprint/event authoring, final Lume calibration, iOS, true board-camera Luminary cinematic, and unreliable opening turn-order reveal remain post-publication by design.
