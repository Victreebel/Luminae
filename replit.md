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
- `players` — player records (id, room_id, name, session_token, is_host, order_index, is_connected)
- `game_states` — full game state as JSONB blob (room_id PK, state, version)

## Key Files

- `lib/api-spec/openapi.yaml` — API contract
- `lib/db/src/schema/` — Drizzle table definitions
- `artifacts/api-server/src/lib/gameEngine.ts` — Complete game logic + card catalog
- `artifacts/api-server/src/lib/websocket.ts` — WebSocket server and connection tracking
- `artifacts/api-server/src/routes/rooms.ts` — Room creation, join, start, kick
- `artifacts/api-server/src/routes/game.ts` — Game state + action submission
- `artifacts/luminae/src/` — React frontend

## Session Management

Players store their session in localStorage under `"luminae_session"`:
```json
{ "roomId": "...", "playerId": "...", "sessionToken": "...", "playerName": "..." }
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
