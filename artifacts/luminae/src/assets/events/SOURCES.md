# Cosmic Event card illustrations — v1

Generated on 2026-09-26 with Codex's built-in `image_gen` tool for the owner's
request to match Event cards to the existing game's card art direction.
No CLI/API fallback, external stock images, or artist-name style references.
Existing local Artifact illustrations were inspected for direction; they were
not uploaded as generation inputs or reused as Event identities.

Runtime assets are the eight `*-v1.webp` files in this directory. Unmodified
generated PNGs are retained in `../../../design-mockups/event-card-art-v1/`.
Runtime encoding: proportional resize to 448 pixels wide (640 pixels high),
WebP quality 80, effort 6, smart subsampling. No creative image edits or cropping.
The frame, labels, title veil, and animation are rendered in the app.

## Exact prompt set

Each request used the common prefix below, followed by `Subject: `, its subject
paragraph, and ` Internal asset identity: ` plus its identity followed by
` (do not print that text).`. `transparent_background` was false.

```text
Use case: stylized-concept. Asset type: full-bleed portrait illustration for a LUMINAe cosmic Event game card. Create ONE portrait image, 7:10 aspect ratio, no card frame and NO typography or symbols. Match premium existing science-fantasy card paintings: physically detailed monumental space technology, crisp realistic metal and glass textures, deep near-black space, luminous energy, rich cinematic volumetric light, restrained colors, sense of immense scale. Painterly photoreal concept art, no cartoon, no flat vector, no infographic, no HUD, no labels, no people, no logos, no border or decorative frame. The subject is large and clearly readable in a 224px wide card; strongest focal point in upper-middle, leave bottom quarter visually dark and quiet for a later HTML title overlay, no baked text.
```

### affinity-bloom-v1.webp

Identity: `Planetary Affinity Bloom`

```text
A luminous emerald aurora blossoms in organic petal-like curtains above the curved horizon of a night-side inhabited planet; warm gold riverlike energy flows across its surface and rises into the aurora, a benevolent cosmic replenishment.
```

### forge-drift-v1.webp

Identity: `Planetary Forge Drift`

```text
Three enormous ancient metallic forge structures drift across an inhabited planet's twilight limb, moved gently into new alignments by pale ice-blue gravitic tides; violet dust traces graceful sweeping orbital arcs.
```

### containment-cascade-v1.webp

Identity: `Stellar Containment Cascade`

```text
An immense white-blue transparent containment shell wrapped around an amber miniature star takes a cascading wave of plasma; nested physical shield shells and bronze support structures catch the wave. Awe, pressure and protection at stellar scale.
```

### affinity-inversion-v1.webp

Identity: `Stellar Affinity Inversion`

```text
Two enormous opposing streams of violet and molten gold stellar plasma exchange places around a dark central star well, creating a sweeping S-shaped reversal. Distinct particulate energy flows and tangible glowing dust, cosmic force turning inside out.
```

### entropy-storm-v1.webp

Identity: `Galactic Entropy Storm`

```text
A terrifying rose-red and violet cosmic storm shears luminous stellar currents into drifting shards and dark dust across a distant spiral galaxy. Depth, turbulent volumetric clouds, bright fractured arcs and tiny stars, controlled rather than noisy.
```

### cosmic-reflux-v1.webp

Identity: `Galactic Cosmic Reflux`

```text
A deep violet accretion vortex above a broad galactic plane expels luminous silver streams carrying distant ancient metallic fragments back out into space. Return and renewal from a dark gravitational well, flowing tidal currents, icy pale highlights.
```

### system-shock-v1.webp

Identity: `Stellar System Shock`

```text
An immense amber electromagnetic shock wave passes through an orbital technology network beside a white-blue star. One foreground bronze and obsidian hexagonal reactor installation has developed a glowing fracture and its cyan conduits flicker out. Recoverable physical damage, highly legible silhouette.
```

### fracture-wave-v1.webp

Identity: `Galactic Fracture Wave`

```text
A vast rose-violet spacetime wave rolls across a spiral galaxy, splitting two immense dark metallic technological plates along brilliant fissures in the foreground. Separated fractured surfaces remain recognizable and repairable. Galactic depth, copper edge light and lavender energy.
```
