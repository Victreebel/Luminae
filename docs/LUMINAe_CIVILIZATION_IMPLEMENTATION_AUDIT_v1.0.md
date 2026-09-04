# LUMINAe Civilization Implementation Audit v1.0

## 1. Audit Identity

| Field | Audited value |
|---|---|
| Repository | `/Users/chaoscalligraphy/.codex/worktrees/4aa4/Lumiane` |
| Git state | Detached `HEAD` |
| Commit SHA | `7f2a09ff08a7f325363c413963b4f5ce08eb74c2` |
| Commit subject | `Merge remote-tracking branch 'origin/main' into codex/real-luminae` |
| Commit date | `2026-08-01T22:35:44-07:00` |
| Audit date | 2026-08-23 EDT |
| Audited tree | The commit above plus the dirty working state present during the audit |
| Civilization authority | Civilization Layer Final Codex Audit Handoff v1.1 |
| Runtime authority | Current shared, server, client, and persistence sources in this working tree |

This is not an audit of a clean release snapshot. At the audit baseline, `git status --short` contained 119 modified tracked files and 122 untracked files. Untracked Civilization files were treated as current dirty implementation evidence, not as absent or hypothetical work. After creating the three permitted audit deliverables, the tracked-modification count remained 119 and the untracked count became 125.

### Evidence confidence

| Label | Meaning |
|---|---|
| **strong source** | Current canon and/or production runtime directly establishes the finding. |
| **partial source** | Relevant implementation exists, but ownership, reachability, or semantics are incomplete. |
| **stale source** | Evidence comes from a superseded document, registry, test, or implementation path. |
| **runtime-only** | Current behavior is clear, but no current canonical endorsement was found. |
| **missing evidence** | The required state or behavior is not represented in inspected sources. |

### Commands and validation posture

The audit used static, read-only inspection: `git status`, `git rev-parse`, `git log`, `rg`, `rg --files`, `sed`, `nl`, `wc`, and a Node/TypeScript AST extraction of static Artifact registries. The CSV was generated from source data and then manually annotated for canon and metadata conflicts.

Tests and typechecks were not executed. The repository was already substantially dirty, and no reviewed script contract guaranteed that test caches, generated files, snapshots, or other worktree state would remain untouched. Relevant test files were inspected instead. No migration, seeder, formatter, code generator, dependency command, simulator, native packager, or write-uncertain script was run.

### Scope limitations

- The external canon directory `/Users/chaoscalligraphy/Documents/Lumiane/docs` was readable and was cross-referenced. It is outside the audited Git worktree, so its files do not share the recorded commit identity.
- The current working tree contains interdependent tracked and untracked work. Reachability is reported from static import and route inspection; it is not a clean-build certification.
- Runtime behavior was not exercised. Findings about execution are based on source flow and existing tests.
- Exact formulas and registries marked Deferred in the handoff remain unresolved by design.
- This audit does not authorize changes to mechanics, balance, schemas, assets, copy, rewards, or runtime behavior.

### Completion checks

- The Artifact CSV imported successfully as `A1:S91` through the bundled spreadsheet engine: 19 columns, 90 data rows, and 90 unique IDs.
- Direct comparison with `gameEngine.ts:CARD_CATALOG` found 90 runtime IDs, no missing or extra CSV IDs, and identical registry order. Tier counts are 40/30/20.
- The Blueprint audit covers all three runtime IDs, the canonical missing Ascension Registry, all 20 deferred concept-vault Projects, and the 22-entry historical roster as stale evidence.
- Hidden Blueprint leakage, color/terminology drift, Maturity/Reach conflation, Damage/Annihilation conflation, and legacy backfill truthfulness received explicit findings.
- The pre-write status had 119 modified and 122 untracked entries. The post-write status has 119 modified and 125 untracked entries; the only delta is the three permitted untracked audit files.
- No runtime, schema, migration, test, asset, generated, dependency, balance, reward, or behavior file was written.

## 2. Executive Verdict

**Verdict: `GO WITH RECONCILIATION`**

The current scene system is a useful visual prototype and integration substrate, but it is not yet the canonical Civilization system. Approximately 60-70% of the presentation substrate is reusable: scale-aware deployment sites, scan dossiers, authored plates, recent-Forge traces, Blueprint hero treatments, atmospheric Luminary influence, mobile pin caps, and low-cost rendering policies. Approximately 35-45% of the total required architecture is reusable because the causal domain, persistence, outcome, and reward layers are largely absent.

The single most important dependency before implementation is a shared, backend-owned Civilization lifecycle model that distinguishes historical discovery, operational implementation, temporary Damage, permanent Annihilation, historical Maturity, and current Reach. Stability, contextual resolution, persistence, rendering, and truthful records all depend on that distinction.

### Highest-risk mismatches

1. **Presentation is standing in for domain state.** `game.tsx` derives the live portrait from forged cards and public devices client-side; there is no authoritative `CivilizationState` or causal resolution engine. **Strong source.**
2. **Kardashev progression is incorrectly used as Civilization Maturity.** `getKardashevTier` advances on a single sufficiently high-tier Forge and feeds both naming and scene scale. **Strong source; conflict.**
3. **Stability, Conditions, worlds, current Reach, and historical Maturity do not exist as canonical runtime primitives.** **Missing evidence.**
4. **Damage/Annihilation semantics are not separated from discovery and protected history.** Owned-Artifact annihilation removes implementation data and subtracts already-earned Eminence. **Strong source; conflict.**
5. **No immutable Civilization Record, Civilization Outcome, or Lume assessment exists.** Account history stores aggregates and match result/Eminence, not a reconstructable civilization. **Strong source; missing.**
6. **All 20 Tier III runtime identities conflict with Technology v2 canon.** The mechanical slots remain usable, but names, forms, lineage, and semantic meaning are stale. **Strong source; conflict.**
7. **Blueprint canon and runtime diverge.** Runtime uses an older Foundry effect and gives Lumii Worldshield rather than canonical Ascension Registry. **Strong source; conflict.**
8. **Strict Blueprint secrecy is not bundle-safe.** Server projection protects live private state, but complete static definitions and recipes are imported into client modules. **Strong source; partial.**
9. **Affinity rendering lacks canonical dyads, third-Affinity grammar, and plural identity.** Singularity also receives lavender rather than the canonical white family. **Strong source; conflict/partial.**
10. **The primary scene component is an 11,134-line untracked file with a hidden legacy scene still mounted.** This creates ownership, review, and performance risk despite otherwise careful rendering limits. **Strong source; dirty implementation evidence.**

## 3. Current Architecture Map

