# LUMINAe Tier III Galactic Implementation v1.0

> Historical implementation record. The subsequent [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md) supersedes conflicting names, functions, tier thresholds, Event facts, and two Tier III illustrations. Earlier source assets remain for provenance.


Date: 2026-09-28.

## Result

All twenty Tier III Artifacts now represent complete working galactic
achievements, with new card artwork, practical lore, Event classifications, and
consistent names across production card surfaces and tutorial Artifact data.
The [roster review](LUMINAe_TIER_III_GALACTIC_ROSTER_REVIEW_v1.0.md) contains the
twenty identities, functions, distinctions, and original art briefs.

The accepted distinction is recorded in the Lore Bible, Technology v2,
Blueprint first-pool specification, concordance ledger, and unified reference:

- Artifact tiers describe the operational reach of mastered technology.
- Tier III already does useful work across star systems. It can be a complete
  network, institution, habitat system, or industrial achievement.
- A Blueprint provides specialized, owner-private synthesis knowledge. A
  Manifested Project is the distinct working result, at any supported scale.
- Required ingredients must each make an indispensable causal contribution.
  A network may contribute its service or output without being physically
  consumed or reduced to an activation key.

## Runtime Authority And Scope

`lib/game-types/src/technology.ts` is the shared Tier III identity registry.
The server's `cardLore.ts` now derives Tier III names, practical functions,
mysteries, forms, and art prompts from it. The old duplicate Tier III catalogs
and overriding prose pass have been removed. The card browser uses the shared
mechanical catalog and the same art manifest as production.

The twenty existing IDs, printed costs, bonus Affinities, and Eminence are
unchanged. The Antimatter Detonator, Mantle-to-Orbit Foundry, Ascension Registry,
and Worldshield Covenant recipes are unchanged. No new Blueprint is shipped.
Conflicting future Project leads have been removed; Causality Audit Court
remains a future lead only. The roster review's other synthesis examples remain
draft concepts.

Tier I and Tier II lore and Event assignments are unchanged by this migration.
Three Tier III developmental lineages changed to fit their actual functions:

| Artifact | Developmental parents | Reason |
|---|---|---|
| Starway Spine (`t3s01`) | `t2r03`, `t2s02`, `t2p05` | Energy, stellar mapping, and reliable computation support launch/navigation/braking infrastructure; no bulk-matter portal is implied. |
| Worldroot Lattice (`t3e01`) | `t2s04`, `t2e04`, `t2p03` | Habitat envelopes, ecological interpretation, and cross-species agreement support living convoys and acclimation. |
| Collapse Mandala (`t3o02`) | `t2s03`, `t2e03`, `t2p01` | Modeling, shutdown, and containment support active route isolation, rather than prediction alone. |

All twenty lineages were checked against the fixed printed Affinity costs.
Galactic implementation reach remains separate from the camera scale of an
individual artwork. Existing Civilization placement/layout rules are retained.

Five tutorial Artifact data entries now use the shared canonical names and
lore. Tutorial exchanges, approved dialogue, and dialogue protection locks
were not rewritten.

## Event Consequences

The evidence registry is now `artifact-event-facts-v3`. Each of the twenty
functions has explicit capability reasoning and an explicit synchronization
membership or exclusion. Tags remain visible below card lore.

| Classification | Previous | Current |
|---|---:|---:|
| Distributed-synchronization members | 5 | 10 |
| Explicit synchronization exclusions | 85 | 80 |
| Signal-interpretation responders | 9 | 7 |

The synchronization members are `t1p06`, `t1s04`, `t2p04`, `t2p05`, `t3o03`,
`t3o04`, `t3p03`, `t3r03`, `t3r04`, and `t3s01`. Merely having multiple sites or
exchanging delayed records does not imply this dependency.

These are gameplay eligibility changes. Event cadence, weights, and resolution
rules are unchanged. Targeted resolver tests cover operational containment,
damage, recovery, and habitat responses. The counts establish classification
coverage; they do not establish win rates or replace playtesting.

## Artwork And Provenance

Artwork was created with the built-in OpenAI `image_gen` tool and visually
inspected. Original assets are preserved.

- Twenty full PNG sources:
  `artifacts/luminae/src/assets/cards/galactic-v3/`.
