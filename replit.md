# Luminae — Multiplayer Tabletop Engine-Building Game

## Overview

**Luminae** is an original browser-based multiplayer tabletop engine-building game inspired by gem-market tableau mechanics (original names, artwork, and rules — not a copy of any commercial game). 2–4 players collect colored crystals, acquire Artifact cards that generate permanent bonus crystals, and race to 15 Prestige points while competing for Luminary patron bonuses.

pnpm workspace monorepo using TypeScript.

## Architecture

- **Frontend**: React + Vite (artifacts/luminae) — at path `/`
- **Backend**: Express 5 API server (artifacts/api-server) — at path `/api`
- **WebSocket**: Real-time multiplayer at `/ws` (same api-server, attached to HTTP server)
- **Database**: PostgreSQL + Drizzle ORM
- **API contract**: OpenAPI spec → Orval codegen → typed hooks + Zod schemas

## Game Mechanics

- **Crystals**: ruby, sapphire, emerald, onyx, pearl + flux (gold/wild)
- **Market**: 3 tiers of Artifact cards (20/15/10 cards shuffled into decks, 4 face-up per tier)
- **Luminaries**: 5 patron cards, playerCount+1 active per game, award 3 prestige for bonus requirements
- **Actions**: take 3 different crystals, take 2 same (≥4 in bank), reserve card (get flux), purchase card/reserved
- **Win condition**: 15 prestige; last round completes so all players finish equally; tie-break is fewest purchased cards

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
