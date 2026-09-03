# LUMINAe Pre-Publication Release Gate v1.0

**Release target:** public early access on web, Google Play, and Samsung Galaxy Store. A signed downloadable Mac beta is parallel and non-blocking.

**Launch story boundary:** Tutorial -> standard play -> The Trace -> The Recurrence -> The Triangulation -> Lumii Defense Forecast -> Vault opening -> Antimatter Detonator presentation -> stable Vault hub.

**Explicitly later:** The First Charge, Basilisk continuation, later Chronicles and Blueprints, competitive Blueprint approval, final Lume calibration, iOS, true board-camera Luminary cinematics, and the unreliable opening turn-order reveal.

## Gate Meaning

- `IMPLEMENTED` means the repository contains the behavior and automated evidence.
- `HUMAN GATE` requires observed play evidence and cannot be approved by code alone.
- `EXTERNAL GATE` requires credentials, a deployed service, a storefront sandbox, or physical hardware.
- `BLOCKED` means public rollout must not proceed.

## 1. Release Baseline

| Gate | State | Evidence / remaining action |
|---|---|---|
| Integration branch | IMPLEMENTED | `codex/prepub-release`; preserves the dirty worktree as the current integration snapshot. `LUMINAe_PREPUBLICATION_WORKTREE_INVENTORY_v1.0.csv` records all 538 modified/untracked paths against base commit `7f2a09ff`. A clean release candidate still requires reviewed staging and commit history. |
| Version/build identity | IMPLEMENTED | Root/client version `0.1.0-early-access`; deterministic `LUMINAE_BUILD_STAMP`, release label, Android version code, and visible development identity. |
| Release environment contract | IMPLEMENTED | `.env.example` and `scripts/validate-release-environment.mjs`. Production native origins must be HTTPS and operator/support identity is mandatory. |
| CI release gates | IMPLEMENTED / REMOTE RUN PENDING | `.github/workflows/release-gates.yml`: static and canonical registry checks, tests, rollback-only migration fixtures, web/API build, budgets, Blueprint secrecy, desktop/Android-portrait launch surfaces, an ephemeral live-game dialog/geometry/WebSocket job, both Android flavors, asset inventory, and tracked-file cleanliness. Chromium installation is explicit. Run it after producing a reviewed candidate. |
| Staging and production infrastructure | EXTERNAL GATE | Provision physically separate databases, secrets, hostnames, store service accounts, logging destinations, and build labels. Do not share purchase credentials or data stores. |
| Asset rights | BLOCKED / EVIDENCE PATH ACTIVE | Of 204 referenced/public media files, 47 are verified, 157 have partial origin evidence, and none lack a usable provenance record. Authenticated billing proves paid Agent use associated with Luminae; the project controller has provided a dated confirmation of original/project-only inputs with no unlicensed outside references. A written agreement/model-terms request was submitted to Replit on 2026-08-25. Both formerly untraced Codex project references are now resolved to retained first-party/Codex chains. Final clearance requires Replit's response and release review; `LUMINAe_ASSET_CONTROLLER_ATTESTATION_v1.0.md` is optional if the reviewer requests a formal signature. The original 29-asset closure queue is fully closed; all public-brand, Civilization, audio-replacement, and Antimatter-plate work is evidenced. |

## 2. Story Progression

| Gate | State | Evidence / remaining action |
|---|---|---|
| Sequential fail-forward framework | IMPLEMENTED | Server-owned Chronicle definitions and immutable primary outcomes; defeat advances principal progression. |
| The Trace | HUMAN GATE | Runtime says `released: true`; complete the vertical-slice pacing, comprehension, reduced-motion, defeat, and persistent-record evidence sheet. |
| The Recurrence | HUMAN GATE | Runtime says `released: true`; complete equivalent human evidence rather than treating the flag as approval. |
| The Triangulation | BLOCKED / HUMAN GATE | Correctly remains `released: false` and outside `RELEASED_PRIMARY_CHRONICLE_IDS`. Approve only after both reference defeats, Rehearsal, pacing, comprehension, mobile, reduced-motion, audio, and frame-stability checks. |
| Three-Chronicle Threshold gate | IMPLEMENTED | `CampaignProgressProjection.thresholdAvailable` requires primary outcomes for all three opening Chronicles. The Black Market Key bypasses only five qualifying wins. |
| Lumii encounter matrix | HUMAN GATE | Automated state support exists; exercise all approaches, remembered dialogue, key reset, early leave, withdrawal, defeat, victory, reconnect, interrupted reveal, and opened hub. |
| Launch ending | IMPLEMENTED | Vault node reports `The First Charge` as `pending_release`; the opened hub presents later records as unavailable/corrupted rather than actionable. |

