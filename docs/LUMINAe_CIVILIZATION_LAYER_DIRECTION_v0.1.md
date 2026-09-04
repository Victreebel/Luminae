# LUMINAe Civilization Layer Direction v0.1

> **Superseded direction history.** The Civilization System Guide v1.0 and the
> later Civilization audit/calibration documents govern current implementation.

## Status

**Canonical direction document for the Civilization layer.**

This document consolidates the current design direction, implementation state,
and pending goals for the Civilization view. It should be read with:

- `LUMINAe_TECHNOLOGY_SYSTEM_v1.0.md`
- `LUMINAe_ARTIFACT_AUDIT_v1.0.md`
- `LUMINAe_BLUEPRINT_VERTICAL_SLICE_v1.0.md`
- `LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v0.2.md`
- `LUMINAe_CIVILIZATION_RULES_CALIBRATION_v1.0.md`
- `LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md`

Those documents define the technology canon. This document defines how that canon
should be represented in the Civilization layer.

## North Star

The Civilization layer is not a literal card shelf. It is the player's
civilization becoming visible.

The view should sell the fantasy that every forged Artifact, completed
Blueprint, allied Luminary, and recovered Chronicle has changed the world,
system, or galaxy in a coherent way. The scene should feel like a premium,
marketable civilization portrait first, and a scan/explanation interface second.

The player should be able to say:

```text
I can see what my civilization is becoming.
I can inspect why it looks that way.
The game respects scale, consequence, and visual style.
```

## Design Philosophy From Planning

This direction comes from several planning decisions that should remain visible
when future work resumes.

### Player Preferences Are Signals, Not Absolute Constraints

The design process should use player preferences as strong recommendations, but
not as hard constraints when a better market solution emerges. The Civilization
layer should keep iterating until the answer to "is this market optimized?" can
honestly be yes, rather than merely satisfying the last literal suggestion.

### Market Optimized Means Publicly Legible And Worth Showing

The target is not only functional clarity. The Civilization layer should look
engaging to someone seeing the game for the first time in a trailer,
screenshot, stream, or store page. If the scene is technically accurate but
looks generic, sparse, or hard to read, it is not finished.

The earlier mockup direction remains the visual aspiration: a cinematic sci-fi
command view with a strong environmental plate, clear scan affordances, and
premium presentation. The implementation should approach that quality without
copying impossible UI clutter or adding effects that slow live play.

### The Civilization Is A Place, Not A Symbol Board

The layer should avoid becoming a collection of little icons laid over a
background. Pins and symbols may exist as interaction handles, but the primary
fantasy is a civilization with districts, routes, fields, structures,
institutions, scars, and active systems.

When a player asks what an Artifact is doing there, the answer should be
spatial and contextual:

```text
This recovered work powers that district.
This containment device creates that exclusion zone.
This archive changes how the civilization remembers.
This launch technology feeds that orbital industry.
```

### The Map-Pin Insight Is Central

Small Artifacts should often appear as deployment sites on a map, not as
visible objects from space. A pin should be able to open an explanation of what
the Artifact is doing in that place and how it interacts with the player's
other Artifacts, Blueprints, Luminaries, and Chronicles.

The pin is not the spectacle. The local consequence is the spectacle.

### Solid Forms Must Be Layer-Specific

If a visual treatment becomes more solid and authored, it cannot simply be the
same trace graphic reused on every scene. A solid city-scale form, orbital
form, stellar form, and galactic form need different compositions because they
represent different physical realities.

This is why layered zooms matter: city-scale work belongs in city detail;
planet-scale work belongs in orbit; star-system work belongs in stellar view;
galactic works belong at sector scale.

### The Scene Should Evolve Without Becoming Generic

Procedural systems are useful for speed and coverage, but they must not make
every civilization feel like the same overlay on a different background. The
long-term direction is an authored-but-extensible system:

- shared rules for scale and performance
- reusable treatment families
- distinct archetype plates
- Artifact-specific or family-specific consequences
- Blueprint-specific environmental projects
- Chronicle and cosmetic slots that can be added without redesigning the engine

The result should feel coherent and expandable, not templated.

### Speed Is Part Of The Aesthetic

The Civilization layer is allowed to be beautiful, but it is not allowed to make
the game feel slow. A marketable game still has to feel responsive. Every visual
upgrade should preserve the performance budget or provide a reduced-motion /
low-cost equivalent.

## Core Principles

### 1. Scale Honesty

The scene must not pretend a small object is visibly giant from orbit.

Artifact artwork scale determines where the Artifact's main depiction belongs:

