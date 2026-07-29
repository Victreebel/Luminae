# Luminae — Multiplayer Tabletop Engine-Building Game

## Overview

**Luminae** is an original browser-based multiplayer tabletop engine-building game. Players harness cosmic Affinities, Forge Artifacts for permanent Affinity bonuses and Eminence, reserve future Artifacts, and draw the attention of Luminaries. The project aims to deliver a polished, real-time multiplayer experience with unique artwork and game mechanics.

## User Preferences

The user prefers all development and communication to use established Luminae terminology, including Affinities, the Affinity Well, Harness, the Forge, Artifacts, Eminence, Luminaries, and Singularity. The user also wants generated images compressed and integrated, new Artifact art and lore injected server-side, and animation sequencing and state-event error handling kept robust. Development-only features such as the animation sandbox must be fully tree-shaken from production builds.

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
Luminaries are cosmic survival intelligences and post-civilizational archetypes, not generic fantasy patrons, aristocratic tableau figures, or TCG heroes. Use scientifically inspired myth and cosmic speculative mythology.

### Affinity existence framing
- **Flare** — energy consciousness, ignition minds, stellar or plasma entities.
- **Continuum** — temporal consciousness, recursive memory, causality-bound thought forms.
- **Verdance** — biological, ecological, distributed living consciousness.
- **Abyss** — entropy, silence, absence, information death, boundary-of-being intelligence.
- **Radiance** — coherence, stabilized artificial or crystalline order, machine-like pattern consciousness.

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

### Asset status — all locked
All 12 Luminary panels and entities are accepted and locked. Do not regenerate any asset without explicit user approval.
- **Panels locked (12):** lum_ember, lum_forge, lum_verdant, lum_void, lum_radiant, lum_null, lum_compass, lum_oracle, lum_bloom, lum_tide, lum_pale, lum_astral
- **Entities locked (12):** all use illustrated PNG assets; no Luminary falls back to procedural SVG. SVG fallbacks are retained in code but not displayed.
- **Auras:** lum_void (purple radial) and lum_pale (silver/pearl starburst) — both use transparent backgrounds, screen-blend safe.
- **`ILLUSTRATED_IDS`** in `luminaryAssets.tsx` contains all 12 IDs.

## System Architecture

**Luminae** is a pnpm workspace monorepo utilizing TypeScript.

**Frontend:**
-   Developed with React and Vite, located at `/` (artifacts/luminae).
-   UI/UX features include AI-generated cosmic affinity art, per-card art, and lore. All art assets are compressed PNGs and loaded efficiently.
-   Animations are critical, including Forge animations (forge/reserve bursts and card flips), turn announcement overlays, Affinity bonus sounds, and Affinity Harness animations. These are managed with a state update queue to ensure proper sequencing and prevent conflicts.
-   A `DevAnimSandbox` component allows triggering animations for testing, gated behind `import.meta.env.DEV` for production tree-shaking.

**Backend:**
-   An Express 5 API server (artifacts/api-server) runs at `/api`.
-   Real-time multiplayer functionality is provided via WebSocket at `/ws`, integrated with the same API server.
-   Game logic resides in `gameEngine.ts`, handling all core mechanics, card catalog, and state transitions.
-   AI players (`aiPlayer.ts`, `aiTurnRunner.ts`) with configurable difficulties (easy, medium, hard) are supported, utilizing a per-room async mutex (`roomLock.ts`) for concurrency control.
-   Session management stores player data in `localStorage` and validates it against the server, with auto-clearing for invalid sessions.

