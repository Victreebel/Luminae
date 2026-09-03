# LUMINAe Blueprint Balance Gate v1.0

> **Superseded:** Technology System v2 uses a match-wide 10-20% manifestation
> target. A v2 report is generated from the revised simulation before any
> competitive approval.

## Historical Verdict

**Competitive Blueprints remain disabled.**

Campaign and Custom may proceed. The competitive flag must stay off until the
completion-rate problem is solved and 50 human playtest matches are complete.

## Reproducible Simulation

```text
pnpm --filter @workspace/api-server run simulate:blueprints -- \
  --games 1000 --seed 7142031
```

The run uses four Hard AI civilizations. Each seat receives two private
Blueprints, with all three two-of-three combinations distributed evenly. Hard
AI values missing exact components and slot-one priorities. Presentation events
are acknowledged immediately so only gameplay time is measured.

## Results

| Metric | Result | Gate |
|---|---:|---|
| Completed games | 1,000 / 1,000 | Pass |
| Stalled games | 0 | Pass |
| Average turns | 96.82 | Observe |
| Antimatter manifestation | 0.75% | Fail |
| Foundry manifestation | 3.60% | Fail |
| Worldshield manifestation | 2.25% | Fail |
| Antimatter detonation after manifestation | 55.00% | Pass |
| Largest Blueprint win-rate delta | 0.81 points | Pass |
| Automated owner/opponent secrecy checks | No leak found | Pass |
| Human playtests | 0 / 50 recorded | Fail |

Target manifestation window is 8% to 45% for every assigned Blueprint.
Antimatter detonation after manifestation must remain between 25% and 75%.
No Blueprint may exceed a two-percentage-point win-rate delta from the pool
average.

## Additional Finding

The final-round boundary now follows the randomized opening player rather than
array seat 0. With the same seed, post-fix seat win rates are 22.8%, 26.4%,
25.9%, and 24.9%. The former 18.6%-31.9% spread was a round-boundary defect, not
evidence of Blueprint power.

The artifact-only control is documented in
`LUMINAe_ARTIFACT_BALANCE_BASELINE_v1.0.md`.

## Release Decision

Do not loosen exact recipes inside Campaign or Custom merely to force a passed
competitive metric. A later competitive rules pass should test curated Forge
availability, seasonal recipe variants, or another symmetric acceleration that
does not reveal private identity or depend on account ownership.
