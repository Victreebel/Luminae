# LUMINAe Chronicle Campaign Architecture v1.0

## Status

**Authoritative implementation architecture for campaign continuity, Chronicle
progression, Archive Rehearsals, cross-Chronicle memory, campaign rewards, and
Lume boundaries.**

This document resolves the system-level decisions needed before implementing
the principal campaign. It does not author individual Chronicle missions,
dialogue, cultures, balance, final cinematics, or reward tables.

It derives from and must remain concordant with:

- `LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md`;
- `LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md`;
- `LUMINAe_CONCORDANCE_IMPLEMENTATION_PLAN_v2.0.md`;
- `LUMINAe_LORE_BIBLE_v1.0.md`;
- `LUMINAe_CIVILIZATION_RULES_CALIBRATION_v1.0.md`;
- the current runtime Chronicle, Blueprint clearance, Civilization Record, and
  account Archive implementations.

Where the current runtime conflicts with the canonical story documents, this
architecture describes the target contract and identifies the runtime behavior
as transitional. It does not itself authorize a migration or content rollout.

## 1. Decisions At A Glance

1. The principal campaign is a chronological, fail-forward spine with authored
   local branches. It is not a set of mutually exclusive route tracks.
2. The first completed outcome of each Chronicle is immutable account canon.
   Victory and defeat both complete the Chronicle and advance the principal
   campaign.
3. A replay after primary completion is an Archive Rehearsal. It is explicitly
   counterfactual, never rewrites primary history, and never contributes hidden
   dimensions, ending eligibility, historical Lume, or competitive power.
4. There is no global route enum. Concrete story facts, hidden-dimension
   contributions, Civilization Records, and Lumii relationship memories remain
   separate and are evaluated together when later content needs them.
5. Threshold approaches such as Kinship, Inquiry, and Dominion are remembered
   encounter choices, not permanent campaign routes.
6. Principal progression gates use explicit authored facts. Hidden scores,
   purchases, standard-match statistics, Lume, and optional preparedness never
   block the next required Chronicle.
7. Baseline competitive rewards are outcome-invariant. A player must not choose
   between honest story expression and permanent account power.
8. Calibration Insights reveal preparation information. They are optional,
   earnable once in primary play or Rehearsal, and never gate access.
9. Lume remains a non-spendable, noncompetitive measure of historical quality.
   It is not a currency, cost, gate, or store balance.
10. The current Lumii Defense Forecast is a forecast, not a historical
    Chronicle. `Outer Vault Access` is a transitional Archive record, not a
    fabricated primary Chronicle outcome.

These decisions remove the campaign architecture and reward-economy design gate.
What remains is typed-contract implementation, additive persistence, authored
content, balance, presentation, and validation.

## 2. Canonical Concepts

### Domain

A Domain is one causally connected setting containing the two to four real
civilizations observed in a standard match or authored Chronicle. A new match
normally receives a new Domain. An authored Chronicle may explicitly return to
an existing Domain.

### Chronicle

A Chronicle is a formal authored story episode with declared civilizations,
controllers, objectives, primary outcomes, concrete consequences, and later
echoes. A standard match is real history but is not automatically a Chronicle.

### Primary Chronicle Outcome

The first completed authored outcome for an account and Chronicle. It is the
account's immutable canon for that Chronicle. It records victory or defeat,
Civilization consequences, concrete story facts, hidden-dimension
contributions, Lumii relationship observations, and consequence links.

### Archive Rehearsal

A knowingly simulated replay of a Chronicle after a primary outcome exists.
Lumii remembers that the simulation was observed, but neither Lumii nor the
campaign mistakes it for historical replacement.

### Calibration Insight

One optional preparedness achievement associated with each opening Chronicle.
It may be earned during primary play or a later successful Rehearsal. It reveals
one exact Threshold protocol or forecast consequence and does nothing else.

### Story Fact

A concrete, namespaced fact produced by authored content, such as a promise,
survival state, Project disposition, alliance refusal, Threshold approach, or
Fire/Seal decision. Story facts are not generic booleans invented by client
code; each belongs to a versioned Chronicle or movement definition.

### Hidden Dimension Contribution

An authored contribution to Agency, Knowledge, or Plurality. Contributions are
independent evidence, not a morality score and not a route selection. Only
primary history contributes.

### Relationship Memory