### 3.1 File and ownership classification

| Area | Files or groups | Classification | Audit finding |
|---|---|---|---|
| Primary scene | `artifacts/luminae/src/components/CivilizationScenePanel.tsx` | Current dirty production implementation; untracked | Routed into the game and feature-rich, but not part of the recorded commit and highly over-coupled. |
| Legacy scene | `artifacts/luminae/src/components/KardashevScene.tsx` | Tracked modified production/legacy | Still used by game-over/cinematic paths; not dead. Its Type I/II/III ontology is obsolete for Civilization Maturity. |
| Scene derivation | `civilizationArtworkScale.ts`, `civilizationDeploymentSites.ts`, `civilizationArchetypes.ts`, `civilizationArtRegistry.ts`, `civilizationVisualSignatures.ts` | Current dirty implementation; untracked | Strong reusable presentation substrate; several inputs remain tied to obsolete Kardashev tier or incomplete metadata. |
| Existing profile | `artifacts/luminae/src/lib/civilizationProfile.ts` | Tracked modified production | Hardcoded 12-trait visual profile; no canonical dyad/third-Affinity grammar. |
| Legacy progression | `artifacts/luminae/src/lib/kardashev.ts` | Tracked modified production | Calculates Type I/II/III from card tier and supplies palettes/names. Coupled to obsolete assumptions. |
| Game integration | `game.tsx`, `game-tabs.tsx`, `game-civilization-preview.tsx`, `game-civilization-utils.ts` | Production integration | Builds portrait from current public game state; miniature is paused; recent Forge traces are client/session feedback. |
| Preview | `artifacts/luminae/src/pages/dev-civilization-scene.tsx` | Development-only scaffold; untracked | Useful review bench; no server mutation. |
| Civilization assets | `artifacts/luminae/src/assets/civilization/*` (27 plates) | Current dirty visual assets; untracked | Authored bitmap plate strategy is performance-compatible; import strategy is eager. |
| Civilization tests | `components/__tests__/CivilizationScenePanel.test.tsx`, `lib/__tests__/civilization*.test.ts`, `pages/__tests__/game-civilization-preview.test.tsx`, `components/__tests__/KardashevScene.timing.test.ts` | Test-only, mostly untracked | Strong presentation coverage; some tests preserve obsolete Kardashev assumptions. |
| Artifact mechanics | `artifacts/api-server/src/lib/gameEngine.ts` (`CARD_CATALOG`, `CARD_MAP`) | Authoritative shipped runtime behavior | 90 slots; 40 Tier I, 30 Tier II, 20 Tier III. Registry ownership conflicts with Technology v2's stated shared source. |
| Artifact semantics | `artifacts/api-server/src/lib/cardLore.ts` | Production runtime metadata | 90 lore records and useful form/scale/lane fields; Tier III semantics are stale. |
| Blueprint types | `lib/game-types/src/index.ts` | Shared production registry | Three runtime Blueprint IDs and definitions; no Ascension Registry. |
| Blueprint rules | `gameEngine.ts`, `routes/blueprints.ts`, `stateProjection.ts` | Backend production | Automatic manifestation, effects, Lumii pool, secrecy projection, and persistence hooks. Several rules conflict with Blueprint v2. |
| Blueprint UI/assets | `components/blueprints/*`, `assets/blueprints/*`, Blueprint dev pages | Production and development presentation | Dedicated Antimatter/Foundry treatment; static definitions are present in the client bundle. |
| Live persistence | `lib/db/src/schema/gameStates.ts` | Backend production schema | Versioned JSONB game state; additive Civilization state is feasible. |
| Account persistence | `lib/db/src/schema/accounts.ts`, `accountProgress.ts`, `accountArchive.ts`, `finishedGame.ts` | Backend production | Aggregate artifacts, Luminaries, Blueprints, Chronicle/account rollups; no immutable civilization records. |
| Migrations | `0008_blueprint_account_foundation.sql`, `0014_account_chronicles.sql` | Historical production migrations | Blueprint and Chronicle account state only; no Civilization schema. |
| Canon/worktree docs | `docs/LUMINAe_CIVILIZATION_LAYER_DIRECTION_v0.1.md`, old Technology/Blueprint/Artifact docs | Historical design evidence | Useful provenance but superseded where current external canon or handoff differs. |
| Generated clients | API-generated schemas/clients referencing shared game state | Generated integration | No independent Civilization domain model; must follow future additive API changes. |

No separate generic Civilization action/economy prototype was found. No per-world Food, Production, Happiness, worker-placement, or Civilization-point system was found.

Independent search also classified the following cross-boundary references:

- `artifacts/luminae/src/App.tsx` is the production route owner for the game and development preview routes.
- `artifacts/luminae/src/components/archive/AccountArchive.tsx` and its test are production account-history presentation, not a Civilization Record implementation.
- `artifacts/luminae/src/components/vault/*`, `pages/dev-blueprint-vault.tsx`, and `pages/dev-blueprint-card.tsx` are Blueprint campaign/presentation surfaces; they do not supply general Civilization state.
- `artifacts/api-server/src/lib/blueprintClearance.ts`, `blueprintLoadouts.ts`, `routes/blueprints.ts`, and their tests are production Blueprint account/scenario infrastructure.
- `artifacts/api-server/src/lib/storeCatalog.ts` exposes Blueprint-adjacent store unlocks; it does not define a Project.
- `artifacts/api-server/src/lib/turnTimer.test.ts` contains a Blueprint timing fixture but no Civilization domain behavior.
- `artifacts/api-server/src/scripts/simulateBlueprints.ts` is a simulation utility and was inspected, not run.
- `lib/api-spec/openapi.yaml`, `lib/api-client-react/src/generated/api.schemas.ts`, and `lib/api-zod/src/generated/api.ts` are specification/generated mirrors of the current three-ID Blueprint contract.
- `artifacts/luminae/src/assets/blueprints/*` and `assets/audio/Blueprints/*` are production presentation assets. They contain Antimatter and Foundry material but no Ascension Registry treatment.
- Blueprint tests under `components/blueprints/*test.tsx`, server `blueprintEngine.test.ts`, `stateProjection.test.ts`, `blueprintClearance.test.ts`, and Vault encounter tests are test-only evidence and were not executed.
- Worktree and external `LUMINAe_*BLUEPRINT*`, Technology, Artifact, lore, lineage, mapping, and Civilization documents were classified by source precedence in Section 4; none is runtime code.

### 3.2 Rendering flow

