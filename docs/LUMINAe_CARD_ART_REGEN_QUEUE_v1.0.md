# LUMINAe Card Art Regeneration Queue v1.0

> **Superseded for Tier III:** Technology System v2 replaces all twenty Tier
> III artworks. This queue remains a record of the prior art pass.

## Status

**Complete — all 34 approved replacements were installed on 2026-08-13.**

The runtime assets now use the same visual contract as the retained card set:
cinematic painterly-photoreal science fiction, a near-black field, controlled
Affinity light, a legible primary silhouette, and no baked-in card UI. Tier III
art depicts complete galactic public works rather than isolated devices.

## Priority 1: Renamed Tier I Components

| ID | Canonical name | Required image |
|---|---|---|
| t1s02 | Mantlelift Driver Coil | One room-scale induction coil segment accelerating a sealed feedstock capsule; no complete launch tower |
| t1o05 | Blackglass Forge Die | One inspectable vacuum-stable blackglass forming die; no seal or redaction glyph |

These assets now depict their canonical component-scale concepts and are used
by the Foundry blueprint as well as the Forge.

## Priority 2: Overscaled Tier I and II Art

| ID | Artifact | Correction |
|---|---|---|
| t1r07 | Entropy Pyre Baffle | Building facade to modular heat-routing baffle |
| t1s04 | Time-Crystal Scaffold | Warehouse lattice to inspectable crystal substrate |
| t1e07 | Lichen Vein | Entire wall colony to hand-sized repair specimen |
| t1p08 | Petrified Bloom | Cliff-sized fossil to preserved sample |
| t2r06 | Entropy Sink Crucible | Planetary tower complex to bounded thermal module |
| t2s03 | Simulation Loom | Warehouse installation to console-sized computation loom |
| t2s06 | Convergence Lens | Planet-spanning array to bounded inspection instrument |
| t2e05 | Epoch Graft Ledger | Civic wall to living ledger strip |
| t2e06 | Crystal Biome Seedplate | Architectural slab to hand-sized seedplate cutaway |
| t2o06 | Dimensional Shear Gauge | Hemispheric array to room-scale gauge |
| t2p01 | Containment Lattice | Multi-story facade to modular transparent containment cell grid |
| t2p05 | Error-Correcting Core | Building-height facility to console-sized core |

## Priority 3: Tier III Galactic Works

All twenty Tier III images require regeneration because the prior pass often
depicted a local key, seal, lens, or wafer instead of the complete achievement.

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
baked-in card text. Regenerated assets were reviewed both at source size and at
the runtime card size of 384 × 549. The dev card browser reads the runtime WebP
manifest so it cannot silently present stale PNG masters during future reviews.
