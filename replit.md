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

**The core mental model — crystal wall, not crystal ball:**
The Luminary is trapped *behind or within a massive crystal wall / faceted crystal volume*. The crystal should be so zoomed in that the viewer cannot tell the overall shape of the crystal. The viewer should feel like they are looking through and into a wall of crystal facets, not looking at a crystal object sitting inside a frame. The crystal covers most or all of the picture area and extends beyond the panel borders.

**Hard rules:**
- **Crystal must fill the panel.** The crystal volume fills and overflows the entire inner picture area — extending past the ornate border on all sides. The overall shape of the crystal must not be readable. If you can see the silhouette of a ball, orb, or defined shape, it has failed.
- **Banned prompt terms:** crystal ball, crystal orb, sphere, geodesic dome, soccer-ball facets, hex-net, cage, mesh, lattice overlay, covering. These all produce the wrong result.
- **Required prompt framing:** "massive faceted crystal wall", "zoomed-in crystal containment", "large irregular crystal planes filling the entire image", "refraction seams", "natural facet edges", "colored internal fracture lines", "overlapping shard planes", "the entity is trapped behind a wall of crystal facets", "the crystal extends past the panel borders on all sides".
- **No separate net or overlay.** The visible lines on the crystal are the physical edges and refraction seams of the facet planes themselves — the places where two crystal planes meet and light changes direction. They are not a decorative mesh, not a gold overlay, not a cage placed over a smooth surface.
- **Edge color follows the crystal's palette.** Facet edges and refraction seams should be whatever color and brightness naturally fits the Luminary's affinity palette: prismatic highlight lines, colored light seams, dark/bright plane transitions, internal fracture glow. They are not required to be gold. Gold seams are appropriate for some Luminaries (warm affinities) but wrong for others.
- **Facet planes must be large and irregular.** Big triangular and trapezoidal planes — like a cut gemstone face or natural mineral cleavage plane, not a uniform net of small cells.

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

### Entity form diversity (critical — do not default to humanoid)
Many Luminaries should be nonhumanoid. A humanoid central figure is only correct when the specific Luminary concept explicitly calls for one. When uncertain, ask rather than defaulting to humanoid.

Each Luminary represents a distinct form of cosmic living/intelligent existence. The form of the entity should reflect that:
- **Ecological / Verdance entities** (e.g. Bloom Tyrant): plant organisms, root networks, mycelial masses, invasive growth structures — no human silhouette.
- **Energetic / Flare entities**: stellar plasma forms, ignition clouds, radiant light-bodies — not necessarily humanoid.
- **Temporal / Continuum entities**: recursive geometric structures, branching causality trees, layered temporal echoes — abstract or semi-abstract.
- **Entropic / Abyss entities**: absence-forms, void geometries, silence-structures — minimalist, not monstrous.
- **Order / Radiance entities**: machine-like crystalline lattices, coherent geometric intelligences, pattern-forms.
- **World-scale intelligences**: organisms that operate at planetary or cosmic scale — their body may be a weather system, a root network, a stellar structure.

If a generation pass produces a humanoid figure for a Luminary that should be nonhumanoid, that is a failure to capture the concept. Ask for clarification if the intended form is not clear before generating.

### Asset review status (current — supersedes all earlier commit notes)
- **Panels accepted (do not overwrite):** lum_ember, lum_forge, lum_verdant, lum_void, lum_radiant, lum_null, lum_compass, lum_oracle, lum_bloom, lum_tide, lum_pale — 11 panels locked.
- **lum_pale notes (fully illustrated, animated entity):** All three slots accepted. Panel regenerated (May 2026): large irregular pearl/silver crystal facets filling the interior, improved border with sunburst-set pearl corner gems, multi-tiered gold diamond crest, richer filigree on all edges, scales medallion at bottom-center. Entity regenerated (May 2026) using seraph-of-judgment reference: multi-winged feathered seraph construct, sun-halo crown, ornate armored spine, horizontal balance beam, brass-chain scale pans, crystal diamond pendants at wingtips, spike at base — luminous ice-white/silver/pearl palette, transparent background. `PaleEntity` animated component in `luminaryAssets.tsx` renders the PNG with a continuous ±3.5° seesaw rotation (5.2 s period, pivot at 50% 62% = beam center) via framer-motion. Aura: soft radial silver/pearl starburst glow, alpha=0 at corners.
- **Panels needing regeneration:**
  - lum_astral — REJECTED: crystal reads as a sphere/orb (banned form); facet pattern is geodesic/soccer-ball cells over a sphere (banned pattern); dark corners visible — crystal does not fill the panel. Concept: stellar fire meets cold void weaving intelligence (Flare+Abyss). Next pass must use "massive faceted crystal wall filling entire image, crystal extends past borders on all sides, large irregular triangular/trapezoidal facet planes, fire-ice gradient internal fractures, entity embedded/refracted within crystal volume."
- **Entities needing regeneration:** lum_null (thematic miss — sci-fi cyberpunk armor, does not match accepted void-body panel spec).
- **Auras regenerated (transparent background):** lum_void (soft radial purple void glow, alpha=0 at corners), lum_pale (soft silver/pearl starburst glow, alpha=0 at corners) — both pass screen-blend check, no opaque rectangle visible.
- **Open concept questions:** None — lum_astral (stellar fire meets cold void weaving entity) has a defined direction; next generation pass should apply crystal-wall rules strictly.
- **ILLUSTRATED_IDS** in `luminaryAssets.tsx` contains all 12 IDs. lum_pale uses fully illustrated panel + entity + aura (animated SVG retired). lum_astral falls back to procedural SVG art for all slots until its panel is regenerated and accepted.

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

## Developer Workflow

### Gem Token Normalization
All six affinity gem token PNGs are automatically normalized to a consistent 512×512 canvas whenever `pnpm run typecheck` is run. The normalization step (`pnpm run normalize:gems`) runs first, before any TypeScript checks, via `scripts/src/normalize-gem-tokens.py`. If you add or regenerate gem art in `attached_assets/`, simply run `pnpm run typecheck` (or the dedicated `pnpm run normalize:gems`) and the files will be cropped, scaled to 78% fill, and centered in-place.

## External Dependencies

-   **Database:** PostgreSQL with Drizzle ORM for schema definition and interaction.
-   **API Contract:** OpenAPI specification for defining API endpoints, with Orval for codegen into typed hooks and Zod schemas.
-   **Validation:** Zod for data schema validation.
-   **Real-time:** `ws` package for WebSocket implementation.
-   **Frontend Libraries:** React, Vite, Tailwind CSS, `framer-motion` for animations, `wouter` for routing.
-   **PWA/Offline Caching:** `vite-plugin-pwa` with Workbox for Service Worker generation, precaching assets (including all card art), and runtime caching for fonts.