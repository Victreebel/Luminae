# LUMINAe_ARTIFACT_CONTENT_PATCH_PLAN_v0.1.md

## Purpose

This document translates the current Luminae canon stack into a safe, implementation-ready artifact content patch.

It is designed to improve artifact names, lore framing, civilization/species-family metadata, and future art direction **without changing mechanics**.

This patch plan should be used after the following sources are active:

- `LUMINAE_SYSTEM_GRAMMAR_V0.1.md`
- `LUMINAE_SPECIES_AND_CIVILIZATION_GRAMMAR_V0.1.md`
- `LUMINAE_ARTIFACT_FAMILY_MAP_v0.1.md`
- `LUMINAe_ARTIFACT_MASTER_TABLE_v0.3.md`
- `LUMINAe_CARD_ASSET_AND_TEMPLATE_RULES_v0.1.md`
- `LUMINAe_COLOR_AND_MATERIAL_RULES_v0.1.md`

---

## Patch Scope

### Allowed in this patch

- Artifact display names, selectively
- Artifact subtitle/flavor/lore text
- Civilization/species-family metadata
- Artifact-family tags
- Art prompt direction
- Color/material direction
- Notes for future card art regeneration

### Not allowed in this patch

- Artifact cost changes
- Tier changes
- Eminence changes
- Mechanical effect changes
- Blueprint changes
- Luminary requirements
- Luminary roster changes
- Tutorial beat-order changes
- Board layout changes
- New Singularity artifact color/path

Core rule:

```text
This patch improves meaning and presentation, not balance.
```

---

## Card Asset Uniformity Rule

All future artifact images must be clean artwork only.

Do not bake the following into the image:

```text
titles
borders
card frames
cost icons
affinity icons
labels
UI chrome
rarity marks
rules text
buttons
```

The app/card template owns:

```text
title
tier
cost
artifact type
border/frame
Forge/Encrypt buttons
selection state
rules text
metadata overlays
```

This is required because prior cards had inconsistent baked-in titles/borders, making the card set visually non-uniform.

---

## Global Naming Rules

Artifact names should sound like technologies, structures, instruments, or systems — not like Luminaries, disasters, or one-time events.

### Prefer

```text
Vault
Engine
Array
Lattice
Relay
Crucible
Beacon
Spindle
Archive
Furnace
Gate
Seedbank
Observatory
Cathedral
Protocol
Chamber
```

### Avoid unless intentionally justified

```text
Apocalypse
Annihilation
God
End
Voidlord
Finality
Ascension
Judgment
Oblivion
Cataclysm
```

Some dramatic terms may still work, but they should usually belong to Luminaries, Blueprints, or rare capstone artifacts rather than ordinary artifacts.

---

## Artifact Metadata Fields to Add or Standardize

Each artifact should ideally include these non-mechanical metadata fields:

```text
artifactFamily
speciesCivilizationLane
survivalStrategy
visualMaterials
artPromptSeed
luminaryImplication
```

Example:

```text
artifactFamily: Root Vault / Ancestral Archive
speciesCivilizationLane: Verdance + Continuum hidden ancestral biosphere
survivalStrategy: life survives by preserving memory through living systems
visualMaterials: emerald bioglow, ancient bark-metal, pollen motes, soft archive light
luminaryImplication: points toward regenerative/ancestral Luminary paths
```

These fields are for design consistency, lore, art generation, and future filtering. They should not change gameplay unless explicitly promoted later.

---

## Affinity-Specific Content Rules

### Flare artifacts

Should feel like:

```text
ignition
reactors
propulsion
impact
burst energy
risk-taking
crisis transformation
```

Visual materials:

```text
red-orange plasma
scorched alloy
magnetic containment
white-hot cores
thermal stress fractures
```

Avoid making every Flare artifact simply “fire magic.”

---

### Verdance artifacts

Should feel like:

```text
growth
adaptation
regeneration
symbiosis
mutation
living infrastructure
```

Visual materials:

```text
emerald bioluminescence
vascular roots
living glass
seed pods
fungal networks
adaptive membranes
```

Avoid reducing Verdance to generic plants. It includes broad adaptive life, from microbes to megastructural biospheres.

