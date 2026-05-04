# Luminae — Multiplayer Tabletop Engine-Building Game

## Overview

**Luminae** is an original browser-based multiplayer tabletop engine-building game. It draws inspiration from gem-market tableau mechanics, focusing on collecting colored crystals, acquiring Artifact cards for permanent bonuses, and racing to 15 Eminence. Players also compete for Luminary patron bonuses. The project aims to deliver a polished, real-time multiplayer experience with unique artwork and game mechanics.

## User Preferences

The user prefers that all development and communication adhere to the established terminology for game mechanics (e.g., "affinities" instead of "gems," "Eminence" instead of "prestige"). The user also wants to ensure that all generated images are properly compressed and integrated, and that new art and lore for cards are correctly injected server-side. Additionally, the user wants to prioritize robust animation sequencing and error handling, particularly for state updates and game events. The user prefers that all development-only features, such as the animation sandbox, are fully tree-shaken from production builds.

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
-   **Luminaries:** 5 patron cards, `playerCount+1` active per game, awarding Eminence bonuses.
-   **Actions:** Harvest affinities, reserve cards (from market or deck), forge cards.
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