# LUMINAe Card Art Regeneration Queue v1.0

## Status

Historical queue superseded by the [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md). The current manifest includes 24 new card images: two Tier I, twenty Tier II, and two Tier III, in addition to the retained 18 galactic images from the previous pass.

Mantlelift Driver Coil and Blackglass Forge Die now depict their actual working functions. The prior "overscaled" corrections are retired: a functioning planetary installation may illustrate a planetary Artifact, and Stellar Artifacts may show stellar infrastructure. Camera scale does not decide tier. Use current canonical functions and the generation manifests for future work; the briefs below are provenance only.

## Completed: Tier III Galactic Works (Historical Briefs)

All twenty Tier III images have been regenerated because the prior pass often
depicted a local key, seal, lens, or wafer instead of the complete achievement.
The following table preserves the old brief; the implemented roster and saved
generation manifest supersede it.

| ID | Canonical name | Visual center |
|---|---|---|
| t3r01 | Ignition Reliquary | Distributed stellar ignition lineage network |
| t3r02 | Extinction Furnace | Governed terminal-system disassembly megastructure |
| t3r03 | Chronoflare Array | Relativistically synchronized stellar energy array |
| t3r04 | Star-River Crucible | Interstellar feedstock-to-habitat production river |
| t3s01 | Wormgate Spine | Galactic transit backbone |
| t3s02 | Recursive Commonwealth | Diverging and reconciling civic continuity network |
| t3s03 | Extinction Archive | Distributed archive around dead systems |
| t3s04 | Chronology Accord | Galactic clock and historical reconciliation infrastructure |
| t3e01 | Worldroot Lattice | Distinct biospheres linked by compatible living routes |
| t3e02 | Stellar Overgrowth | Diverse living stellar infrastructures |
| t3e03 | Interstellar Necrobiome | Dead systems reclaimed into new ecological feedstock |
| t3e04 | Biosphere Concordance | Biological compatibility boundaries among alien ecologies |
| t3o01 | Cryptobiotic Constellation | Concealed dormant refuge worlds |
| t3o02 | Collapse Mandala | Distributed gravitational and civilizational containment work |
| t3o03 | Ordered Silence | Quiet corridors, buried relays, and decoy constellations |
| t3o04 | Dark-Sector Aperture | Sector-scale reciprocal observatory boundary |
| t3p01 | Galactic Concordance | Distributed multi-species civic enforcement network |
| t3p02 | Relic Forge Commons | Transparent public galactic fabrication chain |
| t3p03 | Matrioshka Chorus | Federation of distinct star-scale minds |
| t3p04 | Witness Constellation | Independent rights and evidence observatories |

## Generation Rule

The exact `artPrompt` in `artifacts/api-server/src/lib/cardLore.ts` controls each
regeneration. Art must contain no title, cost, frame, UI, readable label, or
baked-in card text. Regenerated masters should be visually reviewed at card
size before replacing runtime assets.
