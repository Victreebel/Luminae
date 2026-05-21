# Luminae Card Art Audit — Full 90-Card Review
**Date:** May 21, 2026  
**Auditor:** Agent  
**Spec reference:** `docs/LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.3_SCALE_AS_CAPABILITY.md`  
**Key rule:** "Clean artifact artwork only. Depict the specific component, not a complete Blueprint megastructure."

---

## Summary Counts

| Category | Count |
|---|---|
| Acceptable — no action | 18 |
| Baked-in text only — inpaint candidate | 2 |
| Already inpainted (done) | 1 |
| Scale / subject wrong — full regen | 69 |
| **Total cards** | **90** |

> **Note:** Of the 69 full-regen cards, many also contain baked-in text — those are flagged inline. Full regen supersedes inpainting for any card that also has a scale failure.

---

## ACCEPTABLE — No Action Required (18 cards)

These pass: correct handheld/component scale, no baked text, subject matches spec.

| ID | Card Name |
|---|---|
| t1e05 | Canopy Seed Cluster |
| t1o02 | Null Filament Thread |
| t1o04 | Entropy Siphon Bead |
| t1o07 | Void Resonance Fob |
| t1o08 | Temporal Erasure Seal *(text inpainted — done)* |
| t1p01 | Coherence Lattice Shard |
| t1p04 | Cipher Aperture Wafer |
| t1p05 | Signal Weave Module |
| t1p06 | Radiant Frame Token |
| t1p07 | Order Filament Coil |
| t1r02 | Ember Kindle Rod |
| t1r04 | Flare Tap Cell |
| t1r05 | Ignition Prism Sliver |
| t1s01 | Mnemonic Crystal Shard |
| t1s02 | Causal Obelisk Pin |
| t1s06 | Continuity Vine Weave |
| t1s07 | Phase Lock Knot |
| t1s08 | Stasis Sphere Cradle |

---

## BAKED-IN TEXT ONLY — Inpaint Candidates (2 cards)

Scale and subject are acceptable; only the baked text needs removal.

| ID | Card Name | Text to Remove | Location |
|---|---|---|---|
| t1r03 | Chrono-Ember Core | "CHRONO-EMBER CORE" | Large white block, top of image |
| t1p02 | Still-Point Shard | "CONFIGURE ENT SIGNAL" + "CIVIC SIGNAL" | Lower-right corner area |

---

## FULL REGEN REQUIRED — Scale / Subject Wrong (69 cards)

Sorted by tier then affinity. Cards marked ⚠️TEXT also have baked-in text (regen supersedes inpainting).

### Tier 1 — Verdance (t1e) — 7 of 8

| ID | Issue | What image shows | What spec requires |
|---|---|---|---|
| t1e01 | Scale | Planet-scale cosmic tree organism | Single spore pod component |
| t1e02 | Scale | Cosmic planet-spanning root network | Root-tap artifact (small) |
| t1e03 | Scale | Giant cosmic tendril organism | Charred tendril fragment component |
| t1e04 | Scale | Planetary biological outbreak/spore field | Small seed-mold die |
| t1e06 | Scale | Organism draped on a moon surface | Small biological lattice tile |
| t1e07 | Scale | Planet-scale green lightning / root flash | Lichen vein pattern in stone fragment |
| t1e08 | Scale | Massive organism colonising a moon | Cultivation tray component |

### Tier 1 — Abyss (t1o) — 4 of 8

| ID | Issue | What image shows | What spec requires |
|---|---|---|---|
| t1o01 | Scale | Full Dyson sphere shell | Small decay-masking veil component |
| t1o03 | Scale | Planet-crater / hollow megastructure | Hollow dark vessel (small) |
| t1o05 | Scale | Planet-scale machinery array | Dark seal token |
| t1o06 | Scale | Massive crystalline pillar field | Small bio-network node bead |

### Tier 1 — Radiance (t1p) — 2 of 8

| ID | Issue | What image shows | What spec requires |
|---|---|---|---|
| t1p03 | Scale | Massive triangular megastructure | Small hollow prism / lens component |
| t1p08 | Scale | Bonsai island floating in space | Fossil bloom set in luminous stone |

