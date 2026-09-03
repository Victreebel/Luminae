# LUMINAe Blueprint Balance Gate v2.0 — Historical

## Superseded Status

This document records the earlier four-Blueprint, four-player Quick-format
gate. It is **not current certification evidence**. The authoritative comparison
is now `balance-blueprints-v2-candidates-1000.json`, summarized in
`LUMINAe_PRODUCTION_BALANCE_AUDIT_v2.0.md`; it covers four Blueprints, one- and
two-slot configurations, all 2/3/4-player counts, and Quick/Standard/Epic.

The old assignment-rate delta below is not the current manifestor-power metric.
Current evidence compares actual manifestors with same-cell nonmanifestors and
retains per-Blueprint diagnostics. Competitive Blueprints remain disabled.

## Historical Verdict

**Competitive Blueprints remain disabled.** Campaign and Custom may proceed.
The deterministic simulation count is complete, but the match-wide
manifestation rate is above target and no human playtest matches have been
recorded.

## Reproducible Run

```text
pnpm --filter @workspace/api-server run simulate:blueprints -- \
  --games 1000 --seed 7142031 --output ../../docs/blueprint-simulation-v2.json
```

The run assigns all six two-slot combinations from Antimatter Detonator,
Mantle-to-Orbit Foundry, Ascension Registry, and Worldshield Covenant across
four Hard AI seats. It acknowledges presentations immediately and uses no
account ownership advantage.

## Results

| Metric | Result | Gate |
|---|---:|---|
| Completed games | 1,000 / 1,000 | Pass |
| Stalled games | 0 | Pass |
| Average turns | 96.61 | Observe |
| Matches with any Project | 29.00% | Fail: target 10-20% |
| Antimatter manifestation | 1.40% | Report |
| Foundry manifestation | 5.80% | Report |
| Ascension manifestation | 5.50% | Report |
| Worldshield manifestation | 4.40% | Report |
| Antimatter detonation after manifestation | 64.29% | Report |
| Largest Blueprint win-rate delta | 1.31 points | Pass: maximum 2 |
| Seat win-rate spread | 4.60 points | Observe |
| Automated secrecy failures | 0 | Pass |
| Human playtests | 0 / 50 | Fail |

Seat win rates were 24.0%, 25.8%, 27.4%, and 22.8%. The full machine-readable
report is `docs/blueprint-simulation-v2.json`.

## Historical Decision

At the time of this run, the decision was not to enable Competitive. Its
assignment-based evidence suggested a frequency failure but did not establish
manifestation power:
the largest Blueprint win-rate delta remains within tolerance and all games
completed. Before another certification run, test a symmetric competitive-only
availability or assembly adjustment that lowers the chance of any Project
manifesting without changing recipes, secrecy, or Campaign behavior.

The 50 human matches remain a hard requirement even after an automated run
passes. They must evaluate comprehension, perceived fairness, hidden-information
trust, cinematic interruption, and whether the 10-20% target feels rare without
feeling irrelevant.