## 3. Civilization Teaching

Implemented teaching sequence:

1. First Forge introduces the Civilization portrait as the visible consequence of implemented Artifacts.
2. First inspection explains deployment sites, historical imprint, current operational capability, Stability, Conditions, and causal dossiers.
3. The opening Chronicles demonstrate contextual choices, persistent history, immutable records, and remembered relationship state.
4. First record closure explains Civilization Outcome and earned Lume.
5. Vault/Blueprint copy distinguishes automatic Project manifestation from separate trigger or activation rules.
6. The Archive provides a replayable reference without lengthening the guided tutorial.

Release gate: run the fresh-account journey without developer state and confirm every explanation appears once, remains available in the Archive, and does not obscure ordinary play.

Market-facing presentation is now normalized around semantic state rather than debug-like counters: Chronicle preparedness reads `PREPARED` or `UNPREPARED`, the first mobile Civilization cue is compact enough to preserve the portrait, and deeper explanation remains available through Scan and the Archive.

## 4. Opening Blueprints

| Gate | State | Evidence / remaining action |
|---|---|---|
| Canonical outer trio | IMPLEMENTED | Antimatter Detonator, Mantle-to-Orbit Foundry, Worldshield Covenant. Ascension Registry remains registered but is not in `OUTER_VAULT_BLUEPRINT_IDS` or Lumii's scenario setup. |
| Anonymous protocol projection | IMPLEMENTED / SECURITY GATE | Public server projection emits sealed slot IDs and neutral consequences. `verify:blueprint-secrecy` rejects identities in eager chunks, semantic sealed filenames, and service-worker precaching; `/cards/lore` exposes practical capabilities without Blueprint families. Complete packet-level reconnect and scenario inspection during staging. |
| Antimatter presentation | IMPLEMENTED | Dedicated manifestation and detonation timelines, audio, queueing, timer suspension, and reduced-motion path. |
| Foundry and Worldshield presentation | IMPLEMENTED / HUMAN GATE | Dedicated manifestation overlays and sounds exist. `/dev/blueprint-presentation` renders the exact production overlay for either Project in full or reduced motion. Approve timing, clarity, ordered simultaneous manifestation, reconnect, mute, and reduced motion. |
| Competitive use | IMPLEMENTED | Disabled unless `BLUEPRINT_COMPETITIVE_ENABLED=true`; do not set it in launch production. Campaign and permitted Custom modes only. |
| `0/50` competitive match gate | POST-PUBLICATION | Not a launch blocker while competitive Blueprints remain disabled. |

## 5. Lume And Commerce

| Gate | State | Evidence / remaining action |
|---|---|---|
| Spendable Lume terminology | IMPLEMENTED | Runtime/API/UI use `lumeBalance`; migration preserves former balance. |
| Immutable ledger | IMPLEMENTED | Earned, purchased, granted, spent, and refunded sources are separate; historical-quality `totalLume` remains distinct. |
| Native packs | IMPLEMENTED | 100, 300, and 700 Lume product mappings; localized storefront price is authoritative. Web/Mac expose no real-money checkout. |
| Key purchase/reset | IMPLEMENTED | Black Market Key spends Lume once; activation resets encounter memory and exit restores the five-win requirement when unmet. |
| Google verification | EXTERNAL GATE | Configure service-account access/package identity, complete licensed tester purchases, pending flows, acknowledgement/consumption, duplicate token, restore, refund, offline, and account-switch tests. |
| Samsung verification | EXTERNAL GATE | Configure IAP service account/access token/package identity and run the equivalent Galaxy sandbox matrix. |
| Refund reconciliation | IMPLEMENTED / EXTERNAL GATE | Backend records idempotent negative ledger entries and blocks spending at insufficient balance. Schedule and monitor reconciliation with production credentials. |

