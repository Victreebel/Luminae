# Luminae — Multiplayer Tabletop Engine-Building Game

## Overview

**Luminae** is an original browser-based multiplayer tabletop engine-building game. It draws inspiration from gem-market tableau mechanics, focusing on collecting colored crystals, acquiring Artifact cards for permanent bonuses, and racing to 15 Eminence. Players also compete for Luminary patron bonuses. The project aims to deliver a polished, real-time multiplayer experience with unique artwork and game mechanics.

## User Preferences

The user prefers that all development and communication adhere to the established terminology for game mechanics (e.g., "affinities" instead of "gems," "Eminence" instead of "prestige"). The user also wants to ensure that all generated images are properly compressed and integrated, and that new art and lore for cards are correctly injected server-side. Additionally, the user wants to prioritize robust animation sequencing and error handling, particularly for state updates and game events. The user prefers that all development-only features, such as the animation sandbox, are fully tree-shaken from production builds.

## Luminary Art Direction (canonical brief — apply to all future generation passes)

### Accepted reference assets (do not overwrite)
- `lum_ember` (Ember Sovereign), `lum_forge` (Iron Harbinger), `lum_verdant` (Verdant Oracle)
- These three define the gold standard for panel style, frame format, density, and polish.

### Panel frame template (canonical reference image)
- **File:** `artifacts/luminae/src/assets/references/luminary_panel_reference.png`
- **Purpose:** Visual style reference only — not a gameplay asset, never rendered in the game.
- This is the empty containment vessel template showing the exact frame architecture to match:
  - Square black background with an ornate gold filigree border (thin gold vine/lattice pattern along all four edges)
  - Four corner gem housings: each is a faceted cut gem set in a gold angular housing with pointed gold flanges — gem color varies per Luminary's affinities
  - Top-center crest: a layered gold diamond/chevron ornament with a central gem, protruding above the frame edge
  - Bottom-center medallion: a circular gold housing with an affinity symbol inset, centered at the bottom edge
  - Large faceted crystal dome occupying ~80% of the card interior — a multi-faceted cut-gem sphere/polyhedron with visible triangular and trapezoidal facet planes
  - Crystal facets are interconnected by gold seam lines at every edge junction — the lattice of gold veins is a key visual signature
  - Facet surfaces: partially transparent/glassy with iridescent prismatic light scatter and specular glints — the Luminary should be visible through/within the facets
  - The dome sits on a dark cosmic background (deep space, particle field, or atmospheric nebula appropriate to the Luminary's affinities)

### Panel hard rules (every panel must satisfy all of these)
- Frame architecture must match the reference template above — gold border, four corner gem housings, top diamond crest, bottom medallion, gold lattice seams on crystal facets.
- Central crystalline prison / containment vessel — the Luminary must look **sealed within** the crystal, not standing in front of it. Crystal facets must overlap, refract, restrain, or embed the entity's body.
- If the Luminary looks like it is standing in front of a crystal, the panel has failed.
- No text baked into the image — no name, no label, no banner, no chart annotation, no glyph text.
- Same level of detail and polish as Ember / Forge / Verdant.

### Panel crystal generation rules (apply to every future panel generation pass)
- **Crystal must dominate the panel.** The containment vessel should fill and slightly overflow the inner picture area — extending close to or slightly past the ornate border on all sides. It must not read as a clearly defined ball or small sphere sitting inside the frame. Compare to lum_ember and lum_forge: the crystal bleeds out to the edges and is the dominant compositional mass.
- **No soccer-ball or hex-net patterns.** Avoid hexagonal or pentagonal facet layouts that read as a decorative mesh or cage laid over the crystal. These look like a covering, not a crystal.
- **Gold seam lines are crystal edges, not a separate overlay.** The visible gold lines must be the actual facet-edge junctions of the crystal geometry itself — the edges where two crystal planes meet. They are not a net, lattice overlay, or decorative filigree applied to the surface of a smooth sphere.
- **Favor irregular angular facet planes.** Crystal facets should be large, irregular triangular and trapezoidal planes — the geometry of a cut gemstone or natural crystal formation, not a geodesic dome or soccer ball.
- **Prompt language that works:** "large irregular triangular and trapezoidal crystal facet planes", "gold seam lines only at the angular junctions where two crystal planes meet", "the crystal fills the entire inner picture area and bleeds to the edges", "the entity is embedded deep within the crystal volume". Avoid: "crystal orb", "crystal ball", "sphere", "geodesic", "hexagonal facets".

### Overall thematic direction
Luminaries are cosmic survival intelligences and post-civilizational archetypes — not generic fantasy patrons, Splendor-style nobles, or TCG heroes. Use scientifically inspired myth and cosmic speculative mythology.

### Affinity existence framing
- **Flare** — energy consciousness, ignition minds, stellar or plasma entities.
- **Continuum** — temporal consciousness, recursive memory, causality-bound thought forms.
- **Verdance** — biological, ecological, distributed living consciousness.
- **Abyss** — entropy, silence, absence, information death, boundary-of-being intelligence.
- **Radiance** — coherence, stabilized artificial or crystalline order, machine-like pattern consciousness.

### Null Sovereign — updated direction
- Primarily Abyss + Continuum emotionally, with Radiance as stabilizing structure.
- Mostly black, headless, seated on a throne, roughly humanoid seated silhouette.
- Rulership through absence — a sovereign-shaped void, not a villain.
- **Body material (critical):** Deep void-black body with a highly polished, glossy, obsidian-like or lacquered-black surface — NOT matte black, NOT flat dark gray, NOT uniform shadow. The black body should catch sharp white/pearl specular highlights on the shoulders, clavicle, chest, upper arms, forearms, knees, and throne-facing contours. Think polished black armor, wet obsidian, black lacquer, or black oil reflecting studio light. The white specular streaks make the silhouette readable without turning the body gray or silver.
- **Radiance expression:** Expressed through white/pearl specular highlights on the glossy body surface, subtle crystalline coherence lines as restraints — not by making the body gray or metallic.
- **Continuum expression:** Subtle deep-blue recursive arc rings framing the figure or throne area — present but not overpowering the main glossy-black body read.
- **Do not make Null:** wizard, demon, skull king, generic shadow lord, purple smoke villain, sci-fi body-scan figure, cyberpunk diagram, matte black blob, flat dark silhouette with no surface detail.
- **Panel:** throne and body visibly sealed within a dark crystalline reliquary — entity embedded, suspended, refracted, or restrained within the containment, not sitting in front of a background crystal.
- **Entity:** roughly humanoid seated/throne-associated silhouette, headless, deep glossy-black obsidian-like body with white specular highlights, alive and intentional, complete silhouette (not cropped), transparent background.

### Stellar Guide — canonical direction (updated from CNS-organism to astral navigator)
- Full-body cosmic navigator / astral guide. Humanoid silhouette beneath deep indigo-navy robes.
- Robe fabric IS the star chart — living constellation maps, glowing star paths, and orbital arc lines embedded directly into the cloth.
- 2–4 armillary spheres / celestial orrery rings float around the figure (brass and starlight-blue, etched orbital paths).
- Face partially concealed by deep hood, two calm luminous cyan eyes visible.
- One arm extended in a guiding gesture — pointing toward an unseen horizon.
- Lower robe fans out and intentionally dissolves into star-dust trails / constellation lines — not a crop.
- Coloring: deep navy/indigo body, glowing ice-blue and cyan star-map markings, warm brass armillary rings, soft teal-green nebula accents.
- **Do not make Stellar Guide:** generic fantasy mage, CNS diagram, old traveler, compass-holding wizard, star-chart flat diagram, sci-fi astronaut.
- **Entity:** full-body, complete readable silhouette from crown to dissolved base, transparent background, no text or labels.

### General entity rules (all Luminaries)
- Isolated entity on transparent background.
- Complete readable silhouette — no torso cutoffs, no clipped edges.
- No rectangular illustration background, no card frame baked in.
- No text, labels, equations, UI marks, or readable annotation marks anywhere on the entity.
- Must feel alive and intentional — not a static emblem, mandala, or diagram.

### Asset review status (current — supersedes all earlier commit notes)
- **Panels accepted (do not overwrite):** lum_ember, lum_forge, lum_verdant, lum_void, lum_radiant, lum_null, lum_compass, lum_oracle, lum_bloom — 9 panels locked.
- **Panels still needing regeneration:** lum_tide (white exterior background = active in-game visual bug), lum_astral (wrong format entirely; concept direction also undefined), lum_pale (wrong format; concept direction undefined).
- **Entities needing regeneration:** lum_null (thematic miss — sci-fi cyberpunk armor, does not match accepted void-body panel spec).
- **Auras needing regeneration:** lum_void (opaque purple-grey background will show as colored rectangle in screen-blend), lum_pale (opaque grey background, same issue).
- **Open concept questions before next generation:** lum_tide (water-elemental direction vs Ophanim/rings?), lum_astral (concept fully undefined now that Stellar Guide belongs to lum_compass), lum_pale (no concept defined).
- All 12 are currently active in ILLUSTRATED_IDS for iteration. Restrict back to accepted set before publication.

## System Architecture

**Luminae** is a pnpm workspace monorepo utilizing TypeScript.

**Frontend:**
-   Developed with React and Vite, located at `/` (artifacts/luminae).
-   UI/UX features include AI-generated cosmic affinity art, per-card art, and lore. All art assets are compressed PNGs and loaded efficiently.
-   Animations are critical, including card market animations (purchase/reserve bursts, card flips), turn announcement overlays, affinity bonus sounds, and affinity harvesting animations. These are managed with a state update queue to ensure proper sequencing and prevent conflicts.
-   A `DevAnimSandbox` component allows triggering animations for testing, gated behind `import.meta.env.DEV` for production tree-shaking.

**Backend:**
-   An Express 5 API server (artifacts/api-server) runs at `/api`.
-   Real-time multiplayer functionality is provided via WebSocket at `/ws`, integrated with the same API server.
-   Game logic resides in `gameEngine.ts`, handling all core mechanics, card catalog, and state transitions.
-   AI players (`aiPlayer.ts`, `aiTurnRunner.ts`) with configurable difficulties (easy, medium, hard) are supported, utilizing a per-room async mutex (`roomLock.ts`) for concurrency control.
-   Session management stores player data in `localStorage` and validates it against the server, with auto-clearing for invalid sessions.

**Game Mechanics & Features:**
-   **Affinities:** 6 types (Radiance, Flare, Continuum, Verdance, Abyss, Singularity). Internal keys (`ruby/sapphire/emerald/onyx/pearl/flux`) are consistent across the stack.
-   **Card Market:** 3 tiers of Artifact cards (20/15/10 cards per deck, 4 face-up per tier).
-   **Eminence:** The victory currency, replacing "prestige" (internal key `lumens`).
-   **Luminaries:** 12 unique patron entities (expanded from 5), `playerCount+1` active per game, awarding tiered Eminence bonuses (2/3/4 lumens). Each Luminary has full metadata: id, name, domain, flavor text, summonColor, summonSecondaryColor, auraStyle. Pool divided into mono-color (2L), dual-color (3L), and triple-color (4L) tiers. Procedural SVG entity art in `luminaryAssets.tsx`. Backward compat: old lum01-lum05 IDs filtered out in `normalizeState`.
-   **Living Luminary Affinity:** When a Luminary is claimed, the engine assigns a default active affinity (first eligible) stored in `GameState.luminaryAffinities` (`LuminaryActiveState[]`). Starting the *next* turn after summoning, the owner gains +1 bonus toward that affinity on every card purchase. Owners can toggle the active affinity anytime (even off-turn) via the `toggle_luminary_affinity` action — clicking the claimed Luminary portal card cycles to the next eligible affinity. Single-eligible Luminaries always use that affinity; multi-eligible ones show selector dots + a `↻` badge. `turnCount` (monotonically incrementing per `advanceTurn`) gates activation. The engine helper `effectiveBonuses()` merges card bonuses + living luminary bonuses for `effectiveCost`/`payForCard`.
-   **Actions:** Harvest affinities, reserve cards (from market or deck), forge cards, toggle luminary affinity (non-turn action).
-   **Win Condition:** First to 15 Eminence; tie-break by fewest purchased cards.
-   **Turn Timer:** Optional per-room timer that automatically passes turns on expiry.
-   **Action Log:** Capped 20-entry array within `GameState.actionLog` for tracking player actions.
-   **Lobby State Sync:** Critical reconciliation of lobby player data from TanStack Query and WebSocket events, ensuring `isHost` status is accurately reflected.
-   **Error Handling:** React `ErrorBoundary` for UI crashes, API server `EADDRINUSE` retry logic, and `strictPort` for Vite.

## External Dependencies

-   **Database:** PostgreSQL with Drizzle ORM for schema definition and interaction.
-   **API Contract:** OpenAPI specification for defining API endpoints, with Orval for codegen into typed hooks and Zod schemas.
-   **Validation:** Zod for data schema validation.
-   **Real-time:** `ws` package for WebSocket implementation.
-   **Frontend Libraries:** React, Vite, Tailwind CSS, `framer-motion` for animations, `wouter` for routing.
-   **PWA/Offline Caching:** `vite-plugin-pwa` with Workbox for Service Worker generation, precaching assets (including all card art), and runtime caching for fonts.