### Tier 1 — Flare (t1r) — 4 of 8

| ID | Issue | What image shows | What spec requires |
|---|---|---|---|
| t1r01 | Scale | Cracking red-lightning planet | Dense ignition core component |
| t1r06 | Scale | Large organic structure over Earth | Plantlike wick component |
| t1r07 | Scale | Lava-cracked moon | Heat sink baffle plate |
| t1r08 | Scale | Massive circular ignition complex | Compact civic ignition tool |

### Tier 1 — Continuum (t1s) — 3 of 8

| ID | Issue | What image shows | What spec requires |
|---|---|---|---|
| t1s03 | Scale | Planet-sized anchor ring structure | Compact anchor ring component |
| t1s04 | Scale | Large spherical scaffold around a world | Crystalline time-lock component |
| t1s05 | Scale | Gothic citadel space station | Abstract protocol wafer |

---

### Tier 2 — Verdance (t2e) — ALL 6

| ID | Issue | What image shows |
|---|---|---|
| t2e01 | Scale | Planet-scale vine tendrils looping between multiple planets |
| t2e02 | Scale | Planet-scale organism with globe spheres |
| t2e03 | Scale | Planetary-scale bio-frame clutching multiple planets |
| t2e04 | Scale | System-scale neural vine network with planets |
| t2e05 | Scale | Planet-scale biological Dyson-sphere with orbital rings |
| t2e06 | Scale | Planet-scale vine-tree forest with glowing planet spheres |

### Tier 2 — Abyss (t2o) — ALL 6

| ID | Issue | What image shows |
|---|---|---|
| t2o01 | Scale | Planetary-scale circuit dome over horizon with multiple planets |
| t2o02 | Scale | Large circular void megastructure / ring station |
| t2o03 | Scale | Large black dome with geodesic satellite spheres and planets |
| t2o04 | Scale | Cluster of massive purple-light vats hanging in space |
| t2o05 | Scale | Large cylindrical structure with ring and multiple planets |
| t2o06 | Scale ⚠️TEXT | Large void warship with planets; "DIMENSIONAL SHEAR" baked at bottom |

### Tier 2 — Radiance (t2p) — ALL 6

| ID | Issue | What image shows |
|---|---|---|
| t2p01 | Scale | Galaxy-scale orrery / planetary system |
| t2p02 | Scale | Massive golden pyramid with sun and multiple planets |
| t2p03 | Scale | Planet-scale ring disc world with moons |
| t2p04 | Scale | Planet-scale concentric solar array with Saturn visible |
| t2p05 | Scale | Planet-scale dome orrery with multiple planets |
| t2p06 | Scale | Massive pyramid with tiered ring-cities and planets inside |

### Tier 2 — Flare (t2r) — ALL 6

| ID | Issue | What image shows |
|---|---|---|
| t2r01 | Scale | Lava planet with orbital ring megastructures |
| t2r02 | Scale | Planet-scale industrial cross-structure with multiple planets |
| t2r03 | Scale | Planet-scale Dyson ignition sphere with moons |
| t2r04 | Scale | Giant column with planetary orbital rings |
| t2r05 | Scale | Large orbital platform cross above Earth |
| t2r06 | Scale ⚠️TEXT | Dyson ring structure; "ENTROPIC STAR CORE" baked at top |

### Tier 2 — Continuum (t2s) — ALL 6

| ID | Issue | What image shows |
|---|---|---|
| t2s01 | Scale | Large multi-ring portal megastructure |
| t2s02 | Scale | Planet-scale Dyson ring with planets inside |
| t2s03 | Scale ⚠️TEXT | Large data-stream ring structure with annotation text throughout |
| t2s04 | Scale ⚠️TEXT | Capsule with solar system inside; "CONTINUITY VESSEL" baked at bottom |
| t2s05 | Scale ⚠️TEXT | Giant ring structure with planets; "MNEMOSYNE STAR-INDEX" baked at top |
| t2s06 | Scale | Planet-scale black hole / accretion disk with multiple planets |

---

### Tier 3 — Verdance (t3e) — ALL 4