## 6. Platform Clients

| Gate | State | Evidence / remaining action |
|---|---|---|
| Google Play shell | IMPLEMENTED / EXTERNAL GATE | Capacitor `play` flavor and Kotlin Play Billing adapter. CI compiles debug; signed bundle and store review require credentials. |
| Galaxy Store shell | IMPLEMENTED / EXTERNAL GATE | Capacitor `galaxy` flavor and Kotlin Samsung IAP adapter. CI compiles debug; signed bundle and store review require credentials. |
| Mac beta | IMPLEMENTED / EXTERNAL GATE | Production wrapper loads only an HTTPS deployed client and does not start pnpm or a local database. Signing/notarization and production-service testing remain. |

## 7. Safety, Compliance, And Operations

- Teen/13+, not child-directed positioning is present in policy copy; submit truthful store questionnaires and obtain human legal review.
- Privacy, Terms, Conduct, refund, support, and public deletion pages are implemented. Production builds require a real operator name and monitored support email.
- Invitation-room chat requires authentication and has mute, block, report, contact/link filtering, rate limiting, and moderation records.
- Authentication/password-reset/purchase rate limits, origin allowlist, CSP/HSTS, log redaction, request-size limits, and protected operational health are implemented.
- First-party operational telemetry is pseudonymous, bounded to an allowlist, and excludes advertising identifiers. Verify the deployed privacy disclosure against actual hosting/email telemetry.
- Backups, restore drills, migration rollback, purchase reconciliation, incident handling, account-deletion processing, and WebSocket monitoring are runbook requirements in `LUMINAe_RELEASE_OPERATIONS_v1.0.md`.

## 8. Human And Device Validation

Automated pre-publication composition coverage now checks Trace, Recurrence, Triangulation, Lumii threshold, the opened Vault, Civilization portrait/Scan, Foundry, and Worldshield on desktop and Android portrait. Live-room coverage adds 42 mobile keyboard-dialog checks, source-aware Harness/Encryption/Forge geometry at 390 x 844, and a 60-second game/HMR WebSocket idle test. It verifies visible landmarks, horizontal containment, absence of debug-like `0 / 0` and `0 / 1` labels, compact mobile Civilization guidance, mobile Scan and Vault navigation, focus containment, and uncaught page errors. This reduces but does not replace the human gates below.

Public rollout is blocked until all are signed off:

- [ ] At least 12 external players complete fresh-account sessions.
- [ ] Every Chronicle authored choice is observed.
- [ ] Both Triangulation reference defeats and Rehearsal are observed.
- [ ] All Lumii approaches plus leave, withdrawal, defeat, and victory are observed.
- [ ] Desktop web and Android portrait are covered with mute and reduced motion.
- [ ] Interrupted sessions, poor connections, and reconnect restoration are covered.
- [ ] Low- and mid-range Android plus representative Samsung hardware show no material late-game frame regression with multiple Luminaries, Civilization scenes, Chronicles, and Blueprint effects.
- [ ] Play and Galaxy purchase matrices are signed off independently.
- [ ] Accessibility review covers keyboard/focus, screen-reader labels, contrast, reduced motion, and non-audio meaning.
- [ ] No unresolved P0/P1, private Blueprint leak, double-grant, data-loss migration, or material late-game frame regression remains.

## Publication Order

1. Validate migrations against a production-like staging backup.
2. Deploy staging and complete automated, human, device, and store-sandbox gates.
3. Back up production and deploy compatible migrations before applications.
4. Release web to a small public cohort.
5. Proceed through Play internal/closed testing and Galaxy beta.
6. Stage Android public rollout while monitoring auth, reconnects, progression, Lumii, crashes, frames, and purchase reconciliation.
7. Publish the Mac beta independently after signing/notarization and production-service validation.
