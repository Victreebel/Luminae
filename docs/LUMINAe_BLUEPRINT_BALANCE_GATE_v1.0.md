# LUMINAe Blueprint Balance Gate v1.0

## Current Verdict

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
| Average turns | 96.37 | Observe |
| Antimatter manifestation | 0.45% | Fail |
| Foundry manifestation | 3.79% | Fail |
| Worldshield manifestation | 2.21% | Fail |
| Antimatter detonation after manifestation | 66.67% | Pass |
| Largest Blueprint win-rate delta | 0.32 points | Pass |
| Automated owner/opponent secrecy checks | No leak found | Pass |
| Human playtests | 0 / 50 recorded | Fail |

Target manifestation window is 8% to 45% for every assigned Blueprint.
Antimatter detonation after manifestation must remain between 25% and 75%.
No Blueprint may exceed a two-percentage-point win-rate delta from the pool
average.

## Additional Finding

Seat win rates were 18.6%, 22.9%, 26.6%, and 31.9%. Because the two-of-three
loadouts rotate evenly and Blueprint win-rate deltas stay small, this looks like
a broader seat-order concern rather than Blueprint power. It should be measured
against a no-Blueprint control run before competitive launch.

## Release Decision

Do not loosen exact recipes inside Campaign or Custom merely to force a passed
competitive metric. A later competitive rules pass should test curated Forge
availability, seasonal recipe variants, or another symmetric acceleration that
does not reveal private identity or depend on account ownership.