An authored observation about the Architect's relationship with Lumii or a
Luminary: honesty, respect for judgment, a promise kept or broken, acknowledged
harm, refusal, reconciliation, or another concrete relational event. It remains
separate from hidden dimensions and from account affinity statistics.

### Entitlement

An idempotent account grant such as Blueprint access, a cosmetic, a title, a
codex entry, or a recovered Archive record. An entitlement is not a historical
outcome and must not be used as a substitute for one.

## 3. Campaign Topology

### 3.1 Chronological fail-forward spine

The principal campaign is organized into ordered Movements. Each Movement may
contain one or more Chronicles or authored encounters. Primary history moves
forward in cosmic time.

Every required Chronicle has at least one authored victory outcome and one
authored defeat outcome. Both create a primary outcome and unlock the next
required progression state. Defeat may leave a civilization compromised,
fragmented, isolated, transformed, or extinct where explicitly authored, but it
does not become a retry screen masquerading as story.

### 3.2 What branching means

Branching may change:

- available dialogue and scene variants;
- the viable trajectories inside a Chronicle;
- which civilization, institution, Luminary, scar, or promise returns;
- later objectives, assistance, resistance, costs, or information;
- the state of the emerging network;
- ending eligibility and ending variants;
- non-power expression rewards.

Branching does not mean:

- selecting a permanent Kinship, Inquiry, or Dominion route;
- losing access to the principal campaign because of one answer;
- withholding baseline competitive power from one outcome;
- replacing accumulated history with a final dialogue choice;
- silently using a hidden score as a content lock.

Optional authored side records may require specific facts. The principal spine
must always provide a continuation for every valid primary outcome.

### 3.3 No global route field

The campaign must not persist a global value such as:

```text
campaignRoute = kinship | inquiry | dominion
```

Later content instead queries concrete facts and authored evidence. A Threshold
approach can influence dialogue because Lumii remembers it, but it cannot stand
in for how the Architect treated civilizations across the campaign.

### 3.4 Ending resolution

Ending resolution evaluates:

- concrete story facts;
- Agency, Knowledge, and Plurality contribution ledgers;
- Lumii relationship memories and current relation state;
- referenced Civilization Records and Civilization Outcomes;
- surviving constituencies and their consent;
- Luminary relations and anchor states;
- Project dispositions;
- network state: Architect-routed, reciprocal, or self-maintaining.

No single score or final choice may override a contradictory concrete record.
The resolver must be versioned and able to explain which evidence admitted or
excluded an ending family.

## 4. Persistence Model

### 4.1 Separation of concerns

The target persistence model keeps these concepts distinct:

| Concept | Persistence role |
|---|---|
| Chronicle definition | Versioned authored registry; not account state |
| Chronicle availability | Derived from shipped content and explicit gates |
| Primary outcome | Immutable first historical completion |
| Rehearsal | Counterfactual completion linked to its primary Chronicle |
| Calibration Insight | Unique optional preparedness grant |
| Story fact | Append-only concrete historical evidence |
| Dimension contribution | Append-only primary-history evidence |
| Lumii memory | Account-sealed relationship event |
| Entitlement | Idempotent account content grant |
| Civilization Record | Immutable per-civilization closure snapshot |
| Domain/cohort record | Shared historical context and participant summary |
| Lume award | Immutable assessment attached to an eligible historical record |

`account_chronicle_unlocks` may continue temporarily as an entitlement/archive
visibility table. It is not sufficient for primary outcome, Rehearsal,
relationship, or campaign progression state.

### 4.2 Primary outcome transaction

Primary completion uses a server-owned transaction keyed uniquely by
`accountId + chronicleId`.

The transaction must:

1. lock or atomically claim the absent primary outcome;
2. verify the room is the declared scenario and belongs to the account;
3. verify a terminal authored outcome exists;
4. persist the primary outcome and its Domain/cohort/Civilization links;
5. append validated story facts, dimension contributions, and relationship
   memories from the authored outcome definition;
6. grant the outcome-invariant progression entitlements;
7. grant a Calibration Insight if its objective was met and not already earned;
8. assess Lume only under the Chronicle's explicit historical policy;
9. return the existing primary result on an idempotent replay of the same
   closure event.

Concurrent or later completions cannot replace the first primary outcome.

### 4.3 Rehearsal transaction