---

### Continuum artifacts

Should feel like:

```text
memory
time
archives
recursion
prediction
sequence
continuity
```

Visual materials:

```text
cyan-blue temporal flow
clockless geometry
layered translucent rings
star maps
archive crystals
recursive inscriptions
```

Avoid making Continuum simply “blue magic.”

---

### Abyss artifacts

Should feel like:

```text
concealment
pressure
secrecy
denial
hidden depth
void survival
forbidden archives
```

Visual materials:

```text
black-violet voidglass
gravitational lensing
subterranean obsidian
negative-space halos
sealed black chambers
```

Avoid making all hidden/secret mechanics automatically Abyss unless the artifact’s civilization logic supports it.

---

### Radiance artifacts

Should feel like:

```text
revelation
law
coordination
visibility
beacons
legibility
shared signal
```

Visual materials:

```text
solar gold
sacred white-gold
clean luminous geometry
beacon lenses
ordered light arrays
civic architecture
```

Avoid generic yellow magic. Radiance should feel like civilization making reality legible.

---

### Singularity

Singularity is not a normal artifact color.

Do not create ordinary Singularity artifacts in the core system.

Singularity may appear as:

```text
wild resource
convergence pressure
visual language for compression
rare anomaly
Encrypt-adjacent prismatic compression aesthetic
```

But it should not become:

```text
a sixth artifact lane
a Luminary path
a standard species family
```

---

## Global Action Visual Separation

### Forge

Forge is a global action, not Radiance.

Use:

```text
dark cosmic metal
hammer retained
white-hot strike
small gold sparks
artifact-affinity glints
outward manifestation
```

### Encrypt

Encrypt is a global action, not Abyss or Continuum.

Use:

```text
obsidian glass
prismatic white cipher aperture
chromatic edge fracture
inward compression
sealed recoverable pattern
```

---

## Content Patch Strategy

Use a four-pass method.

### Pass 1 — Metadata Only

Add or standardize:

```text
artifactFamily
speciesCivilizationLane
survivalStrategy
visualMaterials
artPromptSeed
luminaryImplication
```

No visible card changes required yet.

### Pass 2 — Name Review

Flag names that read as:

```text
Luminaries
events
disasters
vague cosmic poetry
unanchored sci-fi nouns
```

Rename only when the current name weakens clarity.

### Pass 3 — Lore/Flavor Review

Rewrite flavor text so each artifact answers:

```text
What civilization built this?
What survival strategy does it express?
What future Luminary path might it point toward?
```

### Pass 4 — Art Prompt Preparation

Prepare clean art prompt seeds following the card asset rules:

```text
No title.
No border.
No card frame.
No cost icons.
No labels.
No UI.
Clean artifact artwork only.
```

---

## Replit Implementation Guardrails

When implementing this in Replit, the prompt must explicitly say:

```text
Do not change mechanics, costs, tiers, effects, Luminaries, Blueprints, tutorial beats, or board layout.
```

Allowed implementation targets:

```text
artifact metadata
lore text
flavor text
future art prompt fields
non-mechanical tags
```

Do not let the implementation infer mechanical changes from the new lore.

---

## Recommended Immediate Patch

The first app-facing patch should be conservative:

```text
Add artifactFamily, speciesCivilizationLane, visualMaterials, and artPromptSeed metadata to artifact data where safe.
Do not display all metadata in the main card UI yet.
Use metadata for internal organization and future card art regeneration.
```

Visible UI changes should wait until the metadata is stable.

---

## Acceptance Criteria

The patch is successful if:

```text
Artifacts are more clearly tied to civilization/species families.
No mechanics changed.
No costs changed.
No tiers changed.
No Luminaries changed.
No Blueprint functionality changed.
No tutorial behavior changed.
Future image prompts are cleaner and more uniform.
Cards no longer drift toward baked-in titles/borders in future art generation.
```

---

## High-Level Recommendation

Do not rewrite the artifact roster from scratch.

The current roster is broadly usable. The main improvement is adding a strong design-language layer:

```text
Artifact = technology breadcrumb toward a civilization path.
```

The safest next move is metadata and naming/lore refinement first, followed by selective art regeneration later.
