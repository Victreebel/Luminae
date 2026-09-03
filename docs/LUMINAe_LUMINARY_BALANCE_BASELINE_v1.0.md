# LUMINAe Luminary Balance Baseline v1.0

## Verdict

The standard Luminary system created a real initiative advantage. Players who
acted earlier reached shared Luminaries sooner, then converted their earlier
alliances and arrival Eminence into additional tempo. The Artifact-only control
was neutral, and the claim gradient appeared across the Luminary catalog rather
than being caused by one outlier.

Ordinary matches now use a small, visible starting-Eminence correction. This
keeps every Artifact, Luminary requirement, effect, and action rule intact while
bringing simulated win rates close to the expected 50%, 33.3%, and 25% baselines.

Balance remains provisional until human match telemetry is available.

## Production Rule

After the opening player is selected at random:

| Opening position | Default | Four players, 20 Victory |
|---:|---:|---:|
| First | 0 Eminence | 0 Eminence |
| Second | 1 Eminence | 1 Eminence |
| Third | 1 Eminence | 1 Eminence |
| Fourth | 1 Eminence | 2 Eminence |

The correction:

- applies to standard rooms, campaign matches, and rematches;
- is recorded in the opening action log;
- does not remove anything from the Affinity Well;
- does not alter the turn sequence or any card; and
- is opt-in at initialization, leaving tutorial and guided setups unchanged.

## Reproducible Simulation

Production and Artifact-only matrix:

```text
pnpm --filter @workspace/api-server run simulate:artifacts -- \
  --games 5000 \
  --seed 7142031 \
  --players all \
  --victory 15,20 \
  --mode all
```

Uncompensated control on the same deterministic boards:

```text
pnpm --filter @workspace/api-server run simulate:artifacts -- \
  --games 5000 \
  --seed 7142031 \
  --players all \
  --victory 15,20 \
  --mode uncompensated
```

## Opening-Position Results

| Players | Victory | Uncompensated | Production |
|---:|---:|---|---|
| 2 | 15 | 53.42% / 46.58% | 48.48% / 51.52% |
| 3 | 15 | 37.30% / 32.40% / 30.30% | 32.50% / 35.22% / 32.28% |
| 4 | 15 | 28.80% / 25.68% / 24.06% / 21.46% | 24.32% / 26.86% / 25.62% / 23.20% |
| 2 | 20 | 53.44% / 46.56% | 49.74% / 50.26% |
| 3 | 20 | 37.94% / 32.90% / 29.16% | 34.14% / 34.54% / 31.32% |
| 4 | 20 | 31.48% / 25.66% / 23.20% / 19.66% | 25.96% / 25.88% / 23.68% / 24.48% |

All 30,000 production matches completed. The uncompensated control showed a
consistent first-player slope, reaching an 11.82-point first-to-fourth gap in
the four-player 20-Victory format. Production reduced that gap to 2.28 points.

The correction compensates for the aggregate tempo effect; it does not remove
the underlying fact that earlier players claim somewhat more Luminaries. That
claim pattern should remain visible in future telemetry so a later human-data
revision can distinguish fair outcomes from merely equal claim counts.

## Alternatives Rejected

- **Larger Luminary pool:** did not remove the initiative gradient.
- **Qualification credits:** strongly overcorrected and weakened the meaning of
  printed requirements.
- **Starting Affinity:** interfered with Harness and Forge decisions and moved
  the advantage rather than cleanly correcting it.
- **One-Luminary alliance cap:** improved simulations but contradicted the
  intended ability to stack multiple alliances.
- **Removing arrival Eminence:** reduced the gradient by flattening tuned card
  identities and rewards.

## Canonical Reward Check

The audit also restored and verified the settled values that had drifted during
earlier experimentation:

- Verdant Oracle: 1 Eminence.
- Void Warden: 0 Eminence and Oblivion 5.
- `???`: 1 Eminence; Forgotten Hour raises the Victory requirement by 1.
- Concordance Mandala: 3 Eminence.

## Current Decision

1. Keep the current Luminary requirements, effects, and canonical rewards.
2. Keep the production turn-order correction isolated in ordinary match setup.
3. Track opening position, Luminary claims, final Eminence, and winner in human
   telemetry before tuning again.
4. Revisit only if live results show a sustained position deviation above the
   current simulation envelope.
