# Luminae To-Do

## Shelved / High Effort

- Revisit a true board-camera Luminary summoning cinematic.
  - Goal: make the camera appear to zoom into the Luminary card's real board location, then restore to the full board with the Luminary already settled in its panel.
  - Needs: a real board camera/compositor layer, stable board target registration, scroll/layout locking, and disciplined render layers.
  - Avoid: cloned DOM board snapshots or fake zoom-back handoffs; they were too slow and visually revealed the illusion.

- Revisit opening turn-order reveal at game start.
  - Goal: at the absolute beginning of a new game, play a short randomized first-player selection animation with sound before normal turn flow begins.
  - Current state: server records explicit `openingTurnOrder`, and the client has a reveal path, but it has not appeared reliably in native or web builds.
  - Needs: instrument the native/web start-game path end to end, confirm the client receives the opening event before initial turn handling, and decide whether this should be a blocking pre-game phase instead of a client-side overlay.
  - Avoid: more timing-only patches around `turnCount`, `version`, or local storage without runtime evidence.
