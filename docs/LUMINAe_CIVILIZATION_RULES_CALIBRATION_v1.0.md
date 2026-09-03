# LUMINAe Civilization Rules Calibration v1.0

## Status

**Adopted foundation for Civilization pressure response, Stability, historical
Maturity, current operational Reach, Civilization Outcome, and Lume.**

This calibration implements the Civilization v1.1 doctrine without changing the
Forge/Well economy, Artifact costs, Blueprint recipes, victory rules, Eminence,
or ordinary turn actions.

## Causal Order

Civilization resolution follows one order:

1. Authored content declares its pressure tags and context.
2. Operational capabilities determine which trajectories exist.
3. Affinity identity describes execution aptitude and characteristic risk.
4. Stability, Conditions, and current Reach determine whether the civilization
   can execute the trajectory without cascade.
5. Probability is used only when content explicitly authors genuine uncertainty.
6. Consequences update concrete state and then recalculate derived state.

Affinity never substitutes for a missing capability. A highly Flare civilization
may be naturally suited to transformation, for example, but cannot execute a
specific transformation it has no operational capability to perform.

## Pressure Response

The bounded pressure vocabulary remains:

`Disruption`, `Isolation`, `Proliferation`, `Exposure`, `Attrition`,
`Coordination`, and `Transformation`.

Every pressure profile contains:

- primary operational capabilities, which produce **strong** coverage;
- supporting capabilities, which produce **partial** coverage;
- an aptitude and risk value for every natural Affinity;
- an inspectable net execution fit.

Dominant dyads use both parent Affinities. A meaningful third Affinity modifies
the result at half weight. Plural civilizations retain a plural assessment
instead of receiving an arbitrary tie-break.

The matrix is qualitative infrastructure for authored content. It does not apply
automatic rewards or penalties to ordinary actions. Content can require minimum
coverage, minimum aptitude, or maximum characteristic risk when those distinctions
are causally relevant.

Canonical source: `lib/game-types/src/civilization-pressure.ts`.

## Stability

Stability is a global 0-100 capacity score with an 80-point competitive baseline.

| Band | Score |
|---|---:|
| Stable | 70-100 |
| Strained | 45-69 |
| Unstable | 20-44 |
| Crisis | 0-19 |

Standard competitive civilizations begin at 80 / Stable. Authored Chronicles may
start elsewhere by supplying explicit causes.

### Structural pressure

| Cause | Pressure |
|---|---:|
| Damaged Artifact implementation | 5 |
| Annihilated Artifact implementation | 8 |
| Disabled network/installation/Project | 8 |
| Annihilated network/installation/Project | 15 |
| Isolated world | 12 |
| Quarantined world | 8 |
| Disrupted world | 10 |
| Annihilated settled world | 30 |
| Annihilated homeworld | 65 |

Equivalent local Conditions use smaller target-appropriate values. A Damaged
Artifact and its matching Damaged Condition are not counted twice. Archival is an
intentional operational retirement and creates no Stability pressure.

Authored supports and pressures use the shared magnitude language:

| Magnitude | Value |
|---|---:|
| Trace | 3 |
| Minor | 5 |
| Material | 10 |
| Severe | 20 |
| Catastrophic | 35 |

There is no generic Stabilize action. Resolving the underlying Condition, Damage,
loss, or authored pressure removes its active contribution and recalculates the
score. Crisis is vulnerability, not automatic defeat.

## Historical Maturity

Maturity is derived from demonstrated breadth and scale. It never reads Artifact
tier, depiction scale, or literal Kardashev Type.

### Stellar

All of the following are required:

- six distinct mastered implementations;
- six qualitative capabilities;
- three capability domains;
- one independent stellar foundation signal.

Stellar foundation signals are a stellar-or-greater Project, a settled world, an
established network, or the combined ability to navigate transit, coordinate over
distance, and sustain distant operation.

### Galactic

Stellar criteria plus all of the following are required:

- twelve distinct mastered implementations;
- twelve qualitative capabilities;
- six capability domains;
- two independent stellar foundation signals;
- a galactic Project or a distributed interstellar anchor.

A distributed anchor requires the interstellar capability triad plus either two
stellar Projects, two settled worlds, or one of each. This preserves equifinality
without allowing one Tier III Artifact to imply a Galactic civilization.