| Artwork scale | Native representation |
|---|---|
| `macro` | local pin / site only |
| `tabletop` | local pin / site only |
| `room` | city/surface deployment site |
| `installation` | city/surface visible structure |
| `planetary` | planet/orbit-scale infrastructure |
| `stellar` | star-system work or megastructure |
| `galactic` | galactic sector, route, institution, or network |

Higher views may show the Artifact's consequence, influence, traffic, field,
district, route, or policy effect, but not an impossible scaled-up copy of the
card object.

### 2. Consequence Over Iconography

Small artifacts should register through what they do:

- a city district changes
- a quarantine zone appears
- an orbital route lights up
- a memory archive becomes active
- a forge corridor wakes
- a biosphere recovery belt spreads
- a scan pin opens a contextual dossier

The default answer should not be "put a small symbol on the map." Symbols are
allowed as UI affordances, but the marketable read must come from environment,
lighting, composition, and consequence.

### 3. Cinematic First, Scan On Demand

The default Civilization view should be visually clean and emotionally legible.
Scan mode is where detail, pins, dossiers, and explanatory copy belong.

Default mode answers:

```text
What kind of civilization am I looking at?
What changed recently?
What is the dominant mood, scale, and power?
```

Scan mode answers:

```text
Which forged works are registered?
Where do they belong?
What are they doing?
What card or Blueprint does this connect to?
```

### 4. Layered Zooms

The view should support nested scale:

```text
Galaxy -> Stellar system -> Planet/orbit -> City/surface site
```

A city-scale Artifact should be inspectable at city scale. At orbit or stellar
scale, the same Artifact should be represented by consequences such as launch
traffic, power routing, weather alteration, warning fields, or civic patterns.

The zoom layers do not need simulated camera travel. They need clear,
responsive, stable transitions between authored scale plates.

### 5. Blueprints Are Projects

Blueprints are not extra card widgets inside the scene. They are synthesized
civilizational projects.

Examples:

- Antimatter Detonator becomes controlled annihilation infrastructure,
  quarantine orbit, interdiction lanes, and warning architecture.
- Mantle-to-Orbit Foundry becomes industrial ascent, freight routes, orbital
  manufacture, and city-to-orbit logistics.
- Worldshield Covenant becomes a public protective envelope, treaty-lit defense
  systems, warning beacons, and repair infrastructure.

Blueprints should be among the most visible environmental consequences in the
Civilization layer because they represent major milestones.

### 6. Luminaries Are Atmospheric Influence

Allied Luminaries should not appear as animated bodies inside the Civilization
view. Their presence should be shown as pressure on the civilization:

- affinity auroras
- altered skyline or route behavior
- treaty glow
- shadow fields
- signal distortion
- weather, ecology, archive, or containment motifs

This keeps the Luminary card/panel identity distinct while allowing the
civilization to feel changed by alliance.

### 7. Chronicles Are Memory And Direction

Chronicles should eventually appear as recovered story threads, archive spines,
mission records, or narrative routes. They should help the Civilization layer
become the story-mode hub without turning the scene into a menu.

### 8. Performance Is A Feature

The Civilization layer must stay fast enough to remain open during live play.

Rules:

- Prefer bitmap plates, CSS transforms, opacity, and low-cost SVG.
- Avoid live particles, animated masks, heavy filters, and per-frame layout work.
- Cap visible scan pins and cluster overflow.
- Keep board-side previews paused or near-static.
- Keep card art out of the live scene except inside selected dossiers.
- Pause or reduce motion in compact/thumbnail contexts.

Marketability is not only spectacle. A premium scene that slows the game down is
not market-optimized.

## Current Implementation

### Canon And Metadata

Current source files:

- `artifacts/luminae/src/lib/civilizationArtworkScale.ts`
- `artifacts/luminae/src/lib/civilizationDeploymentSites.ts`
- `artifacts/luminae/src/lib/civilizationArchetypes.ts`
- `artifacts/luminae/src/lib/civilizationArtRegistry.ts`
- `artifacts/luminae/src/lib/civilizationVisualSignatures.ts`
- `artifacts/luminae/src/lib/civilizationProfile.ts`

The implementation already has a view-model concept:

```ts
CivilizationDeploymentSite
```

Deployment sites can currently represent:

- forged Artifacts
- completed Blueprints
- allied Luminaries
- anonymous scenario protocols
- Chronicle records

Each site has fields for scale, native layer, affinity, trait, visual cue,
summary, source quality, representation mode, related Artifacts, and anchor.

### Scale Policy

`civilizationArtworkScale.ts` defines the current scale policy. It distinguishes
local object depictions from structures and high-scale infrastructure.

