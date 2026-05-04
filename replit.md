# Luminae — Multiplayer Tabletop Engine-Building Game

## Overview

**Luminae** is an original browser-based multiplayer tabletop engine-building game inspired by gem-market tableau mechanics (original names, artwork, and rules — not a copy of any commercial game). 2–4 players collect colored crystals, acquire Artifact cards that generate permanent bonus crystals, and race to **15 Lumens** while competing for Luminary patron bonuses.

pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend**: React + Vite (artifacts/luminae) — at path `/`
- **Backend**: Express 5 API server (artifacts/api-server) — at path `/api`
- **WebSocket**: Real-time multiplayer at `/ws` (same api-server, attached to HTTP server)
- **Database**: PostgreSQL + Drizzle ORM
- **API contract**: OpenAPI spec → Orval codegen → typed hooks + Zod schemas

## Game Mechanics

- **Crystals (cosmic resources)**: 6 affinities — Radiance, Flare, Continuum, Verdance, Abyss + Singularity (wild). Internal data keys (`ruby/sapphire/emerald/onyx/pearl/flux`) are intentionally retained throughout the API, DB, engine, and AI for backward compatibility. The display layer maps keys → cosmic names via `artifacts/luminae/src/lib/gemMeta.ts`.
- **Cosmic Affinity art** (May 2026): All gem tokens, tier card backdrops (3), Luminary portraits (5), home/lobby background, and Luminae logo are AI-generated and stored in `attached_assets/generated_images/`, imported via the Vite `@assets` alias. PNGs compressed via `sharp` (palette + max compression) — total payload ~5 MB.
- **Per-card art + lore** (May 2026): All 45 Artifact cards have unique 384×384 PNG art in `attached_assets/generated_images/cards/<id>.png` plus a shared `card_back.png`. Lore (`name` + `flavor`) lives in `artifacts/api-server/src/lib/cardLore.ts` and is injected into market/reserved cards by `formatGameState` (server is source of truth — never duplicate the catalog client-side). Client loads art with `import.meta.glob` on the `@assets/generated_images/cards/*.png` pattern.
- **Action log** (May 2026): `GameState.actionLog` is a capped (20-entry) array of `{ playerId, playerName, summary, turn }` written by `pushLog()` inside `applyAction`. `describeAction` covers all action types, including blind deck reserve and pass.
- **Turn timer** (May 2026): Optional per-room turn limit (`rooms.turn_timer_seconds`, nullable). Set at create time via the `turnTimerSeconds` field on `CreateRoomBody`. `artifacts/api-server/src/lib/turnTimer.ts` arms a per-room `setTimeout` keyed by `state.version`; on expiry it submits `pass` (which counts as a no-op turn). Re-armed after every action and after each AI turn. `state.turnDeadline` (epoch ms) drives the client countdown.
- **Reserve from deck**: `applyAction("reserve_card")` accepts either `cardId` (face-up market reserve) or `tier` alone (blind deck reserve). The client deck-pile button submits `{ type: "reserve_card", tier }`. Awards 1 flux if available.

## Lobby state sync (important)

The lobby reconciles its local `players` array from two sources: TanStack Query's `roomInfo` (authoritative) and WebSocket events (live deltas). Critical rule: the `roomInfo` populate effect must re-merge on **every** `roomInfo` change, not just when `players.length === 0`. Earlier code gated on `length === 0`, which was a bug: the server's `player_connected` WS event arrives before the initial query resolves and only carries `{ playerId, playerName, isConnected }` — no `isHost`. The WS handler would insert a host stub with `isHost: false` (default fallback), and the populate effect would then skip the API truth, leaving the host trapped in non-host UI (no "Start Game", no "Add AI"). Fix lives at `artifacts/luminae/src/pages/lobby.tsx` in the roomInfo merge effect — do not re-introduce a length guard.
- **Market**: 3 tiers of Artifact cards (20/15/10 cards shuffled into decks, 4 face-up per tier)
- **Luminaries**: 5 patron cards, playerCount+1 active per game, award 3 lumens for bonus requirements
- **Actions**: take 3 different crystals, take 2 same (≥4 in bank), reserve card (get flux), purchase card/reserved
- **Win condition**: 15 lumens; last round completes so all players finish equally; tie-break is fewest purchased cards

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Real-time**: WebSocket (ws package) on `/ws`
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (zod/v4), drizzle-zod
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind + framer-motion + wouter

## Database Schema

- `rooms` — room metadata (id, invite_code, host_player_id, status, max_players)
- `players` — player records (id, room_id, name, session_token, is_host, order_index, is_connected, is_ai, ai_difficulty)
- `game_states` — full game state as JSONB blob (room_id PK, state, version)

## Key Files

- `lib/api-spec/openapi.yaml` — API contract
- `lib/db/src/schema/` — Drizzle table definitions
- `artifacts/api-server/src/lib/gameEngine.ts` — Complete game logic + card catalog
- `artifacts/api-server/src/lib/aiPlayer.ts` — AI brain (easy/medium/hard difficulty)
- `artifacts/api-server/src/lib/aiTurnRunner.ts` — Background loop that auto-plays AI turns
- `artifacts/api-server/src/lib/roomLock.ts` — Per-room async mutex + AI runner inflight guard
- `artifacts/api-server/src/lib/websocket.ts` — WebSocket server and connection tracking
- `artifacts/api-server/src/routes/rooms.ts` — Room creation, join, start, kick, add AI player
- `artifacts/api-server/src/routes/game.ts` — Game state + action submission (lock-protected)
- `artifacts/luminae/src/` — React frontend

## Session Management

Players store their session in localStorage under `"luminae_session"`:
```json
{ "roomId": "...", "inviteCode": "...", "playerId": "...", "sessionToken": "...", "playerName": "...", "isHost": true }
```
On home page load, the saved session is validated against the server. If the game is finished or the room no longer exists, the session is auto-cleared so users see a clean home screen. The Resume button navigates to `/game/` when the game is in progress, `/lobby/` when it's still in the lobby.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Invite Code Flow

1. Host: POST /api/rooms → gets back roomId + inviteCode + sessionToken
2. Share invite link: `https://<domain>/lobby/<inviteCode>`
3. Guest: GET /api/rooms/:inviteCode → POST /api/rooms/:roomId/join → gets sessionToken
4. Host: POST /api/rooms/:roomId/start (when ≥2 players)
5. All players connect to WebSocket: `/ws?roomId=X&sessionToken=Y`
6. Actions: POST /api/rooms/:roomId/actions with sessionToken
7. Server broadcasts state_update to all WS connections after each action

## AI Players

- Host can add AI opponents in the lobby via POST `/api/rooms/:roomId/ai-players` with `{ sessionToken, difficulty: "easy"|"medium"|"hard" }`
- AI players have `is_ai=true` and a deterministic-ish brain in `aiPlayer.ts`:
  - **easy** — random valid action (mostly take crystals)
  - **medium** — greedy: purchase best affordable card, otherwise take crystals weighted by what we need
  - **hard** — greedy + targets bonuses required for active Luminaries, prefers higher tiers
- After game start and after every human action, `runAiTurnsIfNeeded(roomId)` fires in the background. It loops while the current player is an AI, with a ~1.5s delay between turns so humans can see what's happening.
- **Concurrency**: `roomLock.ts` provides a per-room async mutex that wraps both human action handlers and the AI loop. An inflight flag ensures only one AI runner exists per room at a time. The DB write also uses optimistic concurrency on `game_states.version` as a safety net.