```text
Public game state
  -> forged Artifact IDs, public Blueprint devices, Luminary alliances,
     scenario protocols, recent Forge session trace
  -> getKardashevTier + getDominantAffinityPalette
  -> buildCivilizationDeploymentSites
  -> profile / archetype / visual-signature selection
  -> CivilizationScenePanel
       cinematic mode
       scan mode and capped pins
       surface / orbit / stellar / galaxy zoom levels
       compact dossier and Artifact sheet handoff
  -> paused low-DPR Civilization miniature on the board
```

`game.tsx:3421-3483` performs the core derivation on the client. `game-tabs.tsx:263-269` maps Kardashev tiers to Planetary/Stellar/Galactic display language and `game-tabs.tsx:339` labels the live tab `Civilization Record`, although no immutable record exists. `civilizationDeploymentSites.ts:1043-1075` builds sites from current inputs. `CivilizationScenePanel.tsx:10475-10650` limits, clusters, selects, and focuses scan sites.

### 3.3 Visual derivation

- `civilizationArtworkScale.ts` establishes a credible scale grammar from tabletop through galactic depictions. This is the strongest scale-honesty substrate.
- `civilizationDeploymentSites.ts:524-561` derives depiction scale from lore/art form, then falls back to card tier. That fallback risks turning mechanical tier into physical scale.
- `civilizationDeploymentSites.ts:466-470,1054` maps scene band directly from `KardashevTier`, so the overall camera/maturity level still follows the obsolete progression model.
- Blueprint treatments at `civilizationDeploymentSites.ts:878-919` depict environmental consequences rather than giant cards.
- Luminary treatments at `civilizationDeploymentSites.ts:922-965` are atmospheric/institutional signals, not owned bodies. This matches the handoff.
- Anonymous scenario protocols at `civilizationDeploymentSites.ts:968-998` avoid identity leakage in scene copy.
- Chronicle-site support exists as scaffold around `civilizationDeploymentSites.ts:1008`, but the production game integration does not supply Chronicle records.
- The scene caps visible sites to six desktop/four mobile and uses transforms, opacity, SVG, and authored plates. The hidden `MarketCivilizationScene` mounted at `CivilizationScenePanel.tsx:10835` is an avoidable duplicate-render risk.

### 3.4 Domain and rules state

`PlayerGameState` at `gameEngine.ts:263-301` owns affinities, permanent bonuses, Eminence, forged/reserved Artifacts, Forge counts, Blueprint states, and Luminary state. `GameStateData` at `gameEngine.ts:357-468` owns board, turn, scenario, global effects, and `annihilatedArtifactIds`.

The inspected model has no:

- `CivilizationState`;
- homeworld or additional-world entity;
- implementation entity distinct from a forged-card record;
- Condition registry or entity Conditions;
- Stability state or contributor graph;
- historical Maturity distinct from current Reach;
- pressure tags or Artifact capability tags;
- contextual Civilization resolution state;
- Civilization Outcome or Lume assessment.

Blueprint effects are the closest existing contextual system. Exact components manifest automatically at `gameEngine.ts:1420-1475`. Antimatter intercepts Forge/Encrypt claims at `gameEngine.ts:1516-1617`, called before ordinary claim completion at `gameEngine.ts:3728-3803`. That is a useful exceptional-content hook, but it is Project-specific rather than a general causal Civilization pipeline.

### 3.5 Persistence and closure

- `game_states.state` is versioned JSONB at `lib/db/src/schema/gameStates.ts:5-10`; new live fields can be additive.
- Account Blueprint and Chronicle tables at `lib/db/src/schema/accounts.ts:145-287` preserve unlock/progression aggregates, not per-civilization history.
- `accountProgress.ts:327-467` finalizes non-withdrawal rooms and `accountProgress.ts:471-521` backfills account aggregates from old game JSON.
- `finishedGame.ts:14-47` excludes withdrawals from normal rollup and suppresses Lumii rematch handling.
- `lib/game-types/src/index.ts:579-660` exposes aggregate archive Artifact/Luminary/Chronicle summaries and match result/Eminence, not a Civilization Record.

Old matches can support truthful aggregate statements where raw game JSON survives. They cannot truthfully reconstruct unrecorded worlds, Conditions, Stability contributors, contextual choices, Damage history, Agency, Continuity, or Lume rationale.

## 4. Canon And Source Reconciliation

### 4.1 Authority order used

1. Civilization Layer Final Codex Audit Handoff v1.1 for Civilization doctrine.
2. Current external canon where it governs its own subsystem.
3. Runtime registries for actual shipped/provisional mechanics.
4. Worktree historical documents for provenance only.

Runtime was never allowed to override contradictory Civilization doctrine.

### 4.2 Current canonical sources inspected

| Source | Role | Finding |
|---|---|---|
| `/Users/chaoscalligraphy/Documents/Lumiane/docs/LUMINAe_LORE_BIBLE_v1.0.md` | Cosmology and narrative canon | Current external canon input. |
| `LUMINAe_TECHNOLOGY_SYSTEM_v2.0.md` | Artifact ontology and canonical identities | Artifacts are mastered bounded capabilities; discovery differs from implementation; Built On is lineage, not a normal prerequisite. |
| `LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md` | Terminology and reconciliation | Domain replaces old Reach cosmology; Operational Reach differs from literal Kardashev; Damage differs from Annihilation; legacy records must not be fabricated. |
| `LUMINAe_TECHNOLOGY_LINEAGE_MATRIX_v2.0.md` | Canonical lineages | Current Built On relationships and the 20 replacement Tier III identities. |
| `LUMINAe_MECHANIC_TO_LORE_MAPPING_v1.0.md` | Mechanics/lore boundary | Operational Reach derives from calibrated breadth; a single Forge does not establish Kardashev or Maturity. |
| `LUMINAe_ARTIFACT_BALANCE_BASELINE_v1.0.md` | Mechanical baseline | All 90 slots are mechanically healthy; semantic reconciliation must not become unauthorized balance work. |
| `LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v2.0.md` | Current Blueprint rules | Newer than the requested v0.2; includes Antimatter, Foundry, Ascension, and later Worldshield placement. |
| `LUMINAe_UNIFIED_LORE_ARTIFACT_REFERENCE_v1.0.md` | Cross-reference | Useful canonical identity evidence. |
| `LUMINAe_CIVILIZATION_SYSTEM_GUIDE_v1.0.md` | Historical/adjacent Civilization direction | Secondary where it conflicts with the handoff. |
| `LUMINAe_FUTURE_PROJECT_CONCEPT_VAULT_v1.0.md` | Deferred Project concepts | Non-production concept inventory, not playable canon. |

### 4.3 Superseded or stale sources

