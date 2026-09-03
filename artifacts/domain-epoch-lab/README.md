# Luminae Domain Epoch Lab

This feature-isolated workspace tests the proposed Domain Epoch grammar without importing or modifying the production engine, API, database, account state, AI, tutorial, or 90-Artifact catalog.

## Commands

```sh
pnpm --filter @workspace/domain-epoch-lab test
pnpm --filter @workspace/domain-epoch-lab typecheck
pnpm --filter @workspace/domain-epoch-lab simulate -- --seeds 100 --output artifacts/domain-epoch-lab/reports/core-100.json
pnpm --filter @workspace/domain-epoch-lab dev
```

Every ruleset includes its seed. The exported graybox state contains the full action log needed to reproduce and diagnose a run.

## Boundary

The lab contains 15-card and 30-card prototype catalogs using existing Artifact names. Their costs, tags, lineage benefits, abilities, and Eminence are experimental only. No production art or runtime types are imported. Blueprints, Luminaries, civilization powers, licensing, diffusion, accounts, and story persistence remain outside the first gates.

Automated reports screen completion, deadlocks, turn count, seat results, action mix, Well starvation, Domain outcomes, and two-slot use. They do not establish teachability, fun, wall-clock pacing, physical viability, market identity, or legal safety; those require the later gates in the approved program.

The current 30-card candidate passes completion, deadlock, action-mix, Well-circulation, forced-pass, and two-slot gates but fails seat parity. See `docs/LUMINAe_DOMAIN_EPOCH_PROTOTYPE_v0.1.md`. Do not begin external testing from this version.

## Experiential skin

The same isolated engine now has an art-driven playtest board suitable for evaluating basic feel. It references existing Luminae card and Affinity image files at build time, but an automated boundary test forbids imports from production game logic, APIs, accounts, or persistence. The production Luminae application remains unchanged.
