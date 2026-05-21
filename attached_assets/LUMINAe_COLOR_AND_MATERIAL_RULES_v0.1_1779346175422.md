# LUMINAe_COLOR_AND_MATERIAL_RULES_v0.1.md

## Purpose

This document translates Luminae's system grammar into practical color and material rules for UI, card art, artifact prompts, affinity emblems, animations, and future visual redesigns.

It exists to prevent color drift. The affinity/species/design specs define what colors must communicate; art direction decides how those colors actually look.

Core rule:

```text
Color supports meaning, but color alone should not carry meaning.
Use color + silhouette + material + lighting + iconography + metadata.
```

---

# 1. Relationship to Other Canon Sources

This document is a companion to:

```text
LUMINAE_SYSTEM_GRAMMAR_V0.1.md
LUMINAE_SPECIES_AND_CIVILIZATION_GRAMMAR_V0.1.md
LUMINAE_ARTIFACT_FAMILY_MAP_v0.1.md
LUMINAe_CARD_ASSET_AND_TEMPLATE_RULES_v0.1.md
```

It should guide:

```text
card art prompts
artifact redesigns
emblem generation
UI polish
animation color choices
Forge / Encrypt visual treatment
Luminary art direction
```

It should not override mechanical data unless explicitly approved.

---

# 2. Global Color Philosophy

Luminae uses color to express **civilizational survival strategies**, not simple elemental categories.

Correct:

```text
Flare = survive by burning / expenditure / ignition
Verdance = survive by growing / adapting / regenerating
Continuum = survive by enduring / remembering / sequencing
Abyss = survive by concealing / absorbing / outlasting
Radiance = survive by revealing / coordinating / legitimizing
Singularity = convergence / wildcard compression, not a normal civilization affinity
```

Incorrect:

```text
Flare = just fire
Verdance = all biology
Continuum = all blue technology
Abyss = all secrecy mechanics
Radiance = generic yellow magic
Singularity = purple sci-fi
```

---

# 3. Affinity Palette and Material Rules

## Flare

**Core palette:** red-orange plasma, molten ember, reactor glow.  
**Material language:** heated metal, combustion, propulsion, star-engine surfaces, scorched ceramic, plasma conduits.  
**Lighting:** directional, hot, aggressive, high contrast.  
**Avoid:** making Flare indistinguishable from Radiance gold.

Visual read:

```text
volatile energy, ignition, crisis action, propulsion, overdrive
```

---

## Verdance

**Core palette:** emerald, living green, green-gold biological glow.  
**Material language:** leaves, vines, mycelium, wet biopolymer, cellular membranes, adaptive tissue, living architecture.  
**Lighting:** soft internal bioluminescence, regenerative glow, organic translucency.  
**Avoid:** reducing Verdance to generic forest fantasy or making all biological life automatically Verdance.

Visual read:

```text
adaptation, growth, regeneration, symbiosis, living systems
```

---

## Continuum

**Core palette:** deep blue, cyan temporal flow, cool luminous currents.  
**Material language:** glass channels, clockwork recursion, flowing data, archives, layered rings, orbital paths, timekeeping structures.  
**Lighting:** smooth, directional flow; calm, elegant, sequential.  
**Avoid:** letting Encrypt become Continuum-blue merely because it involves preservation.

Visual read:

```text
memory, recurrence, sequence, prediction, endurance through time
```

---

## Abyss

**Core palette:** black-violet, void purple, negative-space shadows.  
**Material language:** obsidian depth, gravity wells, pressure hulls, sealed vaults, hidden apertures, black archives.  
**Lighting:** low-key, rim-lit, partly concealed; luminous details emerge from darkness.  
**Avoid:** making every hidden, encrypted, or secret mechanic Abyss-purple.

Visual read:

```text
concealment, depth, absorption, forbidden knowledge, survival under pressure
```

---

## Radiance

**Core palette:** solar gold, sacred white-gold, luminous amber-gold.  
**Material language:** beacon lenses, polished solar metal, gold-white light, civic monuments, optics, sacred geometry, signal towers.  
**Lighting:** clean, revealing, outward, clarifying; glow should feel ordered rather than explosive.  
**Avoid:** generic yellow magic, pure UI gold, or faceted prismatic crystal language that makes it resemble Singularity.

Visual read:

```text
revelation, coordination, law, visibility, legitimacy, public signal
```

---

## Singularity

**Core palette:** prismatic white, chromatic edge-splitting, diamond-light, impossible lensing.  
**Material language:** crystalline convergence, refracted light, folded geometry, gravitational lens, compressed possibility.  
**Lighting:** white core with rainbow/chromatic edge artifacts; unstable but controlled.  
**Avoid:** making Singularity purple, blue, gold, or a normal sixth affinity color.

Visual read:

```text
wild substitution, convergence, compression, category collapse, impossible possibility
```

Singularity is visually adjacent to Encrypt but does not define a normal Artifact color path.

---

# 4. Global Action Colors Are Not Affinity Colors

Forge and Encrypt are process actions, not affinities.

## Forge

Forge should not look like Radiance.

**Visual identity:** dark cosmic metal + hammer + white-hot strike point + brief gold sparks.  
**Motion:** outward impact, ignition, manifestation.  
**Accent rule:** artifact-affinity sparks may appear, but the action itself is not a Radiance action.

Preferred read:

```text
manifest possibility into permanent Artifact form
```

Avoid:

```text
pure gold button
generic solar magic
replacing the hammer with a star-only icon
```

---

## Encrypt

Encrypt should not look like Abyss, Continuum, or a normal Singularity Artifact path.