Historical Maturity never regresses. Mastery, manifested Projects, established
worlds, and networks remain historical evidence after local loss.

## Operational Reach

Current Reach runs the same evidence model using only operational Artifact
implementations, active Projects, active settled worlds, and operational networks.
It may recover or regress independently of historical Maturity.

- no scale gap: `intact`;
- one-level gap or active systemic disruption: `degraded`;
- two-level gap or homeworld loss: `fractured`.

An explicit authored Reach consequence takes precedence until content replaces
it. This lets a Chronicle or catastrophe impose a specific causal result without
the derived model immediately erasing it.

Literal Kardashev Type remains separate historical metadata for compatibility.

## Authored Event Integration

Established Blueprint behavior now enters the Civilization layer through the
shared causal resolver without changing recipes, trigger timing, targeting, or
player permissions.

The initial authored integrations are:

- Blueprint manifestation;
- Mantle-to-Orbit Foundry recovery, sustainable fabrication, and overdrive;
- Ascension Registry threshold resolution;
- Worldshield hostile-claim interception;
- Antimatter Detonator consequence resolution.

Each completed resolution applies its concrete consequences and appends one
deduplicated event to the live Civilization history. The internal event retains
its causal source, selected trajectory, pressure profile, and resolver history.
The public projection carries only identity-safe consequence information. A
sealed Blueprint source is never named through the event summary.

The live ledger is bounded to 64 entries. The ordinary Civilization view shows
only the three most recent consequences and an aggregate event count. This is an
inspectable record, not a recurring Civilization action queue.

Canonical implementation:

- `lib/game-types/src/index.ts` (`applyCivilizationResolution`);
- `artifacts/api-server/src/lib/civilizationBlueprintIntegration.ts`;
- `artifacts/api-server/src/lib/gameEngine.ts`;
- `artifacts/api-server/src/lib/stateProjection.ts`.

## Immutable Civilization Records

Every newly completed match receives a versioned Civilization Record inside the
existing idempotent account match rollup. The record snapshots:

- match and controller context;
- historical, forecast, or unknown legacy campaign context;
- normal, surrender, or unknown legacy closure reason;
- final Eminence and competitive result;
- the final Civilization state, including causal events;
- manifested Projects;
- Luminary relationships;
- an explicit evidence classification and unavailable-field list.

The rollup's unique room/account key makes the first completed snapshot
immutable. Public account history receives a summary rather than the internal
causal record. The summary exposes at most the strongest support and pressure
for each Outcome dimension. Structural causes retain readable labels; authored
causes use identity-safe labels so sealed Blueprint or scenario information
cannot leak through the Archive.

Legacy truthfulness is mandatory. If an older room lacks a recorded
Civilization state, the record uses `legacy_unavailable`; it does not infer
Stability, Affinity identity, Maturity, Reach, Artifact lifecycle, or event
history from unrelated match totals. Partially available state uses
`partial_legacy` and preserves its lower-confidence evidence markers.

Chronicle-specific outcome detail remains unavailable until each Chronicle
authors it. Civilization Outcome and Lume are assessed only from evidence that
is actually recorded.

The current `Outer Vault Access` Chronicle is an account-level recovered story
record, not an in-match Civilization pressure. It therefore authors no Outcome
signals. Future runtime-pressure Chronicles must declare typed resolution
profiles with pressure tags, Outcome signals, and adversity evidence.

Canonical implementation:

- `artifacts/api-server/src/lib/civilizationRecords.ts`;
- `artifacts/api-server/src/lib/accountProgress.ts`;
- `lib/db/migrations/0015_civilization_records.sql`;
- `artifacts/api-server/src/routes/auth.ts`.

## Civilization Outcome

Civilization Outcome uses four 0-100 dimensions:

| Dimension | Evidence |
|---|---|
| Continuity | Homeworld and settled-world survival, systemic Conditions, infrastructure loss, current Reach condition, and authored continuity signals |
| Agency | A preserved baseline modified only by typed authored evidence; player choice, victory, and inactivity never masquerade as civilizational agency |
| Achievement | Distinct mastered implementations, qualitative capability breadth, historical Maturity, manifested Projects, and authored achievement signals |
| Stability | The final calibrated Stability score and its recorded contributors |