- Worktree Technology v1 and earlier Civilization Direction documents are historical where Technology v2 or this handoff differs.
- `LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v0.2.md` and `LUMINAe_BLUEPRINT_VERTICAL_SLICE_v1.0.md` preserve earlier rules and remain useful provenance, but Blueprint v2 is newer.
- `LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.4_UTILITY_FIRST_LORE.md` and `LUMINAe_ARTIFACT_AUDIT_v1.0.md` are useful for Tier I/II provenance, not final source precedence.
- Runtime `cardLore.ts` still labels Tier III as v1-style megastructures. All 20 names/forms conflict with Technology v2.
- Technology v2 describes `@workspace/game-types` as the authoritative Artifact registry, but actual mechanics live in server-private `gameEngine.ts:CARD_CATALOG`. This source-ownership contradiction should be corrected before metadata becomes a rules dependency.

## 5. Requirement Matrix

| Requirement | Current implementation | Status | Evidence/confidence | Required change | Risk | Blocking phase |
|---|---|---|---|---|---|---|
| Premium portrait first | Authored plates, layered views, scan-off default | `PARTIAL` | `CivilizationScenePanel.tsx`; strong dirty source | Stabilize ownership and replace placeholder/generic morphology with canonical state inputs | Medium | 8 |
| Inspectable causal interface | Dossiers explain rendered sites, but causes are inferred from cards | `PARTIAL` | deployment sites + game integration; strong source | Supply backend causes, lifecycle, contributors, and resolution explanations | High | 1, 3, 4 |
| Rare consequential decision surface | No general Civilization decision system | `MISSING` | missing evidence | Add contextual resolution windows only for exceptional content | High | 4 |
| No second economy/generic actions | No such runtime system found | `SUPPORTED` | independent search; strong negative evidence | Preserve boundary | Low | all |
| Deterministic preparation and inspectable uncertainty | Project-specific deterministic effects exist; no general pipeline or odds explanation | `PARTIAL` | Blueprint runtime-only | Add tagged trajectory/execution/uncertainty model | High | 4 |
| Homeworld plus exceptional additional worlds | Visual world levels exist; no world entities | `MISSING` | renderer partial, domain missing | Add homeworld/entity state without routine economic ledgers | High | 1, 6 |
| Automatic Artifact placement | Sites are derived automatically | `SUPPORTED` | `buildCivilizationDeploymentSites`; strong source | Preserve, then feed authoritative deployment state when exceptional location matters | Low | 8 |
| No routine propagation minigame | None found | `SUPPORTED` | independent search | Preserve | Low | all |
| Entity state and Conditions | No canonical entity lifecycle or Conditions | `MISSING` | missing evidence | Add shared entity state and minimal registry | High | 1, 3 |
| Stability sole universal track | No Stability state/UI/calculation | `MISSING` | missing evidence | Add computed global Stability and contributor graph | Critical | 3 |
| Cause-based recovery | No cause model or repair lifecycle | `MISSING` | missing evidence | Resolve source Conditions/capabilities, then recalculate | High | 3, 4 |
| Harm hierarchy | Blueprint annihilation exists without general Damage/Condition hierarchy | `PARTIAL` | `gameEngine.ts:1478-1497`; strong source | Separate operational disablement, terminal loss, and protected history | Critical | 1, 3 |
| Discovery/implementation/Damage/Annihilation distinction | Forged record is used as implementation and historical record | `CONFLICT` | strong source | Introduce explicit lifecycle; never erase discovery | Critical | 1 |
| Earned Eminence protected | Annihilation subtracts Artifact Eminence | `CONFLICT` | `gameEngine.ts:1480-1494`; strong source | Preserve earned Eminence while disabling active capability/bonus | Critical | 1, 4 |
| Historical visual imprint stable under Damage | Current palette reads active forged list | `MISSING` | `getDominantAffinityPalette`; strong source | Separate accumulated imprint from operational capability set | High | 1, 2, 8 |
| Identity from natural-Affinity durable capability | Palette counts forged bonus Affinities | `PARTIAL` | `kardashev.ts:229-255`; strong source | Exclude disabled operation for aptitude while preserving historical imprint | Medium | 2 |
| Canonical dyad/third/plural grammar | Generic primary/secondary palettes and names only | `MISSING` | `kardashev.ts:119-255`; strong source | Add canonical dyads, confidence, third modifier, mixed fallback | High | 2, 8 |
| Singularity excluded from natural identity | Singularity can be a palette/name family | `CONFLICT` | `kardashev.ts:11-18,119-211`; strong source | Remove from Civilization identity derivation; retain separate white treatment only where needed | High | 2, 8 |
| Canonical color families | Radiance is pale gold; Singularity is lavender | `CONFLICT` | `kardashev.ts:11-18`; strong source | Keep Radiance gold/yellow; move Singularity to white, never gold | Medium | 8 |
| Flux is Flare x Continuum | No `flux` collision found, but canonical Flux identity is absent | `PARTIAL` | independent search; strong negative evidence | Reserve `Flux` for dyad and avoid legacy namespace collision | Medium | 2 |
| Pressure tags and causal resolution pipeline | No bounded tags or generic pipeline | `MISSING` | missing evidence | Add shared metadata and authored resolution contract | High | 4, 5 |
| Artifacts provide qualitative capability | Lore has practical text but no operational tags | `PARTIAL` | `cardLore.ts`; partial source | Normalize tags after ontology/source reconciliation | High | 5 |
| 90 Artifact semantic readiness | 90 runtime slots; 70 partial, 20 canon conflicts | `PARTIAL` | companion CSV; strong source | Reconcile source ownership, Tier III identities, and missing tags | High | 5 |
| Automatic exact Blueprint manifestation | Implemented in assigned order | `SUPPORTED` | `gameEngine.ts:1420-1475`; strong source | Preserve | Low | 4, 5 |
| Hidden Blueprint identity | Server state projection is private/anonymous; static client catalog is datamineable | `PARTIAL` | `stateProjection.ts`; client imports; strong source | Split owner/public presentation metadata from server-only recipes | High | 5, 8 |
| Project capacity distinct from use | Antimatter and Worldshield have triggered use; Foundry auto-discount | `PARTIAL` | Blueprint audit; strong source | Reconcile each Project with v2 governance/use semantics | High | 4, 9 |
| Antimatter trap, not choose-opponent attack | Secret target and Forge/Encrypt interception implemented | `CONFLICT` | `gameEngine.ts:1516-1617`; strong source | Preserve trap structure; resolve doctrine conflicts for victim, Damage, and Eminence | Critical | 4, 9 |
| Chronicle means authored campaign episode | Chronicle account data exists; scene site is unconnected scaffold | `PARTIAL` | accounts + deployment builder; partial source | Keep standard exceptional systems separately named | Medium | 4, 6, 9 |
| Luminaries as persons/influence | Scene renders atmospheric/institutional effects, not bodies | `SUPPORTED` | `civilizationDeploymentSites.ts:922-965`; strong source | Preserve | Low | 8 |
| Derived Civilization Maturity | A single Tier II/Tier III/free Forge advances Type | `CONFLICT` | `kardashev.ts:83-106`; strong source | Replace with breadth/scale/Project/accomplishment evidence | Critical | 2 |
| Historical Maturity non-regression | No historical Maturity field | `MISSING` | missing evidence | Persist monotonic maximum separately from current Reach | Critical | 1, 2, 6 |
| Maturity/current Reach/literal Kardashev distinct | One `KardashevTier` drives display and scene band | `CONFLICT` | `kardashev.ts`, `game-tabs.tsx`; strong source | Create separate concepts and compatibility mapping | Critical | 1, 2, 8 |
| Causal rendering stack | Geography, scale, traits, sites, Projects, protocols exist; no Stability/scars/state | `PARTIAL` | scene stack; strong source | Feed canonical layers and preserve explicit responsibility | High | 8 |
| Portfolio divergence at same maturity | Signatures/archetypes/sites vary, but only six archetypes and capped priority can flatten results | `PARTIAL` | visual registries; partial source | Drive morphology from canonical dyad and Artifact capabilities | Medium | 5, 8 |
| Scale honesty | Strong explicit art-scale policy; tier fallback remains | `PARTIAL` | `civilizationArtworkScale.ts`, deployment derivation; strong source | Complete metadata and remove tier-as-scale fallback | Medium | 5, 8 |
| Blueprint hero consequences | Three authored Project consequences alter scene sites | `PARTIAL` | art/deployment registries; strong source | Reconcile Project pool and add canonical Ascension treatment | Medium | 5, 8 |
| Persistent scars and Conditions | Protocol sites can appear, but no durable scar/Condition state | `MISSING` | renderer scaffold only | Persist causes and render from state | High | 3, 6, 8 |
| Performance/mobile doctrine | Plate-based scenes, pin caps, pause/max-DPR controls; hidden duplicate scene | `PARTIAL` | scene/tests; strong source | Remove duplicate mount, lazy-load plates, profile after stabilization | Medium | 8, 10 |
| Immutable Civilization Record | Archive is aggregate account history | `MISSING` | schema/types; strong source | Add per-match immutable record with legacy unknowns | Critical | 6 |
| Architect Record contains many civilizations | Account aggregates exist but not civilization records | `PARTIAL` | account archive; strong source | Add record collection/index without inventing old histories | High | 6 |
| Outcome dimensions and auditable Lume | Match result/Eminence only | `MISSING` | account rollups; strong source | Add closure assessment after formulas are decided | Critical | 7 |
| Progressive disclosure | Scan dossiers explain visual sites; no rules/contributor explanation | `PARTIAL` | scene UI; strong source | Expose Stability, options, maturity, uncertainty, Outcome, and Lume causes | High | 3, 4, 7, 8 |