**Visual identity:** obsidian glass + prismatic white cipher aperture + chromatic edge fracture.  
**Motion:** inward folding, compression, preservation.  
**Accent rule:** subtle prismatic/Singularity-adjacent effects are allowed, but Encrypt remains a global process.

Preferred read:

```text
preserve compressed possibility for later
```

Avoid:

```text
purple-dominant button
blue-dominant button
gold-dominant button
padlock iconography
generic hacking/code rain
```

---

# 5. UI Trim vs. Affinity Color

UI trim should not steal affinity identity.

Recommended UI trim:

```text
muted antique brass
low-saturation cosmic gold
subtle glass borders
soft blue-black panel depth
```

Important distinction:

```text
Radiance = sacred solar gold / luminous affinity identity
UI trim = muted brass / interface framing
Forge = dark hammer + white-hot impact, with limited gold sparks
```

---

# 6. Card Art Color Rules

Card artwork must follow the card asset/template rules:

```text
No baked-in title.
No baked-in border.
No baked-in cost icons.
No baked-in UI frame.
No baked-in rarity marks.
No labels or text.
```

The art may strongly express affinity colors, but the app/card template owns the standardized readable layer.

For multi-affinity cards:

```text
Primary affinity = dominant material/color/mood
Secondary affinity = supporting color/material/architecture
Tertiary affinity = accent, lighting anomaly, or environmental pressure
```

Avoid equal rainbow mixing unless the card is explicitly about convergence or Singularity-adjacent phenomena.

---

# 7. Multi-Affinity Color Composition

## One-color cards

Should have a clear dominant affinity identity.

Example:

```text
mono-Verdance = living emerald systems, organic growth, regenerative forms
```

## Two-color cards

Should show a primary material plus a secondary method.

Example:

```text
Verdance + Abyss = living biology shaped by concealment/depth
Visual: emerald bioluminescent roots in black-violet subterranean darkness
```

## Three-color cards

Should not become visual noise. Use hierarchy.

Example:

```text
Flare + Continuum + Radiance
Primary: Flare ignition/engine
Secondary: Continuum cyclic/archival structure
Tertiary: Radiance beacon-law glow
```

Rule:

```text
One dominant color family, one secondary color family, one accent/signature effect.
```

---

# 8. Species/Civilization Color Guidance

Color should support the civilization/species lane.

Examples:

## Verdance + Abyss

Visual family:

```text
hidden adaptive life
fungal underworlds
parasite civilizations
buried root minds
bioluminescent crypt ecosystems
```

Color/material:

```text
emerald organic glow + black-violet depth + wet mycelial texture
```

## Flare + Radiance

Visual family:

```text
solar expansion
crusader engines
beacon fleets
oath-furnaces
```

Color/material:

```text
red-orange reactor energy + ordered solar-gold signal geometry
```

## Continuum + Abyss

Visual family:

```text
deep-time secrecy
sealed chronologies
sleeper archives
black vault civilizations
```

Color/material:

```text
cyan temporal traces + black-violet sealed depth
```

---

# 9. Emblem Rules

Affinity emblems should be treated as a matched family.

The original four reference assets currently define the expected emblem style:

```text
gem_flare.png
gem_continuum.png
gem_verdance.png
gem_abyss.png
```

Future Radiance/Singularity replacements should match:

```text
circular or oval gem-coin format
similar detail density
similar lighting angle
similar rim/frame weight
small-icon readability
same overall visual weight
```

Do not replace the whole emblem system just to fix one emblem.

---

# 10. Prompting Rules for Future Image Generation

Every artifact image prompt should include:

```text
Clean card artwork only. No text, no title, no border, no frame, no UI elements, no cost icons, no labels.
```

Every affinity-specific prompt should include:

```text
Use the Luminae affinity color/material rules. Do not let global action colors or UI trim override affinity identity.
```

Every multi-affinity prompt should specify:

```text
Primary visual affinity:
Secondary visual affinity:
Tertiary accent, if any:
```

Example prompt structure:

```text
Create clean card artwork for a Luminae Artifact.
Primary affinity: Verdance — adaptive living systems, emerald bioglow, organic growth.
Secondary affinity: Abyss — hidden depth, black-violet shadow, sealed subterranean pressure.
Subject: a buried mycelial relay beneath a dead moon, glowing through cracks in obsidian stone.
No text, no title, no border, no frame, no UI elements, no cost icons, no labels.
```

---

# 11. Anti-Drift Rules

Do not let:

```text
Radiance become generic yellow magic.
Singularity become purple or blue sci-fi.
Forge become Radiance.
Encrypt become Abyss or Continuum.
UI trim become confused with Radiance.
Verdance become all biology.
Abyss become all secrecy.
Multi-affinity cards become undifferentiated rainbow noise.
```

When visual conflict occurs, prioritize:

```text
1. mechanical clarity
2. affinity grammar
3. species/civilization lane
4. consistent card template
5. beauty/polish
```

---

# 12. Summary

```text
Flare = red-orange plasma / ignition / expenditure
Verdance = emerald living systems / growth / adaptation
Continuum = deep blue-cyan flow / memory / endurance
Abyss = black-violet void / concealment / depth
Radiance = solar gold / revelation / coordination
Singularity = prismatic white / convergence / wildcard compression

Forge = dark hammer + white-hot strike
Encrypt = obsidian-prismatic compression
UI trim = muted antique brass
```

Color should reinforce the world, but the full design language must come from color, material, silhouette, lighting, iconography, and app-rendered metadata together.
