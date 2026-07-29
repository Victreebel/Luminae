# Luminae Development Map

Fast orientation for future Codex work. Prefer this map before broad repo searches.

## Run And Verify

- App package: `artifacts/luminae`
- Common dev server: `PORT=5191 pnpm --filter @workspace/luminae run dev`
- Build check: `pnpm --filter @workspace/luminae run build`
- Animation sandbox: `/dev/anim-sandbox`
- Main game route: `/game/:roomId`

## High-Risk Guardrails

- Do not change the Luminary summon cutscene timing unless the task explicitly asks for summon timing.
- Treat summon cutscene, summoned Terminus card, and activation effect as separate systems.
- When debugging stale UI, check the visible sandbox build stamp before assuming code failed.
- Favor production components in dev previews; avoid mock-only animation paths unless clearly labeled.

## Core UI Map

- Game shell and orchestration: `artifacts/luminae/src/pages/game.tsx`
- Board layout rules: `artifacts/luminae/src/pages/game-layout.ts`
- Board tab composition: `artifacts/luminae/src/pages/game-board-tab.tsx`
- Terminus board module: `artifacts/luminae/src/pages/game-board-terminus.tsx`
- Forge board module: `artifacts/luminae/src/pages/game-board-forge.tsx`
- Forge card slots: `artifacts/luminae/src/pages/game-board-forge-card-slot.tsx`
- Affinity Well panel: `artifacts/luminae/src/pages/game-affinity-well-panel.tsx`
- Card rendering and Eminence visuals: `artifacts/luminae/src/pages/game-card.tsx`
- Luminary cards and summoned-card state: `artifacts/luminae/src/pages/game-luminary.tsx`
- Civilization preview: `artifacts/luminae/src/pages/game-civilization-preview.tsx`

## Animation Map

- Summon/arrival cutscene assets and canvas: `artifacts/luminae/src/lib/luminaryAssets.tsx`
- Luminary activation cinematic: `artifacts/luminae/src/components/LuminaryActivationCinematic.tsx`
- Luminary effect routing: `artifacts/luminae/src/components/ActivationDirectorRouter.tsx`
- Luminary effect procedures: `artifacts/luminae/src/lib/luminaryAnimationProcedures.ts`
- Luminary effect config/copy: `artifacts/luminae/src/lib/luminaryAnimationConfig.ts`
- Cinder Mandate special effects: `artifacts/luminae/src/components/CinderMandateBurnDirector.tsx` and `artifacts/luminae/src/components/CinderMandateBrandingDirector.tsx`
- Forge/encrypt animations: `artifacts/luminae/src/pages/game-forge-animation.tsx`
- Victory cinematic: `artifacts/luminae/src/components/VictoryCinematic.tsx`

## Game Rules And Planning

- Shared API types and server-facing contracts: `packages/api-client-react`
- Client planning helpers: `artifacts/luminae/src/pages/game-planning.ts`
- Tutorial state machine: `artifacts/luminae/src/lib/tutorialReducer.ts`
- Tutorial UI: `artifacts/luminae/src/pages/tutorial.tsx`
- Audio sequencing: `artifacts/luminae/src/lib/audio.ts`

## Stable Browser Test Anchors

- `data-testid="game-board"`: main game board scroll surface.
- `data-testid="terminus-module"`: full Terminus module.
- `data-testid="terminus-luminary-row"`: horizontal Terminus Luminary row.
- `data-testid="terminus-luminary-slot"`: each Terminus slot, also carries `data-luminary-id`.
- `data-testid="terminus-luminary-card"`: unclaimed Luminary card.
- `data-testid="summoned-luminary-card"`: claimed/summoned Luminary card.
- `data-testid="forge-module"`: full Forge module.
- `data-testid="forge-cost-controls"`: Forge cost view controls.
- `data-testid="forge-tier-list"`: Forge tier stack.
- `data-testid="forge-tier-shelf"`: each Forge tier, also carries `data-tier`.
- `data-testid="forge-card-slot"`: face-up Forge card slot.
- `data-testid="forge-card-slot-empty"`: empty/hidden Forge card slot.
- `data-testid="affinity-well-panel"`: full Affinity Well panel.
- `data-testid="affinity-channel"`: individual Affinity/Singularity channel; carries `data-affinity`.
- `data-testid="harness-button"`: active Harness/Plan interaction button.
- `data-testid="luminary-activation-cinematic"`: activation cinematic overlay.
- `data-testid="luminary-activation-entity"`: activation cinematic entity layer.
- `data-testid="victory-cinematic"`: endgame cinematic overlay.
- `data-testid="victory-cinematic-card"`: endgame results dialog.