**Game Mechanics & Features:**
-   **Affinities:** 6 types with matching canonical serialized keys: `radiance`, `flare`, `continuum`, `verdance`, `abyss`, and `singularity`.
-   **Forge:** 3 tiers of Artifact cards (20/15/10 cards per deck, 4 face-up per tier).
-   **Eminence:** The victory measure, serialized as `eminence`.
-   **Luminaries:** 12 unique cosmic entities (expanded from 5), `playerCount+1` active per game, awarding tiered Eminence bonuses. Each Luminary has full metadata: id, name, domain, flavor text, summonColor, summonSecondaryColor, and auraStyle. Backward compatibility: old `lum01`-`lum05` IDs are filtered out in `normalizeState`.
-   **Living Luminary Affinity:** When a Luminary is claimed, the engine assigns a default active Affinity stored in `GameState.luminaryAffinities`. Starting the next turn after summoning, the owner gains +1 toward that Affinity when calculating Artifact Forge costs. Owners can toggle it at any time via `toggle_luminary_affinity`. The engine helper `effectiveAffinityBonuses()` merges Artifact bonuses with Living Luminary Affinities.
-   **Core Actions:** Harness 3 different Affinities, Harness 2 of the same Affinity, Forge an Artifact, or reserve an Artifact from the Forge or a deck.
-   **Win Condition:** Reaching the Eminence target starts the final round. The game also ends immediately after a turn if the Forge and all Archives are empty. Highest Eminence wins; ties resolve by fewest encrypted Artifacts, then most Tier III forged Artifacts, followed by Tier II and Tier I, then the same tier comparison within the strongest single affinity.
-   **Turn Timer:** Optional per-room timer that automatically passes turns on expiry.
-   **Action Log:** Capped 20-entry array within `GameState.actionLog` for tracking player actions.
-   **Lobby State Sync:** Critical reconciliation of lobby player data from TanStack Query and WebSocket events, ensuring `isHost` status is accurately reflected.
-   **Error Handling:** React `ErrorBoundary` for UI crashes, API server `EADDRINUSE` retry logic, and `strictPort` for Vite.

## Developer Workflow

### Burn Animation Rules — Do Not Regress

**Visual principle:** The card burns progressively from bottom to top — crisp and readable throughout.

**Forbidden effects — never add these to BurnFlash or any burn-adjacent layer:**
- `filter: blur(...)` / `backdropFilter: blur(...)` / `WebkitFilter: blur(...)`
- Motion blur, Gaussian blur, smeared card images, blurry dissolves, hazy fades that mask the card
- Overbright washes or smoke layers that hide the card identity
- Simple fade-out, shrink-in, or instant replacement

**The unburned upper portion of the card must remain fully readable until the flame line reaches it.**

**Required phase sequence (BurnFlash canonical spec):**
1. Target claim — crisp ember outline ring snaps onto the card border.
2. Bottom ignition — sharp ember glow ignites at the bottom edge of the slot.
3. Upward burn — ash overlay (`scaleY: 0→1`, `transformOrigin: bottom center`) covers the card from bottom to top. A sharp flame edge line travels upward in sync. Cinder sparks spawn at the flame front and rise away. No blur on any layer.
4. Top-edge spark burst — crisp sparks radiate from the top of the card as the last portion burns away.
5. Ash arc fragments scatter from the consumed card.
6. Burn Pile count increments (🔥 chip) — handled by state update.
7. Scorch residue fades — brief dark char overlay on the empty slot; the Forge refill begins only after the Burn animation completes.

**Multi-card burns:** Stagger individual BurnFlash calls 80–120 ms apart in the procedure — do not play full animations one-by-one.

### Button Scale-Transform Convention — Do Not Regress
Never apply a scale-up hover effect (`scale: 1.x`, `hover:scale-[1.x]`, or `whileHover={{ scale: 1.x }}`) to a button or interactive element whose **ancestor** has `overflow-hidden`. The parent clips the scaled element's painted overflow, causing the button to appear to shrink or get cut off at its edges on hover.