## 6. Data-Model Gap Analysis

| Primitive | Current state | Recommended ownership/lifetime | Backfill truthfulness | Confidence |
|---|---|---|---|---|
| `CivilizationState` | Missing | Shared type; backend-owned live state in game JSON; snapshot at closure | Old matches cannot be fully reconstructed | Strong source |
| `CivilizationWorld` | Missing | Shared entity; backend-owned only when content makes it consequential | Homeworld may be marked legacy/unknown; extra worlds cannot be invented | Missing evidence |
| Entity implementation state | Forged card arrays act as all lifecycle layers | Shared/backend live state with discovered, operational, Damaged, Annihilated distinctions | Historical Forge may be inferred; Damage history cannot | Strong source |
| Conditions | Missing | Small shared registry plus content extension; persisted live and in record | Unknown for legacy records | Missing evidence |
| `StabilityState` | Missing | Backend-computed global value/band; persisted live and snapshotted | Must be unavailable for legacy unless contributors were recorded | Missing evidence |
| Stability contributor graph | Missing | Backend-owned causal explanation with source IDs; snapshot at closure | Impossible to fabricate truthfully | Missing evidence |
| Historical Affinity imprint | Client-computed from current forged artifacts | Backend/shared deterministic derivation from durable history; snapshot | Can be approximated where Forge history survives, labeled legacy | Partial source |
| Active capability set | Missing | Backend-computed from operational implementations/Projects | Cannot infer prior disabled states | Missing evidence |
| Historical Maturity | Obsolete Kardashev tier computed client-side | Backend-computed and monotonic; persisted live and in record | Legacy comparison only unless evidence requirements are met | Strong source |
| Current Reach/condition | Conflated with Kardashev/Maturity | Backend-computed current state; persisted live and snapshotted | Legacy unknown/approximation only | Strong source |
| Pressure tags | Missing | Shared authored metadata | Not applicable to old records without event context | Missing evidence |
| Artifact capability tags | Missing | Shared canonical metadata, consumed by backend and renderer | Static metadata can apply prospectively; do not infer old choices | Partial source |
| Contextual event state | Project-specific state only | Backend-owned event window with choices, modifiers, outcome, explanation | Old unrecorded choices remain unknown | Partial source |
| Civilization Record | Missing | Immutable backend snapshot at match closure; account-indexed | Additive records for new matches; old rows explicitly legacy/unavailable | Strong source |
| Civilization Outcome | Missing | Backend closure assessment, stored in record | Cannot be retrospectively fabricated from win/loss | Missing evidence |
| Lume assessment | Missing as Civilization reward | Backend closure calculation plus explanation, stored in record/account ledger | No retrospective award unless separately authorized | Missing evidence |

The current versioned JSONB state makes additive live evolution feasible. It does not remove the need for a dedicated immutable record boundary at match closure.

## 7. Runtime Assumption Audit

