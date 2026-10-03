# Luminae Vertical Slice Validation

Date: 2026-09-10  
Branch tested: `codex/real-luminae`  
Candidate type: closed-playtest and demonstration vertical slice

## Release Position

The current candidate is ready for a controlled closed playtest. Automated evidence supports the core rules, responsive surfaces, presentation coordination, match completion, endgame inspection, rematch cleanup, and deterministic Civilization histories.

It is not yet evidence-backed for public commercial release. Asset provenance, real-player comprehension, real-device thermal behavior, and real-network multiplayer still require external validation.

## Changes Made During This Gate

- Added stable tutorial preview links based on beat IDs while retaining a development-only numeric fallback.
- Centralized the tutorial sequence version so runtime progress and browser fixtures cannot silently drift.
- Added lifecycle cleanup for timers, transient visual state, audio resources, camera ownership, and queued presentation state at game-over and rematch boundaries.
- Added development runtime diagnostics for camera, presentation, queue, animation, audio, DOM, and heap inspection.
- Fixed the collapsed postgame Action History bar so it no longer blocks bottom navigation.
- Added accessible, stable Forge and Encrypt action labels in compact and pending states.
- Expanded responsive verification to 320x568, 390x844, 768x1024, and 1440x900.
- Added a repeatable three-rematch performance gate on phone and desktop.
- Corrected the headless simulator to drain Luminary ordering, summoning, and activation events through the current resolution hierarchy.
- Added explicit simulator completion accounting so incomplete games can no longer be reported as successful balance samples.
- Added repeatable Civilization evidence capture for Base, Loadout A, and Loadout B on a shared dyad, scale, state, and camera.

## Automated Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Static release verification | Pass | Typechecks, 26 API files / 376 tests, 103 frontend files / 730 tests, production builds, Blueprint secrecy |
| Production budgets | Pass, narrow margin | Assets 35002.5/35840 KB; entry JS 199.1/200 KB gzip; global CSS 109.4/110 KB gzip |
| Presentation coordination | Pass | 8 frontend files / 52 tests; 3 API files / 7 tests |
| Prepublication surfaces | Pass | 66 applicable checks; 6 intentional desktop/tablet skips for phone-only controls |
| Required responsive widths | Pass | 320, 390, 768, and 1440 CSS pixels; no page overflow in Civilization evidence gate |
| Rematch lifecycle | Pass | Phone and desktop, initial match plus three rematches, real results-to-Civilization-to-rematch route |
| Headless match completion | Pass | 30/30 finished games: ten each at 2, 3, and 4 players |
| WebSocket idle stability | Pass | 60-second live connection gate |
| Action overlay geometry | Pass | Real Forge and Affinity response geometry |
| Dialog keyboard behavior | Pass in split run | 36 non-tutorial checks plus 6 tutorial checks after correcting the version fixture |
| Civilization identity proof | Pass | Four widths, Base plus two disjoint saturated 16-Artifact loadouts |
| Patch hygiene | Pass | `git diff --check` |

Expected test-environment warnings remain: JSDOM does not implement canvas and scrolling, Vite reports several source-map lookup warnings, and ESLint reports 14 existing React hook warnings without errors.

## Rematch Performance

Measurements were collected after garbage collection, comparing the first completed rematch with the third completed rematch.

| Metric | Phone delta | Desktop delta |
| --- | ---: | ---: |
| JS heap | +573,776 bytes | +488,856 bytes |
| DOM nodes | -3 | -24 |
| Active animations | 0 | -2 |
| Transient audio voices | 0 | -3 |
| Transient audio buses | 0 | 0 |
| Arrival, activation, antimatter buses | 0 retained | 0 retained |
| Camera/presentation/queued state | Clean | Clean |

These results do not show progressive resource growth across three rematches in the tested Chromium environments. They do not substitute for a thermal run on physical iPhones.

## Match Simulation

The corrected hard-AI sweep completed every game:

| Players | Completed | Average turns | Range | Average winner Eminence |
| --- | ---: | ---: | ---: | ---: |
| 2 | 10/10 | 55.8 | 49-64 | 21.1 |
| 3 | 10/10 | 82.4 | 78-93 | 22.7 |
| 4 | 10/10 | 105.9 | 92-117 | 22.2 |

This is completion evidence, not a balance verdict. The sample is too small for tuning decisions, and several Luminaries were never claimed in one or more player-count cohorts. A larger seeded balance study is still needed.

## Civilization Evidence

Evidence folder: `artifacts/qa/vertical-slice-2026-09-10`

- Base, Loadout A, and Loadout B use Echo Dyad, Galactic scale, stable state, no condition, and the same deterministic camera.
- Base has no Artifact manifestations.
- Loadout A and Loadout B each map 16/16 distinct Artifacts.
- The saturated loadouts produce visibly different placement, color, route, consequence, pin, deployment, and history compositions.
- Captures exist at 320, 390, 768, and 1440 CSS pixels.

Representative files:

- `desktop-1440-civilization-base.png`
- `desktop-1440-civilization-loadout-a.png`
- `desktop-1440-civilization-loadout-b.png`
- `phone-390-civilization-loadout-b.png`

## Risk Register

| Priority | Risk | Current evidence | Required disposition |
| --- | --- | --- | --- |
| P0 public release | 237 referenced media assets have partial or unresolved provenance | Asset audit: 454 total, 287 referenced/public, 50 verified, 237 partial, 0 missing | Resolve rights and attribution before public commercial distribution |
| P1 validation | New-player comprehension and effect readability are inferred, not observed | Automated accessibility and sequencing pass | Run the closed-playtest protocol with uncoached players |
| P1 validation | Physical iPhone heat, battery draw, and long-session frame pacing are unmeasured | Browser rematch heap and resource counts are stable | Run three-match physical-device thermal sessions |
| P1 validation | Real-network 2-4 human play is not covered end to end | Engine finishes 30/30; live browser rematch and WebSocket gates pass | Run remote multiplayer sessions under ordinary and degraded networks |
| P2 maintainability | Production budget headroom is under 1 MB assets, 1 KB entry JS gzip, and 1 KB CSS gzip | All budgets pass | Require budget review before adding assets or global styling |
| P2 maintainability | 14 React hook warnings remain, including presentation-sensitive game effects | Typecheck has zero errors; coordination and lifecycle gates pass | Resolve incrementally with focused behavioral tests, not broad dependency-array edits |
| P2 balance | Some Luminaries are rare or absent in small simulation cohorts | 30/30 games finish, but claim distribution warnings remain | Run larger seeded sweeps and compare to human strategy data |
| P3 tooling | Full dialog suite was validated as 36 existing passes plus 6 corrected tutorial passes, not one post-fix monolithic run | Both partitions pass | Let CI run the complete suite together before tagging a candidate |

## Launch Blockers

For closed playtesting: no known automated P0 or P1 failure remains.

For public commercial release:

1. Resolve media provenance.
2. Complete uncoached new-player comprehension testing.
3. Complete physical-device mobile performance and thermal testing.
4. Complete real-network multiplayer testing across 2-4 human players.
5. Run a statistically useful balance study and decide acceptable Luminary claim distributions.

## Post-Launch Opportunities

- Split the largest game and global entry chunks before adding major features.
- Replace remaining oversized PNG/JPEG runtime assets with right-sized AVIF/WebP variants.
- Eliminate hook warnings through tested ownership refactors.
- Add production telemetry dashboards for action response time, disconnects, abandoned matches, cinematic skips, rematch conversion, and device performance.
- Expand deterministic Civilization manifestations only after playtests show that players understand and revisit the current view.