Safe alternatives for hover feedback inside constrained panels:
- `brightness-110` / `brightness-125` (Tailwind filter, no overflow)
- `box-shadow` or `drop-shadow` changes (framer-motion `boxShadow`)
- `y: -2` / subtle translate (safe because translate does not expand the painted area beyond the element's box in most browsers)
- Scale-down (`scale: 0.97`) on `whileTap` is fine — shrinking never clips

Scale-up transforms are acceptable **only** when the element being scaled is itself the `overflow-hidden` root and no ancestor clips it. (Example: a top-level card that scales up on hover and is its own clipping boundary is fine.)

The ESLint config enforces a warning for `hover:scale-[1.` Tailwind classes as an additional guardrail.

### Keyboard Focus Trap — Lint Enforcement
Every JSX element with `role="dialog"` must be rendered by a component that calls `useFocusTrap()` (from `artifacts/luminae/src/hooks/use-focus-trap.ts`). Without the hook, keyboard focus leaks into the background while the dialog is open.

The ESLint rule **`luminae/dialog-needs-focus-trap`** (defined in `artifacts/luminae/eslint.config.js`) enforces this at lint time:
- It is set to `'error'` so `pnpm run lint` and `pnpm run typecheck` will fail if the rule is violated.
- Inline JSX callbacks (`ref={(el) => {...}}`) and IIFEs used inside JSX expressions are correctly treated as transparent — the rule checks the enclosing component function.
- If a dialog manages its own focus externally (e.g. a Radix UI primitive), suppress the rule with `// eslint-disable-next-line luminae/dialog-needs-focus-trap` and a brief explanation.

Standard pattern:
```tsx
const containerRef = useRef<HTMLElement | null>(null);
useFocusTrap(containerRef, isOpen, onClose);
// ...
<div ref={(el) => { containerRef.current = el; }} role="dialog" aria-modal="true">
```

### Affinity Token Normalization
All Affinity token PNGs are automatically normalized to a consistent 512x512 canvas whenever `pnpm run typecheck` is run. The normalization step (`pnpm run normalize:affinities`) runs first, before any TypeScript checks, via `scripts/src/normalize-affinity-tokens.py`. When Affinity art in `attached_assets/` changes, the files are cropped, scaled to 78% fill, and centered in place.

### Protected Affinity Token Assets — DO NOT REGENERATE
The following six files are locked and must not be replaced, overwritten, or regenerated in any asset-generation pass. They were restored from commit `4758e88` after multiple inadvertent replacements destroyed their content (singularity dropped to 3% pixel coverage / 33 KB at worst). The normalization script will refuse to process any of these files if their visible pixel coverage drops below 28%, printing a PROTECTED warning instead of locking in degraded art.

| File | Key | Source commit | Locked size |
|---|---|---|---|
| `attached_assets/luminae_radiance_emblem_v2.png` | Radiance | `b846aea` (1254×1254 original) | ~327 KB |
| `attached_assets/luminae_singularity_emblem_v1.png` | Singularity | `e10f40b` (512×512 original) | ~437 KB |
| `attached_assets/generated_images/affinity_flare.png` | Flare | `41b9cf2` (1024×1024 original) | ~252 KB |
| `attached_assets/generated_images/affinity_continuum.png` | Continuum | `41b9cf2` (1024×1024 original) | ~259 KB |
| `attached_assets/generated_images/affinity_verdance.png` | Verdance | `41b9cf2` (1024×1024 original) | ~289 KB |
| `attached_assets/generated_images/affinity_abyss.png` | Abyss | `41b9cf2` (1024×1024 original) | ~268 KB |

If you need to replace a token with new art, do so deliberately and verify the new file has ≥30% visible pixel coverage before committing.

## External Dependencies

-   **Database:** PostgreSQL with Drizzle ORM for schema definition and interaction.
-   **API Contract:** OpenAPI specification for defining API endpoints, with Orval for codegen into typed hooks and Zod schemas.
-   **Validation:** Zod for data schema validation.
-   **Real-time:** `ws` package for WebSocket implementation.
-   **Frontend Libraries:** React, Vite, Tailwind CSS, `framer-motion` for animations, `wouter` for routing.
-   **PWA/Offline Caching:** `vite-plugin-pwa` with Workbox for Service Worker generation, precaching assets (including all card art), and runtime caching for fonts.