Important implemented rule:

```text
macro/tabletop card art cannot render as giant structures.
```

### Deployment Sites

`civilizationDeploymentSites.ts` builds Civilization sites from existing game
state. It uses:

- forged Artifacts
- lore catalog metadata
- Kardashev tier
- manifested Blueprint devices
- allied Luminary state
- scenario protocols
- Chronicle records

It also contains current Blueprint environmental copy for Antimatter,
Mantle-to-Orbit, and Worldshield.

### Scene Panel

`CivilizationScenePanel.tsx` currently provides:

- cinematic mode
- scan mode
- deployment pins
- selected-site dossiers
- mobile scan rail
- layered scene selection
- recent-forge trace/reveal handling
- surface, orbit, stellar, and galaxy scene types
- archetype-driven atmosphere
- capped/filtered visible site rendering

### Miniature Preview

`CivilizationMiniatureScene` supports the board-side preview. It is intended to
be lower-cost than the full tab view and to show recent civilization changes
without turning the game board into a heavy second scene.

### Dev Preview

`/dev/civilization-scene` exists as the review bench for Civilization layer
states, tiers, presets, scan mode, recent forge traces, Blueprints, and Luminary
influence.

### Tests

The Civilization layer currently has focused tests for:

- artwork scale policy
- deployment site generation
- archetypes
- art registry
- visual signatures
- scene panel behavior
- board preview behavior
- tab/recent trace integration

## Current Gaps

### 1. Visuals Do Not Yet Fully Match The Market Mockups

The architecture now points in the right direction, but the live view still does
not consistently achieve the cinematic quality of the stronger mockups.

Main causes:

- several plates are still generic or transitional
- many Artifact consequences are procedural overlays rather than authored
  environmental forms
- the scan interface has clearer logic than visual drama
- live-game updates can be too subtle
- the city/surface layer is not yet carrying enough of the "civilization at work"
  fantasy

### 2. Metadata Coverage Needs Hardening

The system depends on metadata such as:

- depiction scale
- artifact form
- blueprint role
- likely Blueprint family
- civilization lane
- visual motif
- treatment override

If metadata is missing or too generic, the Civilization view falls back to
generic traces. The direction requires a complete pass over Artifact metadata
against the card artwork, not just the card tier.

### 3. Asset Slots Exist, But The Asset Pipeline Is Not Complete

`civilizationArtRegistry.ts` makes room for:

- base plates
- archetype variants
- Blueprint consequences
- artifact treatments
- Chronicle visuals

However, purchased graphics, future card packs, future Blueprints, and future
Chronicles still need a formal contribution path:

```text
new content -> metadata -> art slot -> scale policy -> deployment site -> preview -> tests
```

### 4. Zoom Layers Need Stronger Product Definition

The current implementation supports scale scenes, but the product meaning of
each layer needs to become sharper:

- surface: city/district/site-level work
- orbit: planet-scale consequence and orbital infrastructure
- stellar: system-scale infrastructure and interplanetary networks
- galaxy: sectors, routes, institutions, and galactic achievements

The layers should eventually feel like different authored views of the same
civilization, not one overlay system repeated at different zoom levels.

### 5. Recent Forge Feedback Is Not Yet Strong Enough

A newly forged Artifact should clearly register in the Civilization layer.

The player should notice:

```text
Something just joined my civilization.
It has a place.
It is doing work.
I can inspect it.
```

The current trace/reveal system exists, but the visible impact still needs a
stronger default presentation.

### 6. Mobile Needs A Stricter Composition Budget

Mobile Civilization view should avoid awkward scrolling and cramped UI. The
market direction favors:

- a dominant cinematic plate
- one primary scan focus
- a compact bottom or side rail
- short dossier text
- no dense panels over the scene unless explicitly inspecting

## Pending Goals

### Goal A: Dedicated Civilization Layer Canon

This document is the starting point. Next steps:

1. Keep this file updated when scale rules or representation rules change.
2. Add examples when a new Blueprint, Artifact family, or Chronicle type is
   introduced.
3. Treat this as the design checkpoint before major Civilization visuals are
   implemented.

### Goal B: Metadata Completion Pass

Audit every Artifact against its actual artwork and assign:

- `depictionScale`
- `artifactForm`
- `blueprintRole`
- `blueprintFamilies`
- `civLane`
- visual motif
- optional treatment override

Acceptance criteria:

- small objects never become giant structures
- large works appear only at plausible layers
- every Artifact has a non-generic civilization consequence
- every fallback is rare and intentionally worded

### Goal C: Stronger Market Plates