| Assumption searched | Finding | Status | Evidence/confidence |
|---|---|---|---|
| Kardashev tier equals Civilization Maturity | Directly true in the current presentation pipeline | `CONFLICT` | `getKardashevTier`, game integration; strong source |
| Highest Artifact tier equals Reach | A single high/free Artifact changes Type and scene band | `CONFLICT` | `kardashev.ts:83-106`; strong source |
| One Tier III Artifact equals Galactic | Any normal Tier III Forge produces Type II; any free Tier III produces Type III/Galactic | `CONFLICT` | same; strong source |
| Civilization is presentation-only | Nearly true: state is client-derived and has no causal engine | `CONFLICT` | `game.tsx:3421-3483`; strong source |
| Generic Civilization actions | None found | `SUPPORTED` | independent search; boundary preserved |
| Per-world economy | None found | `SUPPORTED` | independent search; boundary preserved |
| Stale color mapping | Singularity is lavender, not canonical white; Radiance remains pale gold rather than white | `CONFLICT` | `kardashev.ts:11-18`; strong source; conflict is the Singularity family |
| Singularity treated as natural Affinity | Included in palettes, names, and dominant profile inputs | `CONFLICT` | `kardashev.ts`; strong source |
| Singularity/Flux namespace collision | No literal runtime `flux` key collision found; canonical Flux dyad is absent | `PARTIAL` | repository search; strong negative evidence |
| Chronicle used as generic random event term | No universal renaming found; Chronicle account and scene scaffold remain authored/history-oriented | `SUPPORTED` | types/deployment sources |
| Blueprint recipe leaks before manifestation | Live server state protected; static client bundle contains definitions/recipes | `PARTIAL` | state projection and client imports; strong source |
| Fixed player count | Core game supports variable player arrays; some Lumii scenario assumptions are authored | `SUPPORTED` | game state/routes; partial source |
| Artifact tier used as depiction scale | Used as fallback when lore metadata is absent | `CONFLICT` | `civilizationDeploymentSites.ts:524-561`; strong source |
| Damage/Annihilation equals discovery loss | No discovery/implementation split; annihilation removes forged record and bonus | `CONFLICT` | `gameEngine.ts:1478-1497`; strong source |
| Earned Eminence removable | Owned-Artifact annihilation subtracts Eminence | `CONFLICT` | `gameEngine.ts:1489`; strong source |
| Lume based only on win/Eminence | No Civilization Lume exists; account rollup is result/Eminence-centric | `MISSING` | account schema/progress; strong source |
| One civilization recurs across matches | No explicit recurring civilization object; account aggregates can visually imply continuity | `PARTIAL` | archive model; partial source |
| Destructive/fabricated legacy migration | No destructive Civilization migration found; current backfill aggregates available game data | `SUPPORTED` | migrations/account progress; strong source for inspected paths |
| Old Reach/Domain terminology | Kardashev Type and generic `reach` concepts remain; no canonical Maturity/current-Reach split | `OBSOLETE_RUNTIME` | client utility/types; strong source |
| Stale Artifact names/Tier III canon | All 20 runtime Tier III identities are superseded by Technology v2 | `CONFLICT` | Artifact CSV; strong source |
| Duplicate scene engines | Primary panel, legacy Kardashev canvas, and hidden Market scene coexist | `OBSOLETE_RUNTIME` | imports/mounts; strong source |
| Tests preserve superseded behavior | Kardashev tier and old Foundry/Worldshield tests do | `OBSOLETE_RUNTIME` | inspected tests; strong source |

## 8. Artifact Metadata Summary

The companion CSV contains exactly 90 unique runtime Artifact IDs: 40 Tier I, 30 Tier II, and 20 Tier III. It was generated from static registry inspection, joined against lore, visual-trait, lineage, and Blueprint sources, and then annotated for source conflicts.

| Readiness | Count | Meaning in this audit |
|---|---:|---|
| `PARTIAL` | 70 | Mechanics and basic lore are present, but canonical capability tags and/or complete Civilization metadata are absent. |
| `CANON_CONFLICT` | 20 | Every Tier III runtime identity conflicts with Technology v2 canonical replacement identity. |
| Other statuses | 0 | No row was declared fully `READY` because no Artifact has an adopted canonical Civilization capability-tag contract. |

Systemic findings:

- Mechanics geometry is complete and remains protected by the balance baseline.
- All 90 cards have runtime lore and visual treatment metadata, providing strong input for depiction scale and lanes.
- Tier I/II are generally semantically usable, with historical-source name conflicts explicitly recorded for `t1s02` and `t1o05`.
- All Tier III cards require identity/form/lineage reconciliation before capability metadata or bespoke visual consequences can be authoritative.
- `Built On` lineage exists in canon but not as runtime rules metadata. It must remain lore unless an authored mode explicitly says otherwise.
- `engineeringScale`, `artifactForm`, `civLane`, and visual traits are helpful presentation metadata; they are not a substitute for capability tags or lifecycle state.
- The catalytic Artifact candidate would alter Artifact ontology and capability interpretation broadly, but it is not adopted and no row was rewritten around it.

See `LUMINAe_CIVILIZATION_ARTIFACT_METADATA_AUDIT_v1.0.csv` for row-level evidence.

## 9. Blueprint And Project Summary

The companion Blueprint audit covers all discovered implemented and specified Projects:

- three runtime Blueprints: Antimatter Detonator, Mantle-to-Orbit Foundry, Worldshield Covenant;
- one current-canon missing first-pool Project: Ascension Registry;
- all 20 displaced Tier III concepts in the Future Project Concept Vault;
- 22 historical Blueprint roster entries retained only as stale provenance.

Main conclusions:

- Automatic exact-component manifestation and assigned-slot ordering are reusable.
- Live owner/private state projection is robust, including anonymous Lumii protocols.
- Strict secrecy is incomplete because static definitions and recipes ship to the client bundle.
- Antimatter's trap/interception architecture is a valuable vertical-slice hook, but its owned-Artifact consequence violates protected Eminence/history and uses a global annihilation list for distinct concepts.
- Runtime Foundry is the older discount model, not Blueprint v2's explicit two-use Tier II action plus Overdrive.
- Ascension Registry is absent from shared types, runtime, visuals, and tests.
- Worldshield is incorrectly included in the opening Lumii pool and its Broken-Covenant spending behavior conflicts with current canon.
- No Project feeds Stability, Conditions, capability state, worlds, or a Civilization Record because those primitives do not yet exist.

See `LUMINAe_CIVILIZATION_BLUEPRINT_METADATA_AUDIT_v1.0.md`, including its detailed Antimatter timing diagram.

## 10. Visual-System Readiness