A Rehearsal may begin only after a primary outcome exists. It records its own
room, simulated result, objective result, and viewed alternate material.

A Rehearsal may:

- grant one previously unearned Calibration Insight;
- unlock unique codex entries, art variants, titles, or accessibility to
  authored alternate scenes;
- add one relationship memory that Lumii knowingly observed a simulation.

A Rehearsal may not:

- mutate the primary outcome;
- append historical story facts or hidden-dimension contributions;
- alter historical ending inputs;
- grant Lume;
- grant competitive power;
- satisfy a primary-outcome progression gate;
- recalculate the historical Civilization Record.

### 4.4 Story facts

Story facts are namespaced and versioned, for example:

```text
chronicle.trace.v1:focal_civilization_condition = fragmented
chronicle.recurrence.v1:archive_disposition = conditionally_disclosed
movement.threshold.v1:approach = inquiry
movement.threshold.v1:continued_against_refusal = true
movement.first_charge.v1:detonator_disposition = sealed
```

The authoritative definition declares allowed keys and values. APIs reject
unknown client-authored facts. Facts are append-only; a later fact may supersede
an earlier condition through an explicit relation, but history is not edited in
place.

Specific facts take precedence over inferred dimension summaries when later
dialogue refers to specific history.

### 4.5 Hidden dimensions

Agency, Knowledge, and Plurality are derived from immutable contribution entries
attached to primary choices and outcomes. Store the evidence, not only a mutable
aggregate.

Each contribution requires:

- source Chronicle/movement and source event;
- dimension;
- direction;
- authored magnitude or weight;
- rationale key;
- definition version;
- visibility policy.

The current aggregate may be cached, but it must be reproducible from entries.
Rehearsals never add contributions.

### 4.6 Lumii relationship memory

Lumii memory is an account-sealed event ledger. It records what Lumii observed
and how the authored event bears on the relationship. It must not collapse into
one friendship meter.

A derived presentation profile may summarize trust, tension, familiarity,
respect, or estrangement, but later dialogue must be able to cite concrete
memories. Threshold approach is one such memory. It is not a global route.

### 4.7 Historical context classification

The Civilization Record context must eventually distinguish:

| Context | Meaning | Historical Lume |
|---|---|---|
| `historical` | Real standard match or primary Chronicle | Eligible by policy |
| `forecast` | Modeled future test such as Lumii's Defense Forecast | Never |
| `rehearsal` | Counterfactual Archive Rehearsal | Never |
| `interface_simulation` | Tutorial/control demonstration | Never |
| `legacy_unknown` | Evidence is insufficient to classify truthfully | Never retroactively |

The current `historical | forecast | unknown` contract is a transitional subset.
The distinction must be additive and backward compatible.

## 5. Progression And Gates

### 5.1 Gate rules

Campaign gates are server-owned, declarative predicates over explicit facts and
primary outcomes. They may test:

- existence of named primary Chronicle outcomes;
- a named movement outcome;
- a concrete story fact;
- a content/version availability flag;
- an explicitly authored prior-Domain relation.

Principal progression gates may not test:

- victory instead of completion unless the content is optional;
- Lume or Starlight balances;
- purchases or owned cosmetics;
- standard-match wins or account statistics;
- hidden-dimension thresholds;
- Calibration Insight count;
- a global route enum;
- Rehearsal completion as a substitute for primary history.

### 5.2 Opening Threshold gate

The canonical Vault Threshold becomes available when primary outcomes exist for
all three opening Chronicles:

1. Agency: The Trace;
2. Knowledge: The Recurrence;
3. Plurality: The Triangulation.

Victory, defeat, and Insight count do not change access. Each Insight only
unredacts one authored Threshold consequence or forecast.

### 5.3 Shipped-content availability

Story lock and product availability are different states. An authored gate may
be satisfied while the next Chronicle is not included in the installed release.
The UI must say that the current chapter is complete and future records are not
yet available. It must not render a broken launch button or imply that the
player failed an undisclosed requirement.

## 6. Reward Architecture

### 6.1 Reward classes

