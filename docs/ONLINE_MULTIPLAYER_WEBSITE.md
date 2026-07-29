# Luminae Online Multiplayer Website

Luminae can run as a single public web service: the Express server hosts the API
at `/api`, the multiplayer WebSocket at `/ws`, and the latest built React app for
all browser routes.

## Build

```sh
pnpm run build:web
```

This builds the current Luminae frontend first, then bundles the API server.
Run it on each deployment so the public site reflects the current project state.

## Start

```sh
PORT=3000 NODE_ENV=production pnpm run start:web
```

The server reads `../../.env` when it exists for local production testing. On a
real host, set environment variables in the host dashboard instead.

Required environment:

- `PORT`: public web service port supplied by the host.
- `DATABASE_URL`: PostgreSQL connection string for rooms, accounts, and matches.

Optional environment:

- `LUMINAE_WEB_DIST`: override the frontend build directory. By default the API
  serves `artifacts/luminae/dist/public`.
- `LUMINAE_BUILD_LABEL`: label exposed in frontend/server build metadata.

## Routing

- `/api/*` stays API-only.
- `/ws` stays the real-time multiplayer socket.
- `/`, `/lobby/:roomId`, `/game/:roomId`, `/dashboard`, and other app routes
  return the React app shell so shared invite links and browser refreshes work.

Use a host that supports long-lived WebSocket connections.