| Subsystem | Classification | Reason |
|---|---|---|
| Authored bitmap plates | Sufficient as a performance strategy | They provide premium visual mass without live particles or heavy geometry. |
| Surface/orbit/stellar/galaxy navigation | Extensible through metadata | The layered view is useful once historical Maturity/current Reach no longer come from Kardashev tier. |
| Scale-honest Artifact sites | Extensible through metadata | Explicit scale policy is strong; tier fallback must be removed after metadata completion. |
| Scan pins/dossiers | Sufficient as an affordance | Capped, inspectable, and not presented as the spectacle itself. Needs causal backend explanations. |
| Recent-Forge pulse | Sufficient as transient feedback | Low-cost and legible; session-only behavior should not be mistaken for durable history. |
| Artifact portfolio divergence | Extensible but underpowered | Six archetypes, signatures, and sites help; canonical capability/morphology inputs are absent. |
| Affinity morphology | Requires replacement of derivation | Current palette/name model lacks dyads, third modifier, plural identity, and proper Singularity boundary. |
| Blueprint hero treatments | Extensible through metadata | Good environmental consequence model; Project roster is stale/incomplete. |
| Chronicle/scenario scars | Scaffold only | Site shape exists, but durable cause/history is not connected. |
| Stability/Condition treatment | Missing | No inputs or authored visual grammar exist. |
| Homeworld continuity | Partial | Layered plates imply continuity, but no stable world identity/geography state is persisted. |
| Luminary influence | Sufficient as-is | Atmospheric/institutional representation matches doctrine. |
| Mobile/reduced-cost rendering | Mostly sufficient | Pin caps, paused miniature, and DPR controls are present; primary component and eager assets need profiling. |
| Renderer ownership | Coupled to obsolete assumptions | An untracked 11k-line panel, legacy canvas, and hidden duplicate scene should be reconciled before expansion. |

The current engine can support the causal rendering stack after domain inputs are added, but it cannot derive those inputs reliably itself. The scene should remain a consumer of canonical state, not become the rules engine.

## 11. Persistence And Migration Risk

### Current persisted fields

- Versioned live game JSON includes Forge history, player bonuses/Eminence, Blueprint private/public state, Luminary state, global annihilated IDs, action log, and scenario fields.
- Account tables include Blueprint clearance/loadouts/mastery, Chronicle/account progression, Artifact aggregate encounter/Forge counts, Luminary aggregates, and match result/Eminence rollups.
- No world, Condition, Stability, capability, historical Maturity, current Reach, Civilization Outcome, or Lume explanation is persisted.

### Additive path

The lowest-risk path is additive:

1. Add a versioned Civilization substate to new live games with compatibility reads for absence.
2. Introduce explicit implementation lifecycle records before converting destructive Project behavior.
3. Snapshot immutable Civilization Records only for games with sufficient source history.
4. Index those records under the Architect account without replacing current aggregates.
5. Mark old records `legacy comparison`, `unknown`, or `not recorded` field by field.

### Backfill limits

Old game JSON may support final forged Artifact lists, final Eminence, public Blueprints, Luminary relations, and match result. It does not reliably support:

- when or why a capability was Damaged or repaired;
- the civilization's historical maximum Maturity versus final Reach;
- worlds and their Conditions;
- Stability contributors over time;
- unrecorded contextual choices;
- Agency, Continuity, or adversity-aware Achievement;
- an auditable Lume rationale.

Any migration that infers those facts from final cards alone would fabricate history and violate the handoff.

### Specific risks

- `annihilatedArtifactIds` currently mixes face-up board targets and owned destroyed implementations; migrating it blindly into entity history would produce false semantics.
- Existing account rollups are idempotent aggregates, not immutable per-match records.
- The dirty worktree may contain schema consumers not represented by the recorded commit; compatibility must be tested from a clean integration branch before migration work.
- Final persistence schema remains explicitly Deferred and is not designed by this audit.

## 12. Test And Validation Readiness

### Existing coverage inspected

- Deployment scale and site generation tests cover form-based scale, tier fallbacks, lane language, Blueprint sites, Luminary influence, protocols, and clustering.
- Scene panel tests cover cinematic/scan modes, selection, zoom levels, pin caps, Artifact sheet handoff, recent traces, visual plates, and paused behavior.
- Preview and game-tab tests cover miniature integration and recent-Forge visibility.
- Blueprint engine tests cover manifestation ordering, secrecy, Antimatter timing, Foundry behavior, Worldshield interception, and projection.
- Account tests cover Blueprint/Chronicle aggregation and completion idempotency.

### Coverage gaps

- No tests can cover Stability, Conditions, worlds, capability lifecycle, Maturity/current Reach separation, Civilization Records, Outcome, or Lume because those systems do not exist.
- Existing Kardashev tests encode superseded progression.
- Existing Foundry and Lumii/Worldshield tests encode rules superseded by Blueprint v2.
- There is no migration/compatibility fixture for truthful legacy Civilization records.
- There is no end-to-end test proving Blueprint recipes are absent from player bundles.
- No simulation calibrates identity confidence, Maturity evidence, Stability thresholds, event frequency, or Lume.
- Visual tests demonstrate layout behavior but do not establish portfolio divergence or market-quality art across canonical dyads.

### Execution status

No tests or typechecks were run. This was a deliberate audit-boundary decision because write behavior was not proven safe in the already dirty tree. Static test inspection is evidence of intended coverage, not a passing-test claim.

## 13. Lowest-Risk Implementation Sequence

### Phase 1: Canonical shared state primitives

- **Dependencies:** Adopt Technology v2 for current ontology; reconcile source ownership.
- **Safe deliverables:** Versioned types for civilization, world/entity IDs, discovery/implementation lifecycle, protected history, historical/current state separation.
- **Migration risk:** High if mapped directly from `annihilatedArtifactIds`; start additive.
- **Tests:** Type normalization, lifecycle invariants, legacy absence handling, earned-Eminence protection.
- **Deferred blockers:** Final persistence schema blocks database finalization, not the in-memory contract. Catalytic ontology blocks final Artifact semantic fields, not lifecycle separation.

### Phase 2: Identity and Maturity derivation

- **Dependencies:** Phase 1 historical and active capability layers.
- **Safe deliverables:** Pure derivation interfaces, canonical dyad table, third-Affinity modifier grammar, plural fallback, separate historical Maturity/current Reach/literal Kardashev fields.
- **Migration risk:** Medium; old values must be labeled legacy rather than silently reinterpreted.
- **Tests:** Natural-Affinity-only inputs, Damage stability of imprint, equifinality, non-regression, mixed identity.
- **Deferred blockers:** Dominance/confidence thresholds; exact Maturity evidence; exact Maturity/Reach/Kardashev relation.

### Phase 3: Stability and Condition engine

- **Dependencies:** Phase 1 entities/capabilities.
- **Safe deliverables:** Contributor/explanation interfaces, `Stable` default, global recalculation pipeline, cause-based removal contract.
- **Migration risk:** High for legacy records; no fabricated values.
- **Tests:** Stable initialization, contributor determinism, cascade boundaries, cause-based recovery, Crisis not equaling defeat.
- **Deferred blockers:** Exact Stability scale/thresholds/weights and final Condition registry.