| Reward class | Source | Branch-dependent? | Rehearsal eligible? |
|---|---|---:|---:|
| Principal progression | Primary outcome existence | No | No |
| Baseline Blueprint/content entitlement | Fixed authored milestone | No | No |
| Calibration Insight | Preparedness objective | Objective only | Yes, once |
| Codex/story material | Authored discovery | Yes | Yes |
| Cosmetic/art/title | Authored expression reward | Yes | Yes |
| Lume | Eligible historical Civilization Record | Quality-derived | No |
| Story fact/consequence | Primary history | Yes | No |

Story consequences are not prizes. A damaged world, refused alliance, changed
institution, or reconciled relationship belongs to history and must not be
treated as account inventory.

### 6.2 Competitive fairness

For the principal campaign v1:

- all valid primary outcomes of one Chronicle grant the same baseline
  competitive content entitlement;
- no route-exclusive Blueprint, Artifact, Affinity advantage, starting resource,
  or permanent match modifier is allowed;
- a story choice may change how a capability appears or is understood, but not
  whether the account remains competitively complete;
- outcome-specific rewards are non-power unless a later, separately balanced
  system guarantees equivalent access and power.

The First Charge therefore records Fire or Seal and may vary scars, dialogue,
institutions, and cosmetics, but neither outcome withholds baseline competitive
power.

### 6.3 Idempotent grants

Every entitlement uses a unique source key such as:

```text
chronicle:<chronicleId>:primary:baseline
chronicle:<chronicleId>:insight
chronicle:<chronicleId>:rehearsal:<rewardId>
movement:<movementId>:milestone:<rewardId>
```

Retries, reconnects, duplicate finish events, and concurrent requests return the
existing grant. They do not multiply rewards.

### 6.4 Lume decision

Lume remains a non-spendable Architect Record assessment.

It must not be:

- deducted;
- exchanged;
- consumed;
- required to launch content;
- used to buy competitive power;
- used as a store price;
- farmed through Rehearsals, forecasts, Custom games, or legacy backfill.

Eligible real primary Chronicles may award Lume once when their authored
Civilization policy is `assess_once` and the record has complete evidence.
Introductory, non-civilization, forecast, or otherwise ineligible movements use
`record_only`. Rehearsals always award zero.

Lifetime Lume may be displayed as historical-quality recognition. Any future
use for non-power presentation should use non-depleting lifetime thresholds,
not spending, and requires a separate canon/economy revision. No such unlock is
adopted here.

### 6.5 Calibration Insights

An opening Chronicle has at most one Insight. The objective is visible before
play. An Insight:

- records preparedness rather than moral success;
- can be earned in primary play or a later successful Rehearsal;
- reveals one exact Threshold consequence or forecast;
- does not change the primary outcome;
- does not change hidden dimensions;
- does not gate access;
- is not currency and cannot be spent.

## 7. Civilization Integration

### 7.1 Historical episodes

A primary Chronicle creates real Civilization Records for all authored
participants according to access policy. The account receives full access to
its own civilization record and the permitted cohort/Domain summary.

Chronicle outcome definitions must declare typed Civilization consequence
profiles. A Chronicle cannot infer Agency, Continuity, Stability, or adversity
from player victory alone.

### 7.2 Rehearsals and forecasts

Rehearsals and forecasts may use the real game engine and render a Civilization
state for clarity, but their records remain classified as modeled. They cannot
enter historical Outcome totals or Lume.

Lumii's current `blueprint_clearance_lumii` scenario remains:

```text
historicalContext = forecast
campaignLumePolicy = record_only
```

### 7.3 Returning civilizations

When a later Chronicle returns to an existing Domain or civilization, it must
reference the prior immutable record and author the transformation from that
state. It may not regenerate the civilization from an aggregate route score.

Prior survival, Damage, Annihilation, Conditions, Projects, Luminary relations,
and institutions constrain what the civilization can offer, demand, or refuse.
Unknown legacy fields remain unknown.

## 8. Privacy And Projection

The server owns campaign truth. Public projections expose only what the current
account and scene may know.

- Hidden dimensions remain private until an authored reveal.
- Sealed Blueprint identities and recipes remain sealed.
- Private civilization and cohort facts are projected through authored public
  summaries.
- Relationship memory is account-sealed.
- Story definitions may expose labels and choices but never accept client-
  supplied consequence payloads.
- Ending explanations reveal only evidence the player is allowed to inspect.

No inaccessible asset name, API enum, action log, audio cue, or scene metadata
may leak a sealed Blueprint or future outcome.

## 9. Current Runtime Reconciliation