- Twenty production WebPs, 384 × 549:
  `artifacts/luminae/src/assets/cards/runtime/galactic-v3/`.
- [Card generation manifest](../artifacts/luminae/src/assets/cards/galactic-v3/generation-manifest.json):
  exact prompts, generated source paths, saved sources, runtime paths, and reviews.
- [Civilization generation manifest](../artifacts/luminae/src/assets/civilization/manifestations/artifacts/authored/tier-three-v3-generation-manifest.json):
  two transparent 2 × 2 sprite atlases, their edit prompts, and saved sources.

The card WebPs total 817,706 bytes, compared with 493,136 bytes for the previous
twenty images: an increase of 324,570 bytes (about 317 KiB). Full source PNGs
are not imported by the production card manifest.

The Continuum and Abyss scene atlases now use `t3s-artifact-atlas-v3.webp`
and `t3o-artifact-atlas-v3.webp`. They show launch infrastructure, civic services,
archives, timing observatories, refuges, mechanical quarantine, covert relays,
and detectors. Portal, black-hole, and spatial-rift depictions have been
replaced. The two 1280 × 1280 runtime sheets preserve transparency and total
882,052 bytes. Other scene atlases retain their existing physical silhouettes.
The production budget classifier recognizes both Tier III v2 and v3 sheets;
budget limits are unchanged.

## Verification

- Backend targeted suites: **119 tests passed** across Event facts, Event
  semantics, Civilization foundation, Blueprint engine, lore/Event integration,
  Event cards, and state projection.
- Card/presentation targeted suites: **25 tests passed**, including art wiring,
  Civilization manifestations, Event facts display, cosmic liquid surface,
  and Archive presentation.
- Tutorial/dialogue and Civilization fixture checks: **92 tests passed**;
  the final atlas integration suite separately passed **9 tests**. The nine
  manifestation tests overlap the earlier presentation group.
- Playwright: **22 checks passed**—all twenty cards at mobile width plus full
  and compact mobile Forge refill. Artwork loaded, lore and Event properties
  were visible, and the pages had no horizontal overflow or JavaScript errors.
- Final saturated Civilization scene: all eight revised sprites loaded from
  the two v3 atlases, with transparency and no JavaScript errors; screenshot
  visually inspected.
- Frontend and API TypeScript checks passed. Protected mechanical catalog,
  Blueprint engine test, and dialogue-governance hashes matched their starting
  snapshots. Scoped fixture diffs contain only identity/lore metadata changes.
- Production Vite compilation succeeded. The subsequent production-budget
  gate **does not pass**, as detailed below. No native app was repackaged.

Useful commands:

```sh
pnpm --filter @workspace/scripts exec playwright test --config=evidence.config.ts tier-three-galactic-roster.spec.ts
pnpm --filter @workspace/luminae exec tsc -p tsconfig.json --noEmit
pnpm --filter @workspace/api-server exec tsc -p tsconfig.json --noEmit
pnpm --filter @workspace/luminae run build
```

### Remaining Production Budget Failures

The repository already had asset/CSS budget overruns before this redesign.
The final build and corrected atlas classification report:

| Budget | Measured | Limit |
|---|---:|---:|
| Total built assets | 59,057.6 KiB | 49,152 KiB |
| Core assets | 36,024.2 KiB | 35,840 KiB |
| Global CSS, gzip | 111.9 KiB | 110 KiB |

Entry JavaScript and the environment, dyad, Artifact, and Blueprint libraries
pass their respective budgets. Artifact manifestations total 3,897.5 KiB
against 5,632 KiB. These failures remain release blockers; completing the
roster migration is not a claim that the repository passes all release gates.

## Completion Against The Accepted Plan

- [x] Record the Artifact/Blueprint/Project distinction.
- [x] Review all twenty Tier III identities for complete galactic usefulness,
  visual variety, Event predictability, and meaningful synthesis contributions.
- [x] Resolve overlapping future Project names and review developmental
  lineage without rewriting Tier II or changing shipped recipes.
- [x] Implement the roster, artwork, shared presentation data, and Event facts;
  verify mobile cards, refill presentation, tutorial protections, and scene art.

Live review entry: `/dev/card-browser?id=t3s01`.
