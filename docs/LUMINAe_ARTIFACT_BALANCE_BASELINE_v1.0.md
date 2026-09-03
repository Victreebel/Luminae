# LUMINAe Artifact Balance Baseline v1.0

## Verdict

The 90-Artifact catalog is **provisionally healthy**. No broad Artifact rebalance
is justified by the current automated evidence.

The former seat-order distortion was not an Artifact problem. Final-round and
round-number boundaries were hard-coded to seat 0 even though the opening player
is randomized. Both boundaries now use the recorded opening player, with seat 0
retained only as a compatibility fallback for older saved games.

Human playtesting is still required before calling the catalog competitively
balanced.

## Reproducible Simulation

```text
pnpm --filter @workspace/api-server run simulate:artifacts -- \
  --games 5000 \
  --seed 7142031 \
  --players all \
  --victory 15,20 \
  --mode all
```

Each match receives an independent deterministic seed. Running one scenario by
itself therefore produces the same board sequence as running the complete
matrix.

`standard` now reproduces the ordinary-match turn-order compensation described
in `LUMINAe_LUMINARY_BALANCE_BASELINE_v1.0.md`. `artifacts-only` removes active
Luminaries and the compensation while preserving the complete Artifact economy.
This isolates underlying Artifact balance from Luminary timing and rewards.

## Artifact-Only Results

| Players | Victory Requirement | Completed | Average Turns | Opener-relative win rates | Winner's average T1 / T2 / T3 |
|---:|---:|---:|---:|---|---|
| 2 | 15 | 5,000 / 5,000 | 54.17 | 50.0% / 50.0% | 11.94 / 6.61 / 1.07 |
| 2 | 20 | 5,000 / 5,000 | 58.81 | 50.0% / 50.0% | 12.17 / 7.91 / 1.92 |
| 3 | 15 | 4,998 / 5,000 | 78.68 | 33.1% / 33.9% / 33.1% | 11.29 / 6.64 / 0.96 |
| 3 | 20 | 4,998 / 5,000 | 85.71 | 34.4% / 34.0% / 31.7% | 11.53 / 7.94 / 1.85 |
| 4 | 15 | 5,000 / 5,000 | 101.53 | 25.0% / 24.3% / 25.3% / 25.4% | 9.77 / 6.50 / 1.01 |
| 4 | 20 | 5,000 / 5,000 | 111.98 | 25.9% / 25.4% / 25.2% / 23.5% | 10.09 / 7.62 / 2.04 |

Seat and opener-relative results are close to the expected 50%, 33.3%, and 25%
baselines. The large former advantage for later array seats is gone.

## Format Interpretation

### 15 Eminence

- Quicker standard format.
- Primarily a Tier I and Tier II race.
- Winners average about one Tier III Artifact.

### 20 Eminence

- Adds approximately 4.5 turns in two-player, 6.9 in three-player, and 10.5 in
  four-player matches.
- Approximately doubles the winner's Tier III participation.
- Better represents the complete three-tier civilization arc.

The setup interface should describe 15 as the quicker standard format and 20 as
the strategic format with more room for Tier III. Neither is inherently the
"correct" competitive target until human pacing tests are complete.

## Affinity Watch List

Winner Artifact-bonus shares remain close to the neutral 20% expectation.
Radiance and Abyss generally sit slightly above neutral while Continuum and
Flare generally sit slightly below it. The observed spread is small and does
not justify individual card changes yet.

Continue monitoring:

- `t1r04` Causal Spark Coil, the catalog's only total-cost-2 Tier I Artifact.
- The symmetric five-card Tier II mono-cost cycle.
- Radiance discount utility, because Radiance appears most often in printed
  costs across the full catalog.

## Resolved Separate-System Finding

The original standard-mode audit found a measurable opening-player advantage
with Luminaries enabled, most visibly in four-player games:

- 15 Eminence: 29.1% for the opener versus 22.1% for the fourth position.
- 20 Eminence: 30.7% for the opener versus 20.8% for the fourth position.

The artifact-only control did not reproduce the pattern. A dedicated Luminary
audit confirmed that the difference came from the cumulative timing of
Luminary access and rewards rather than Artifact values. Ordinary matches now
apply a small, visible starting-Eminence correction based on randomized opening
position. Artifact costs, bonuses, and rewards remain unchanged.

## Current Decision

1. Keep the current Artifact costs, bonuses, and Eminence values.
2. Preserve 15 and 20 as distinct match-length choices.
3. Preserve the ordinary-match turn-order compensation unless human telemetry
   shows a materially different seat pattern.
4. Collect human match telemetry before changing individual Artifacts.