### 9.1 Existing reusable foundations

The current runtime already provides useful foundations:

- immutable account match rollups;
- versioned Civilization Records and Outcome/Lume assessments;
- explicit scenario history/Lume policy;
- idempotent Blueprint and Chronicle-like entitlement grants;
- durable Lumii Threshold dialogue and approach memory;
- account Archive projection;
- identity-safe Civilization event summaries.

These are reusable but do not yet constitute campaign persistence.

### 9.2 Transitional `Outer Vault Access` record

`chronicle_outer_vault_access` currently records a recovered Archive entitlement
after Lumii clearance. It has no primary outcome, no participating Domain, and
no Civilization outcome profiles. Under canonical terminology it is a
**Threshold Record**, not a completed Chronicle.

Migration must:

- preserve every existing unlock and its Antimatter entitlement;
- preserve the visible Archive record;
- stop using it as evidence that a canonical Chronicle was completed;
- avoid fabricating any of the opening Three Chronicle outcomes or Insights;
- retain a compatibility alias until clients no longer require the old ID.

### 9.3 Current Threshold memory

`account_blueprint_clearance.thresholdApproach`, dialogue path, and encounter
resolution are valid encounter memory. They are not a final campaign route.

The current `covenantBrokenAt` field represents continuation against Lumii's
Threshold refusal. Canon identifies this as a personal Threshold rupture, not a
global Broken Covenant. The target model should add a correctly named rupture
fact and preserve the legacy field only for compatibility. No migration may
infer that the global Covenant was broken.

### 9.4 Current campaign node

The Vault API currently emits `The First Charge` with `status: available` while
the UI correctly describes it as pending future content. The target contract
must distinguish `announced` or `pending_release` from `available`. Until the
scenario is playable, no launch route should be exposed.

### 9.5 Existing cleared accounts

Existing cleared accounts keep:

- Vault access;
- Antimatter Detonator ownership and current loadouts;
- Threshold approach/dialogue/rupture memory;
- reveal acknowledgement;
- any existing non-power key collectible.

They do not receive fabricated Chronicle outcomes, Insights, Domain histories,
hidden-dimension contributions, or Lume. The presentation that reconciles a
legacy Threshold experience with the future canonical campaign is authored
content; the data rule is settled even if that scene is not yet written.

### 9.6 Decryption Key

The Black Market Decryption Key is transitional power access and conflicts with
the canonical Three-Chronicle gate. Future campaign rollout retires it as a
power item, preserves existing copies as non-power Archive collectibles, and
preserves accounts already cleared through it.

## 10. Target Contract Families

Exact schema names remain an engineering choice, but the implementation must
provide distinct contract families equivalent to:

```text
ChronicleDefinition
ChronicleGateDefinition
ChroniclePrimaryOutcome
ChronicleRehearsal
CalibrationInsightGrant
CampaignFactEntry
CampaignDimensionContribution
LumiiRelationshipMemoryEntry
CampaignEntitlementGrant
CampaignProgressProjection
CampaignEndingAssessment
```

Definitions are typed, versioned, and server-owned. Account state references
definition IDs and versions; it does not persist arbitrary client-authored JSON
as campaign truth.

## 11. Required Invariants

1. One account has at most one primary outcome per Chronicle.
2. The first valid primary outcome cannot be replaced.
3. Defeat completes every required fail-forward Chronicle.
4. A Rehearsal requires a primary outcome and cannot satisfy a primary gate.
5. Rehearsals, forecasts, interface simulations, and legacy backfills award no
   Lume.
6. A Calibration Insight is unique per account and opening Chronicle.
7. Principal progression never depends on Insights, Lume, purchases, or hidden
   dimensions.
8. Baseline competitive entitlements do not vary by primary outcome.
9. Story facts and relationship memories are append-only and source-attributed.
10. Threshold approach is not a campaign route.
11. Existing entitlements survive migration without fabricated history.
12. Sealed content cannot leak through public projections or presentation
    metadata.
13. Unshipped content is distinguishable from locked content.
14. A later ending is explainable from recorded evidence.

## 12. Validation Matrix

### Persistence

- concurrent primary completions produce one immutable result;
- a primary defeat unlocks the same principal continuation as victory;
- Rehearsal results cannot overwrite primary facts or dimensions;
- Insight earned in Rehearsal is granted once without changing history;
- duplicate finish events do not duplicate entitlements or Lume;
- legacy clearance preserves access without creating Chronicle outcomes;
- unknown legacy history remains unknown.

