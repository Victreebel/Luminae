# Planetary foundations expansion v1.0

Implemented 2026-09-29 as the five-card first batch. Decks are now 45 / 30 / 20,
with nine Planetary Artifacts per Affinity. The existing ninety cards retain
their costs, Eminence, lore, and Blueprint eligibility.

## New foundations

All five cost three Affinity and grant zero Eminence. Each supplies a complete
service within one world and its orbit. Card illustrations and individual
Civilization structures use the existing cinematic machinery style.

| Artifact | Bonus | Cost | Functions | Natural district homes |
|---|---|---|---|---|
| Emberway Beacons (`t1r09`) | Flare | 1 Continuum, 2 Verdance | Mobility, Coordination | Observatory, Transit, Coastal |
| Landfall Loom (`t1s09`) | Continuum | 1 Flare, 1 Verdance, 1 Abyss | Mobility, Coordination | Coastal, Transit, Observatory |
| Tidemarrow Filter (`t1e09`) | Verdance | 2 Flare, 1 Continuum | Ecology, Materials | Coastal, Industrial, Habitat |
| Duskline Relay (`t1o09`) | Abyss | 2 Flare, 1 Verdance | Security, Coordination | Subsurface, Transit, Coastal |
| Watershed Accord (`t1p09`) | Radiance | 2 Flare, 1 Continuum | Coordination, Ecology | Wilderness, Subsurface, Civic |

These fill route signalling, orbital return, freshwater/mineral separation,
secure freight dispatch, and watershed allocation gaps. Their Functions and
legacy Event classifications are explicitly authored; mysteries grant no powers.

## Balance and Blueprint intent

Tier I printed cost demand, ordered Flare / Continuum / Verdance / Abyss /
Radiance, changes from **21 / 26 / 27 / 29 / 32** to
**28 / 29 / 31 / 30 / 32**. The demand spread narrows from eleven to four.
No new card strictly dominates or is dominated by an existing card with the
same bonus and Eminence on printed cost alone. These are catalog properties,
not proof of equal strategy win rates. Larger comparative playtests remain
necessary before claiming competitive balance improvement.

Potential future Project contributions are route clearance (Beacons), safe
orbital delivery (Landfall), freshwater and separated mineral feedstock
(Tidemarrow), authenticated dispatch (Duskline), and verifiable water-sharing
commitments (Watershed). For example, a future evacuation Project would need
transport coordination and dependable dispatch as separate contributions;
a recovery Project would need both water production and allocation.
These are design leads only: no new Blueprint, substitute ingredient, recipe,
or hidden bonus is implemented. The four existing recipes remain exact.

## Saturated preview

Saturated and Galactic Metropolis previews retain a **90-Artifact budget**:
40 Planetary, 30 Stellar, and 20 Galactic. Full-catalog QA still covers all 95.
The ordinary preview keeps eight/six/four Artifacts per Affinity in each tier,
preserving the original ninety-card selection instead of truncating one color.
An opt-in **Prioritize [dyad] districts** checkbox uses the selected dyad,
persists as `dyadPriority=1`, and displays actual matching/total/neutral counts.

The selector scores 512 deterministic candidate acquisition orders through
the shared district allocator, considering the baseline too. It prefers more
permanent districts of the chosen dyad, then their resident influence; results
are cached. This is a bounded search, not a proven global optimum. With this
catalog it finds six or seven matching districts for each of the ten dyads.
The production Forge allocator and existing saved assignments are unchanged.

Two additional physical parcels prevent Coastal/Transit overflow collisions;
the prior twenty-one parcel coordinates and fitted sizes remain unchanged.
This does not increase the preview's Artifact budget. Ten different families
sharing one dyad simultaneously remain beyond the nine-per-Affinity catalog.

## Verification and provenance

- 381 focused API tests and 285 client tests passed, including all 100
  district-family/dyad combinations, preview budgets, allocator replay, public
  lore/Functions, recipe protection, and complete physical-art coverage.
- Shared, API, and client TypeScript checks passed; targeted client ESLint passed.
- Twelve fresh in-memory hard-AI games completed, four each at 2/3/4 players.
  This is smoke coverage, not a comparative balance study.
- Generated card and structure images were inspected directly. Live browser
  inspection remains unverified because the existing access-review denial has
  not been reset.
- Built-in imagegen prompts and originals: `artifacts/luminae/src/assets/cards/planetary-foundations-v1/generation-manifest.json` and
  `artifacts/luminae/src/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/generation-manifest.json`.
- Smoke output: `artifacts/qa/planetary-foundations-2026-09-29/smoke.json`.

Existing saves retain their dealt cards; new matches use the expanded catalog.