| ID | Issue | What image shows |
|---|---|---|
| t3e01 | Scale | Galaxy-scale vine spiral with galaxy in background |
| t3e02 | Scale | Galaxy-scale neural vine network over a galaxy |
| t3e03 | Scale | Galaxy-scale organic spiral vortex |
| t3e04 | Scale | Galaxy-scale vine mesh wrapping a galaxy disc |

### Tier 3 — Abyss (t3o) — ALL 4

| ID | Issue | What image shows |
|---|---|---|
| t3o01 | Scale | Galaxy-scale dark root-tree with void sphere nodes |
| t3o02 | Scale | Galaxy-scale egg/dome grid over a galaxy |
| t3o03 | Scale | Galaxy-scale probe/node network over a galaxy |
| t3o04 | Scale ⚠️TEXT | Crown megastructure over galaxy; multiple annotated labels baked in ("Galactic Void Crownwork", "Dark pressure glass crownwork", "Sealed void-crown nodes", "Hidgen depths of distributed void relays") |

### Tier 3 — Radiance (t3p) — ALL 4

| ID | Issue | What image shows |
|---|---|---|
| t3p01 | Scale ⚠️TEXT | Galaxy-scale relay ring network; heavily annotated with ~8 baked labels ("POLYCIC THRAAD RAIDSS", "COHERENT COMETRY REDE", "VOID-LANE DIMENSIONAL-PRESSURE INFRACTUCTURE", "CIVIC SIGNAL PATHWAYS", "SQUAU ROSI LANE", "COHERENT LENS GEOMETRY NODES", "GALAXY-SPANDING RELAYS", "CIVIC NO NODES") |
| t3p02 | Scale | Galaxy-scale coherence node web over a galaxy |
| t3p03 | Scale | Galaxy-scale golden ring / temple complex |
| t3p04 | Scale | Galaxy-scale chandelier / antenna structure |

### Tier 3 — Flare (t3r) — ALL 4

| ID | Issue | What image shows |
|---|---|---|
| t3r01 | Scale ⚠️TEXT | Galaxy-scale lava blade; glyph-run text baked along both edges |
| t3r02 | Scale | Galaxy-scale coiled lava tube |
| t3r03 | Scale | Galaxy-scale dark tower with orbital rings |
| t3r04 | Scale ⚠️TEXT | Compact cylindrical device (scale acceptable!) but laser beams carry many baked labels ("SEEDING", "IGEHK POINT", "KLEHBI POINT", "DOON POINT", "BIG NATION POINT", etc.) — galaxy-background context also breaks spec |

### Tier 3 — Continuum (t3s) — ALL 4

| ID | Issue | What image shows |
|---|---|---|
| t3s01 | Scale | Galaxy-scale coil/chain tube structure |
| t3s02 | Scale | Large torus ring over a planet |
| t3s03 | Scale | Galaxy-scale ring/data tube complex |
| t3s04 | Scale | Galaxy-scale dark crown sitting over a galaxy disc |

---

## Regen Priority Order (suggested)

Given that all T2 and T3 cards need regen (50 cards) plus 20 T1 cards, a suggested batch priority:

1. **T1 scale failures** (20 cards) — same tier as acceptable cards already in play; fixes most visible contrast between good and bad art in the live market.
2. **T2 scale failures** (30 cards) — mid-game cards players see most often.
3. **T3 scale failures** (20 cards) — endgame cards; least frequently seen but most prestigious.
4. **Inpainting** (t1r03, t1p02) — quick wins, any time.

For each regen card, the target `artPrompt` is already specified in `artifacts/api-server/src/lib/cardLore.ts` under the card's entry. Use that prompt verbatim; do not revert to megastructure/planetary framing.

---

## Regen Prompt Rules (apply to every pass)

- Depict **only the named component** — a tool, seed, bead, shard, cell, coil, token, wafer, or small mechanism.
- Subject fills ≥60% of the frame at handheld or tabletop scale.
- **No planets, no moons, no Earth limb, no galaxy visible** in background.
- Background: abstract energy field, dark studio void, or close macro surface texture.
- No baked-in text, labels, annotations, or UI marks anywhere in the image.
- Affinity palette: Verdance=deep green; Abyss=dark purple/black; Radiance=gold/pearl; Flare=red/orange; Continuum=sapphire blue.