Continuity begins at 82. Agency begins at 75 because civilizations are presumed
self-directing unless history records otherwise. Achievement begins at 10 and
must be demonstrated. Stability uses the competitive 80-point baseline and the
actual final score.

Authored historical signals use the shared magnitude vocabulary (`Trace`,
`Minor`, `Material`, `Severe`, `Catastrophic`). Duplicate signal IDs within the
same causal event do not stack.

The quality score is:

```text
30% Continuity
+ 25% Agency
+ 25% Achievement
+ 20% Stability
+ 0-8 recovered-adversity quality points
```

Continuity below 20 caps quality at 30. Agency below 20 caps quality at 40.
Stability below 20 caps quality at 65. These caps prevent extraordinary works
from numerically erasing civilizational collapse, loss of self-direction, or an
active systemic crisis.

Outcome categories are causal descriptions rather than a moral ladder:

| Outcome | Rule |
|---|---|
| Ascendant | Achievement and total quality are both at least 70, while Continuity, Agency, and systemic condition remain viable |
| Enduring | Continuity and Agency remain viable without another terminal condition |
| Precarious | Continuity is below 50, Stability is below 30, or current Reach is fractured |
| Subordinated | Agency is below 25 while Continuity remains viable |
| Collapsed | Continuity is below 20 |

Competitive result and final Eminence are not inputs. A losing civilization can
therefore be Ascendant, and a winning civilization can close Precarious.

Canonical implementation: `lib/game-types/src/index.ts`
(`assessCivilizationOutcome`).

## Adversity

Adversity remains context, not a fifth dimension.

Only authored adversity evidence and resolved historical Stability pressures can
qualify. Current unresolved harm grants no recovery credit. When final
Continuity is at least 50 and Stability is at least 45, recovered adversity may
add at most eight quality points. That bounded credit can change a Lume award by
at most one in ordinary cases; it cannot make engineered catastrophe the optimal
strategy. Retried copies of one causal event or resolved pressure are
deduplicated before adversity is assessed.

## Lume

Lume is a noncompetitive Architect Record reward for historical quality. It is
separate from Starlight and currently has no store purchasing power.

For eligible records:

```text
Lume = round((quality - 20) / 8), clamped to 0-10
```

Achievement prevents passive-history farming by setting the maximum award:

| Achievement | Maximum Lume |
|---:|---:|
| 0-19 | 2 |
| 20-34 | 4 |
| 35-49 | 6 |
| 50-69 | 8 |
| 70-100 | 10 |

This ceiling affects Lume only. A technologically quiet civilization can still
truthfully close as Enduring; it simply cannot produce a high archival reward
without recorded accomplishment.

Award policy:

- current, fully recorded Standard and Competitive closures award Lume;
- Custom matches preserve Outcome but award none;
- Campaign matches preserve Outcome and require an explicit authored Lume
  policy before they can award it;
- Lumii's Defense Forecast is explicitly `record_only`: it preserves a forecast
  record, is not presented as historical fact, and awards no Lume;
- partial or unavailable evidence awards none;
- backfilled matches award none, even if enough old state survives to estimate
  an Outcome;
- one immutable match-rollup insert can award only once.

The account stores lifetime Lume separately from match-level awards. Neither
winning, Eminence, match duration, held Affinities, nor cosmetic/account state
enters the formula.

Canonical implementation:

- `lib/game-types/src/index.ts` (`assessCivilizationLume`);
- `artifacts/api-server/src/lib/civilizationRecords.ts`;
- `artifacts/api-server/src/lib/accountProgress.ts`;
- `lib/db/migrations/0015_civilization_records.sql`.

## Next Phase

The foundational and ordinary integration blocks are complete. The live scene
now renders low-cost Stability and active-Condition treatments, the Archive
exposes identity-safe Outcome causes, and deterministic calibration fixtures
guard bounds, non-stacking evidence, and reward eligibility.

Remaining work requires either authored future campaign content or real playtest
evidence. Campaign topology, cross-Chronicle memory, Rehearsals, reward classes,
and the decision that Lume remains non-spendable are now settled in
`LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md`. Remaining campaign work is
typed-contract implementation, additive persistence, authored content, balance,
presentation, and validation rather than another reward-economy design pass.