### Phase 4: Contextual event resolution

- **Dependencies:** Phases 1-3; existing Blueprint timing hooks.
- **Safe deliverables:** Trigger/context, available trajectories, aptitude, execution state, uncertainty, consequence, and explanation interfaces.
- **Migration risk:** Low for new events; high if old logs are reinterpreted.
- **Tests:** Automatic/contextual/state-modified forms, no extra normal turn, deterministic preparation, inspectable odds.
- **Deferred blockers:** Pressure-tag registry, Affinity/dyad matrices, exact Antimatter consequence, future standard-event-system name.

### Phase 5: Artifact and Blueprint metadata

- **Dependencies:** Canonical registry ownership and Phases 1/4 contracts.
- **Safe deliverables:** Reconcile the 90-slot metadata join, remove tier-as-scale fallback where explicit metadata exists, split public/server-private Blueprint metadata.
- **Migration risk:** Low for additive metadata; high if identity changes are coupled to balance changes.
- **Tests:** All 90 IDs, source precedence, no recipe leaks, canonical Tier III identity, scale honesty.
- **Deferred blockers:** Catalytic ontology decision, individual Artifact capability tags, individual Project authoring.

### Phase 6: Persistence and Civilization Records

- **Dependencies:** Phases 1-5 stable serialized contracts.
- **Safe deliverables:** New-game versioned state, immutable closure snapshot, Architect Record indexing, field-level legacy unknowns.
- **Migration risk:** Critical; preserve generic game JSON and current account aggregates.
- **Tests:** Additive migrations, rollback, idempotent closure, legacy truthfulness, withdrawal/scenario exclusions.
- **Deferred blockers:** Final persistence schema/migrations; exact Maturity/Reach relation for record fields.

### Phase 7: Civilization Outcome and Lume

- **Dependencies:** Stable records, contextual history, Stability contributors.
- **Safe deliverables:** Outcome explanation schema for Continuity, Agency, Achievement, and Stability; reward ledger interface.
- **Migration risk:** High if retroactive awards are attempted; do not do so without authorization.
- **Tests:** Competitive result disagreement, adversity context, auditable explanation without farm checklist.
- **Deferred blockers:** Exact Lume formula.

### Phase 8: Visual integration

- **Dependencies:** Phases 2, 3, 5; stable presentation selectors.
- **Safe deliverables:** Replace Kardashev inputs, wire causal layers, preserve scan/dossiers, remove hidden duplicate scene, lazy-load authored plates, retain paused miniature.
- **Migration risk:** Low for data; medium for visual regressions and dirty-file ownership.
- **Tests:** Desktop/mobile/reduced motion, same-maturity portfolio divergence, homeworld continuity, scars, pin caps, performance budgets.
- **Deferred blockers:** Identity confidence calibration and final Maturity/Reach relation; individual visual authoring can continue incrementally.

### Phase 9: Content authoring

- **Dependencies:** Phases 4, 5, 8.
- **Safe deliverables:** Blueprint, Chronicle, catastrophe, and Luminary responses using shared primitives; no generic actions.
- **Migration risk:** Low if new content is versioned; high if old outcomes are rewritten.
- **Tests:** One to three meaningful interactions target, route viability, pressure/capability explanations, hidden-state safety.
- **Deferred blockers:** Individual response authoring, exact Antimatter consequence, event-system naming.

### Phase 10: Simulation, human, and visual validation

- **Dependencies:** All prior phases at vertical-slice quality.
- **Safe deliverables:** Non-mutating simulations, clean-branch CI, accessibility review, visual snapshots, frame/memory profiling, human comprehension tests.
- **Migration risk:** Low; calibration changes may affect saved-state compatibility if fields are not versioned.
- **Tests:** Frequency, thresholds, outcome distributions, legacy reads, performance, market-quality visual comparison.
- **Deferred blockers:** All calibration decisions must be resolved before release certification.

## 14. Human Decisions After Audit

Only the handoff's explicitly Deferred decisions are listed here.

| Deferred decision | Implementation phase blocked |
|---|---|
| Whether catalytic Artifact ontology replaces Technology v2 | Final Artifact capability semantics and content authoring in Phases 5 and 9; does not block Phase 1 lifecycle scaffolding under Technology v2. |
| Exact Stability scale, thresholds, contributor weights | Final Phase 3 rules and Phase 10 calibration. |
| Final Condition registry | Final Phase 3 serialization and content vocabulary. |
| Final pressure-tag registry | Phase 4 authored resolution and Phase 9 content. |
| Exact Affinity/dyad pressure matrices | Phase 4 aptitude resolution and Phase 9 balancing. |
| Exact dominance/confidence thresholds | Phase 2 identity classification and Phase 8 morphology selection. |
| Exact Maturity evidence/unavoidable requirements | Phase 2 progression and Phase 10 calibration. |
| Exact Maturity/current Reach/literal Kardashev relation | Phase 2 derivation, Phase 6 record fields, and Phase 8 scale presentation. |
| Exact Lume formula | Phase 7 reward calculation and Phase 10 validation. |
| Individual Artifact capability tags | Final Phase 5 catalog and Phase 9 event interactions. |
| Individual Blueprint/Chronicle/Luminary responses | Phase 9 content completion. |
| Exact Antimatter consequence resolution | Phase 4 vertical slice and Phase 9 Antimatter authoring. |
| Final persistence schema and migrations | Phase 6 database implementation. |
| Name of any future standard-match event system | Public Phase 4 interfaces and Phase 9 copy/content taxonomy; not the internal engine contract. |

## 15. Final Go/No-Go

- `GO WITH RECONCILIATION`, not direct feature expansion on the current assumptions.
- Preserve the scale-aware scene, scan dossiers, authored plates, Blueprint consequences, and atmospheric Luminary treatment.
- Establish backend-owned Civilization lifecycle state before Stability or content work.
- Separate historical Maturity, current Reach, and literal Kardashev metadata.
- Reconcile all 20 Tier III identities and Blueprint v2 before metadata becomes authoritative.
- Protect discovery and earned Eminence from implementation Damage/Annihilation.
- Move secret Blueprint recipes out of player bundles if strict secrecy is required.
- Add immutable Civilization Records only for truthfully recorded state; mark legacy gaps explicitly.
- Keep the Civilization layer free of generic actions and routine economic micromanagement.
- Do not begin runtime implementation until the shared lifecycle/source-ownership dependency is resolved.