### Gates

- all three opening primary outcomes unlock the Threshold at zero Insights;
- three Insights without three primary outcomes do not unlock it;
- standard wins, purchases, and Lume do not unlock it;
- unavailable future content reports `pending_release`, not a failed gate;
- every required defeat path has a valid continuation.

### Rewards

- all valid primary outcomes grant identical baseline competitive content;
- branch-specific rewards are non-power;
- Rehearsals grant neither power nor Lume;
- forecasts and tutorial simulations grant no historical Lume;
- an eligible primary Chronicle assesses Lume once from recorded historical
  quality, independent of win and Eminence.

### Narrative memory

- concrete facts override contradictory aggregate inference;
- Lumii can cite a remembered Threshold approach without treating it as a route;
- Rehearsal memory is identified as simulation;
- promises, survival, Project state, and Luminary refusal remain independently
  queryable;
- ending eligibility cannot be changed by one final dialogue choice.

### Privacy

- sealed facts, dimensions, Blueprint IDs, and outcome variants are absent from
  unauthorized REST, WebSocket, logs, assets, audio, and UI projections;
- account-sealed Lumii memory is never projected to another account;
- campaign consequence payloads cannot be authored by the client.

## 13. Lowest-Risk Implementation Sequence

### Phase 1: Shared story contracts

Add typed Chronicle definitions, outcome IDs, gate predicates, historical
context expansion, primary/Rehearsal projections, fact schemas, relationship
memory events, and entitlement source keys.

This phase is additive and contains no live story behavior.

### Phase 2: Additive persistence

Add separate primary outcome, Rehearsal, Insight, fact/contribution, relationship
memory, and entitlement ledgers. Preserve current tables and add compatibility
reads. Do not migrate or fabricate Chronicle outcomes.

### Phase 3: Transactional completion service

Implement idempotent primary and Rehearsal completion, reward grants, campaign
Lume policy, and public/private projections behind a feature flag.

### Phase 4: Gate and progress projection

Implement declarative server-side gates and explicit `locked`, `available`,
`completed`, `rehearsal`, and `pending_release` presentation states.

### Phase 5: Legacy reconciliation

Adapt Outer Vault Access, Threshold rupture terminology, cleared accounts,
legacy Signals, and Decryption Key preservation without fabricating history.

### Phase 6: Chronicle One vertical slice

Author The Trace with named participants, controllers, victory and defeat
outcomes, one preparedness objective, Civilization consequence profiles,
primary completion, and a successful Rehearsal.

### Phase 7: Story hub and Archive presentation

Expose primary canon, Rehearsals, Insights, later echoes, and truthful release
availability. Keep future Chronicles visibly planned but non-interactive until
playable.

### Phase 8: Remaining opening Chronicles and Threshold gate

Author Recurrence and Triangulation, then replace the legacy five-win gate with
the three-primary-outcome gate. Use Insights only for unredaction.

### Phase 9: Broader campaign authoring

Author The First Charge, returning civilizations, network stages, Luminary arcs,
and ending resolver evidence. This is content work inside the settled
architecture, not a new route-system decision.

## 14. Decisions Still Deferred

The architecture is settled. The following are authored or calibrated work,
not unresolved system design:

- exact Chronicle missions, cultures, dialogue, AI, and balance;
- exact hidden-dimension weights and ending thresholds;
- exact relationship-memory vocabulary and presentation summaries;
- exact primary-Chronicle Lume eligibility per scenario;
- exact non-power cosmetic/codex rewards;
- exact legacy-cleared-account reconciliation scene;
- exact First Charge Fire/Seal consequences;
- exact later Chronicle return order and ending variants.

None requires a global campaign route, a Lume spend economy, or a redesign of
the persistence principles in this document.

## 15. Release Boundary

The current shippable story surface remains the polished Lumii Threshold/Vault
vertical slice with Antimatter Detonator and an intentionally paused post-boss
hub. It must not claim that the principal Chronicle campaign is complete.

The next campaign implementation milestone is not "more Vault cards." It is a
complete Chronicle One vertical slice that can persist one primary defeat and
one successful Archive Rehearsal without rewriting history.