Replace transitional plates with authored market-ready plates:

- city/surface
- planet/orbit
- stellar system
- galaxy

Each plate should have:

- cinematic version
- scan-safe version
- room for pins/dossiers
- visual hooks for all major archetypes
- mobile-safe composition

### Goal D: Artifact Treatment Library

Build a reusable library of authored treatment families. Initial families:

- recovery / biosphere
- ignition / forge
- containment / quarantine
- transit / route
- archive / memory
- accord / civic legitimacy
- aperture / threshold
- replication / fabrication
- entropy / waste-heat

Treatments should produce environmental consequences, not just icons.

### Goal E: Blueprint Consequence Library

Blueprints need special visual priority. Each completed Blueprint should define:

- primary layer
- secondary layers
- environmental consequence
- scan dossier language
- animation/reveal style
- compact representation
- owned/unowned/hidden/corrupted states

### Goal F: Luminary Influence Library

Each allied Luminary should have a distinct atmospheric influence:

- affinity tone
- pressure field
- civic/ecological/route/archive consequence
- reduced-motion equivalent
- scan dossier explanation

No Luminary body should be rendered in the Civilization view unless a future
feature explicitly changes this rule.

### Goal G: Chronicle And Story Hub Integration

Chronicles enter the Civilization layer through the contract in
`LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md`: immutable primary outcomes,
separate counterfactual Archive Rehearsals, concrete story facts, account-sealed
relationship memory, and linked Civilization Records. They should support:

- story-mode progression
- campaign aftermath
- remembered choices
- civilization identity changes
- future campaign leads

They should not be presented as broken or unavailable missions.

The current `Outer Vault Access` entry is a transitional Threshold Record, not a
fabricated primary Chronicle. Future content availability must remain distinct
from story locks, and Rehearsals must never replace historical Civilization
state.

### Goal H: Purchased Graphics And Future Content Slots

Future purchased or earned visuals should plug into the same registry rather
than bypassing the system.

Required content contract:

```text
id
kind
eligible scene layer
eligible archetype or affinity
asset slot
fallback behavior
performance class
preview preset
test coverage
```

This is how new graphics, Artifacts, Blueprints, and Chronicles can slot in
without rebuilding the scene engine each time.

### Goal I: Live-Game Impact Pass

The full Civilization tab and board-side preview should make absorbed/forged
Artifacts visible enough to matter.

The next pass should improve:

- recent trace prominence
- tab badge clarity
- miniature preview legibility
- one-click jump from notice to relevant scan
- persistence of "new work registered" until seen

### Goal J: Performance And QA Gate

Before calling the Civilization layer market-optimized, verify:

- full view desktop
- full view mobile
- board-side miniature
- multiple recent forges
- multiple Blueprints
- multiple allied Luminaries
- low-end/reduced-motion mode
- long game state with many forged Artifacts

The scene should remain stable and responsive with no obvious frame drops.

## Market-Optimized Acceptance Criteria

The Civilization layer is market-optimized only when all of the following are
true:

1. The default view looks like a premium civilization portrait without requiring
   scan mode.
2. A recent forge produces a visible, satisfying update.
3. Small artifacts register through plausible local sites or consequences.
4. Planetary, stellar, and galactic civilizations feel meaningfully different.
5. Blueprints read as major projects, not UI cards.
6. Luminaries influence the scene without becoming clutter.
7. Scan mode is clear, fast, and informative.
8. Mobile composition does not feel like a shrunken desktop panel.
9. New content can be added through metadata and art slots.
10. The scene does not noticeably slow live gameplay.

Until these criteria are met, the honest answer to "is the Civilization scene
engine market optimized?" should be:

```text
Not yet. The direction is right, but the visual and content coverage are still
in progress.
```

## Non-Goals

- Do not turn the Civilization view into a literal display of every card.
- Do not use giant versions of small Artifact art for spectacle.
- Do not add live Luminary bodies to the scene.
- Do not make scan pins the primary visual fantasy.
- Do not add heavy real-time effects that risk slowing the game.
- Do not expose hidden Blueprint identities through Civilization visuals.
- Do not require backend schema changes for v1 unless the content model truly
  cannot be represented client-side.

## Immediate Next Work

1. Complete the Artifact metadata audit against actual card artwork.
2. Strengthen recent-forge visibility in the live game.
3. Replace remaining generic/procedural looks with authored plate/treatment
   slots.
4. Define the exact asset contract for purchased Civilization graphics.
5. Capture desktop and mobile screenshots for surface, orbit, stellar, and
   galaxy scenes.
6. Use this document as the review checklist before more Civilization optics
   work.
