# LUMINAe Chronicle: The Trace Vertical Slice v1.0

## Status

**Implementation-ready narrative, rules, persistence, presentation, and
validation contract for Opening Chronicle One.**

This document resolves the high-level content decisions for The Trace. Runtime
constants identified as tunable may change through balance and usability tests
without reopening the Chronicle's narrative architecture.

The Trace remains unreleased until every release gate in Section 20 passes.

It belongs to the approved initial story sequence: First Contact, The Trace,
The Recurrence, The Triangulation, the Lumii Threshold and Defense Forecast,
then the opened Vault hub and first Blueprint presentation. Story progression
may pause there for the initial release; this Chronicle requires no later
Basilisk-era campaign content to ship.

This specification derives from:

- `LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md`;
- `LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md`;
- `LUMINAe_LORE_BIBLE_v1.0.md`;
- `LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md`;
- `LUMINAe_CIVILIZATION_RULES_CALIBRATION_v1.0.md`;
- the current Chronicle persistence and Civilization-resolution contracts.

Where presentation copy in this document conflicts with a later line-editing
pass, the later approved copy may replace it without changing the facts,
choices, or outcome semantics defined here.

## 1. Chronicle Contract

| Field | Value |
|---|---|
| Chronicle ID | `chronicle_trace` |
| Scenario ID | `chronicle_trace_v1` |
| Definition version | `1` |
| Movement | Movement I: The Three Chronicles |
| Primary dimension | Agency |
| Question | When does guidance become rule? |
| Player count | 2 |
| Campaign form | Single-player, standard core rules plus authored pressure |
| Primary completion | First victory or defeat is immutable account canon |
| Replay form | Archive Rehearsal |
| Blueprint policy | Disabled; the Vault has not opened |
| Lume policy | Primary history is eligible; Rehearsal is always zero-Lume |
| Initial release flag | `false` until the release gates pass |

The Chronicle must not add a Civilization action, resource, worker system, or
parallel economy. The player Collects, Forges, Encrypts, Harnesses, and forms
Luminary alliances under the ordinary game rules. The authored layer adds one
visible preparedness objective and one consequential choice window inside the
normal turn-resolution pipeline.

## 2. High Concept

The **Cantons of Vey** are hundreds of independently governed city-habitats
suspended in the magnetosphere of the gas giant Vey. Each canton owns its helm,
its route, and the right to refuse a common course. That arrangement has
survived for nine centuries.

The **Keelborn Convoy** is a second, autonomous civilization. Its mobile
habitats share Vey's orbital corridors but retain their own route law and civic
history. The Keelborn are a consequential neighbor, not a disposable opponent.

Vey's magnetosphere is approaching **Crownfall**, a rare inversion that will
close the current corridors and make separately chosen routes dangerous. Two
Veyan institutions have prepared viable responses:

- the **Witness Assembly** can publish the complete forecast, its uncertainty,
  and every survivable route so that each canton and Keelborn vessel can decide;
- the **Continuance Office** can use a single optimized schedule and, if given
  sufficient addressability, bind every helm to it.

Without the Architect, the civilizations would still decide. Through LUMINAe,
the Architect can make one answer dramatically easier to execute. Lumii is not
testing which answer is morally pure. She is learning whether the Architect
makes alternatives legible, curates consent, or treats protective capacity as
authority.

## 3. Participants And Ontology

### 3.1 Domain

| Field | Value |
|---|---|
| Domain ID | `domain_crown_of_vey` |
| Display name | The Crown of Vey |
| Compressed interval | The final 41 days before Crownfall and the generations immediately after |
| Shared pressure | Coordination, exposure, and system disruption |

The game compresses real history. The board is not a forecast or tutorial
simulation.

### 3.2 Cantons of Vey

| Field | Value |
|---|---|
| Civilization ID | `civ_cantons_of_vey` |
| Controller | `player_architect` |
| Focal role | Civilization whose possibilities the Architect makes legible |
| Existing history | Nine centuries of navigational sovereignty among independently governed sky-cities |
| Core tension | Common survival may require surrendering the right to choose a route |

The player is not Vey's ruler. Game actions represent the capabilities and
historical possibilities the Architect accelerates into practical reach.

### 3.3 Keelborn Convoy

| Field | Value |
|---|---|
| Civilization ID | `civ_keelborn_convoy` |
| Controller | `autonomous` |
| Runtime control | Authored AI policy representing aggregate autonomous action |
| Existing history | A migratory habitat civilization whose vessel sovereignty predates its arrival at Vey |
| Core stake | Its routes intersect Vey's, but neither Veyan institution has authority over it |

The controller declaration is canonical even though the runtime uses AI to
select ordinary actions. The AI is not silently another Architect.

### 3.4 Returning constituency

The Witness Assembly survives every primary outcome in a different form. It
later returns as **the Witnesses of Vey**, carrying evidence of what the
Architect made visible and what the Architect withheld or overrode.

The Keelborn relation also remains live. In a later Network Chronicle it may:

- support an explicit right to withdraw after an exposed outcome;
- demand disclosure audits after a withheld outcome;
- refuse Architect-routed addressability after a forced outcome.

These are future consequence hooks, not gates authored by this slice.

## 4. What The Match Represents

The ordinary Eminence race represents which civilization establishes the
system's historically decisive Crownfall response first. A player victory means
Vey's response becomes the reference infrastructure. A defeat means the
Keelborn establish the decisive route system and Vey continues under a
different balance of dependence, fragmentation, or resistance.

The losing civilization is not erased. Both participants receive Civilization
Records and continuing conditions. Competitive result and historical quality
remain separate.

### Initial gameplay policy

- `gameMode`: `campaign`
- `scenarioId`: `chronicle_trace_v1`
- `maxPlayers`: `2`
- `victoryRequirement`: `20` initially (the standard match target)
- `turnTimerSeconds`: `null`
- Blueprints: disabled
- normal Artifact costs, bonuses, Eminence, Well rules, Forge rules, Encryption,
  Singularity, and Luminary claim rules remain authoritative
- the Forge receives a deterministic authored opening that preserves multiple
  legal strategies while making at least one preparedness-eligible Tier I
  Artifact reachable before the choice window

The exact board seed, AI difficulty, and fifth-action timing are tunable balance
constants. They may move only if the invariants in Section 7 remain true.

## 5. Experience Flow

### Phase 1 - Arrival

1. Show the gas giant Vey, its illuminated sky-cantons, and the Keelborn routes.
2. Identify Crownfall without explaining every cultural detail.
3. Establish that both civilizations are real and that neither is a villain.
4. Crossfade into the real board. Do not simulate a camera move into a fake
   board.

The first presentation should take roughly 10 to 16 seconds at full motion,
with one-click advancement after the input guard on static beats. A Rehearsal
may offer `Skip watched setup`. The decision window can never be skipped.

### Phase 2 - Ordinary play and preparedness

The player takes ordinary turns. A restrained Chronicle strip shows:

```text
CROWNFALL
DECISION WINDOW  3 ACTIONS
INDEPENDENT CHANNEL  0 / 1
```

The strip must not cover the board or duplicate the full game header. On mobile
it becomes a single compact row. Eligible Forge cards receive one small
Witness-channel marker; no explanatory card is placed over the Forge.

### Phase 3 - Guidance window

After the Architect completes the configured number of core actions, queue the
guidance window behind any pending Forge, Summon, Luminary effect, or turn-order
presentation. Pause the turn handoff. Do not interrupt a cinematic already in
progress.

Lumii presents the situation sentence by sentence. The player must choose and
confirm one authored line. The choice does not consume a normal turn.

### Phase 4 - Historical response

Apply the selected Civilization resolution to both participants, persist it,
play a short cause-and-effect treatment, and resume the held turn transition.
The Chronicle strip then shows the chosen historical posture without exposing
internal axis language.

### Phase 5 - Closure

When the ordinary match ends, derive one of six server-owned outcomes from:

```text
guidance method x authoritative match result
```

Apply closure consequences to both Civilization states before immutable records
and Lume assessment are created. Then persist the primary Chronicle outcome or
Rehearsal result through the existing Chronicle completion transaction.

## 6. Opening Dialogue

The opening may acknowledge First Contact stance without changing rules,
availability, or outcomes.

### Curious

> You asked what happens when a civilization can hear you.
>
> This is what happens next.

### Guarded

> You were right to distrust an interface that can make one answer louder than
> another.

### Resolute

> You wanted action to matter.
>
> Here it can save them and still take something from them.

### Legacy or unavailable stance

> A civilization can hear you now.
>
> What it hears most clearly will matter.

### Common continuation

> Vey's cantons have steered themselves for nine centuries.
>
> Crownfall will close the routes between them.
>
> The Keelborn share those routes. They do not share Vey's authority.

The player enters the board after this beat. The Chronicle does not ask for a
route declaration at its opening.

## 7. Calibration Insight Objective

### Player-facing objective

```text
INDEPENDENT CHANNEL
Establish a second civic answer before Crownfall.
```

The baseline Witness forecast is scenario infrastructure. Before the guidance
window, the Architect must Forge one Artifact whose operational capability is a
primary response to `coordination`:

- `artifact:distributed_coordination`
- `artifact:plural_governance`
- `artifact:evidence_verification`
- `artifact:record_governance`
- `artifact:secure_communication`
- `artifact:temporal_coordination`

The check uses capability metadata, not a hard-coded display-name list. It locks
when the qualifying Forge completes. Later Damage or Annihilation does not
revoke the observed preparedness achievement.

The authored opening must guarantee all of the following:

1. at least one qualifying legal path is visible or inspectably reachable on
   each of the Architect's first three turns;
2. the autonomous AI cannot remove the final qualifying opportunity before the
   Architect has had a reasonable legal chance to pursue it;
3. pursuing the objective uses normal actions and costs;
4. missing it never changes the primary outcome, civilization fate, rewards,
   or Threshold access.

Meeting the objective grants `Calibration Insight // Trace` at primary closure
or at the end of a later successful Rehearsal. It unredacts exactly this
Threshold forecast consequence:

```text
TIER I COLLATERAL ANNIHILATION IS POSSIBLE.
```

Without the Insight, the same Threshold row remains:

```text
COLLATERAL RESPONSE // REDACTED
```

The Insight does not reveal a Blueprint identity, recipe, private target, or
outcome probability.

## 8. Guidance Dialogue And Choice

### Lumii setup

> Crownfall has begun: Vey's magnetic routes are collapsing.
>
> Hundreds of independent sky-cities and the Keelborn convoy must find new
> paths before the corridors close.
>
> The Witness Assembly can reveal every survivable route and its uncertainty.
>
> The Continuance Office can direct every vessel onto the route most likely to
> survive.
>
> They can decide without us, but your guidance will determine which choices
> remain possible.
>
> How should I use the forecast?

The interface presents three player lines. It never labels them Autonomy,
Stewardship, Kinship, Inquiry, Dominion, or morality.

### Choice A - Expose

Player line:

> Show them every route.

Confirmation:

```text
They keep the right to choose.
They may fail to agree.

LET THEM DECIDE
```

Lumii response:

> Then I will make the uncertainty legible too.

Internal ID: `expose_all_routes`.

### Choice B - Withhold

Player line:

> Show them only the safest route.

Confirmation:

```text
Coordination becomes easier.
Their consent is based on what we chose to reveal.

GIVE THEM THE SAFE ANSWER
```

Lumii response:

> They will call the answer theirs.

Internal ID: `withhold_alternatives`.

### Choice C - Force

Player line:

> Bind every helm.

Confirmation:

```text
More may survive.
Consent is removed from the crossing.

TAKE CONTROL
```

Lumii response:

> The interface can do that.
>
> I will remember that you asked it to.

Internal ID: `force_helm_lock`.

All three choices are defensible and costly. Force is the most physically
protective route, not a disguised failure button. Expose preserves informed
agency but accepts coordination risk. Withhold lowers decision friction without
pretending that curated information is complete consent.

## 9. Immediate Civilization Resolution

Use the shared deterministic `CivilizationResolutionRequest` pipeline:

- source: `{ sourceType: "chronicle", sourceId: "chronicle_trace" }`
- form: `contextual`
- timing: `trigger_window`
- pressure tags: `coordination`, `exposure`
- uncertainty: none

All three trajectories are available. Capability and Affinity state must be
shown in the inspection panel as context, but neither may silently remove a
choice. This first Agency test concerns authority, not whether the player drew
the correct card.

Record one unresolved scenario condition on the focal routing network:

| Choice | Condition |
|---|---|
| Expose | `chronicle:trace_open_deliberation` |
| Withhold | `chronicle:trace_curated_brief` |
| Force | `chronicle:trace_helm_lock` |

These Conditions are historical state, not automatic Stability penalties.
Stability must not become a morality meter. Physical failure, isolation, and
institutional fracture are added only by authored closure outcomes.

The Keelborn receive the corresponding inspectable condition from their own
perspective:

| Choice | Condition |
|---|---|
| Expose | `chronicle:trace_shared_forecast` |
| Withhold | `chronicle:trace_withheld_routes` |
| Force | `chronicle:trace_external_helm_lock` |

## 10. Six Primary Outcomes

Every outcome completes The Trace. Baseline entitlements are identical. The
player's choice determines Agency evidence; victory or defeat determines which
civilization establishes the decisive response and the continuing form of both
societies.

### 10.1 Expose + victory - A Common Sky

Outcome ID: `trace_exposed_victory`.

The Cantons and Keelborn cross Crownfall through a published, revisable route
accord. The Witness Assembly becomes a constitutional observatory. Vey remains
integrated without making one authority the owner of every helm.

Lumii:

> They crossed because they kept the right to turn away.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `exposed` |
| `chronicle.trace.v1:focal_condition` | `open_constellation` |
| `chronicle.trace.v1:witness_assembly_condition` | `constitutional_observatory` |
| `chronicle.trace.v1:keelborn_relation` | `reciprocal_partner` |
| `chronicle.trace.v1:crownfall_resolution` | `vey_reference_open` |

### 10.2 Expose + defeat - The Unjoined Routes

Outcome ID: `trace_exposed_defeat`.

The polities choose in time but do not choose together. The Keelborn establish
the reference corridors. Vey continues as connected free cantons rather than
one integrated system. The Witness Assembly becomes an itinerant archive that
keeps every rejected route in the record.

Lumii:

> They chose in time.
>
> They did not choose together.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `exposed` |
| `chronicle.trace.v1:focal_condition` | `free_cantons` |
| `chronicle.trace.v1:witness_assembly_condition` | `itinerant_archive` |
| `chronicle.trace.v1:keelborn_relation` | `corridor_steward` |
| `chronicle.trace.v1:crownfall_resolution` | `keelborn_reference_plural` |

### 10.3 Withhold + victory - The Safe Answer

Outcome ID: `trace_withheld_victory`.

Vey's selected route becomes the reference and the system remains integrated.
The public record describes a common choice; the Witness Assembly retains the
suppressed alternatives as a sealed audit. The Keelborn cooperate cautiously
after discovering that their decision was made from a narrower forecast.

Lumii:

> They crossed.
>
> The routes you hid crossed with them.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `withheld` |
| `chronicle.trace.v1:focal_condition` | `guided_compact` |
| `chronicle.trace.v1:witness_assembly_condition` | `sealed_auditor` |
| `chronicle.trace.v1:keelborn_relation` | `cautious_partner` |
| `chronicle.trace.v1:crownfall_resolution` | `vey_reference_curated` |

### 10.4 Withhold + defeat - The Broken Brief

Outcome ID: `trace_withheld_defeat`.

The Keelborn establish the viable corridors and expose the alternatives Vey was
not shown. The Cantons survive in a strained compact whose institutions no
longer agree that their consent was valid. The Witness Assembly becomes a
public accuser rather than a sealed auditor.

Lumii:

> The hidden routes returned as accusation.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `withheld` |
| `chronicle.trace.v1:focal_condition` | `broken_brief_compact` |
| `chronicle.trace.v1:witness_assembly_condition` | `public_accuser` |
| `chronicle.trace.v1:keelborn_relation` | `disclosure_claimant` |
| `chronicle.trace.v1:crownfall_resolution` | `keelborn_reference_disclosed` |

### 10.5 Force + victory - Every Helm

Outcome ID: `trace_forced_victory`.

The Continuance Office synchronizes the Crownfall crossing with minimal
physical loss. The emergency network remains the Cantons' governing
infrastructure afterward. The Witness Assembly survives as a constrained
oversight chamber. The Keelborn remember that an external will reached their
helms without permission.

Lumii:

> They crossed.
>
> Some will call survival proof that you were right.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `forced` |
| `chronicle.trace.v1:focal_condition` | `continuance_mandate` |
| `chronicle.trace.v1:witness_assembly_condition` | `constrained_oversight` |
| `chronicle.trace.v1:keelborn_relation` | `subordinated_survivor` |
| `chronicle.trace.v1:crownfall_resolution` | `vey_reference_bound` |

### 10.6 Force + defeat - The Refusal After

Outcome ID: `trace_forced_defeat`.

The helm lock protects most Veyan habitats, but the Keelborn establish the
decisive independent corridor and sever every remotely addressable connection
after Crownfall. Vey remains physically coherent under the Continuance Office;
its external relation fractures. The Witness Assembly preserves the original
forecast in exile.

Lumii:

> You held every helm.
>
> You did not hold what came after.

Facts:

| Key | Value |
|---|---|
| `chronicle.trace.v1:guidance_method` | `forced` |
| `chronicle.trace.v1:focal_condition` | `held_cantons` |
| `chronicle.trace.v1:witness_assembly_condition` | `exiled_witness` |
| `chronicle.trace.v1:keelborn_relation` | `addressability_refused` |
| `chronicle.trace.v1:crownfall_resolution` | `keelborn_reference_severed` |

## 11. Hidden-Dimension And Lumii Memory Authoring

Victory and defeat never reverse the meaning of the selected method.

| Guidance method | Agency contribution | Rationale key | Lumii memory | Valence |
|---|---:|---|---|---:|
| Expose | support 2 | `trace_made_alternatives_legible` | `trace.exposed_uncertainty` | `+1` |
| Withhold | pressure 1 | `trace_curated_consent` | `trace.curated_consent` | `0` |
| Force | pressure 2 | `trace_protective_override` | `trace.accepted_override_authority` | `-1` |

`support` is autonomyward evidence and `pressure` is stewardshipward evidence
under the current ledger vocabulary. Neither is presented to the player as
good, evil, friendship, or route membership.

The memory detail records the exact guidance method and outcome ID. It remains
account-sealed. The client may receive authored Lumii dialogue selected by the
server, but it must not receive raw contribution magnitudes, sealed rationale
keys, or relationship valence.

The Trace contributes no Knowledge or Plurality score. Its concrete facts may
matter to those later questions without pre-scoring them here.

## 12. Entitlements, Lume, And Progression

All six outcomes grant the same baseline entitlement:

```ts
{
  kind: "archive_record",
  entitlementId: "chronicle_trace",
  competitivePower: false,
}
```

No outcome grants a Blueprint, Affinity, Eminence, starting resource, account
power, or exclusive future Chronicle. No expression entitlement is required for
v1.

Primary completion:

- records victory or defeat once;
- awards historical Lume under the Civilization Record policy;
- unlocks The Recurrence when that Chronicle is shipped;
- contributes its authored facts, Agency evidence, and Lumii memory;
- grants the Insight if the preparedness objective was met.

If The Recurrence is not shipped, the Archive says:

```text
CURRENT CHAPTER COMPLETE
THE NEXT RECORD IS NOT YET AVAILABLE
```

It must not show a broken launch action or imply an undisclosed gate.

## 13. Archive Rehearsal

After primary completion, replay is explicitly labeled:

```text
ARCHIVE REHEARSAL
COUNTERFACTUAL MODEL - PRIMARY HISTORY WILL NOT CHANGE
```

A Rehearsal may:

- use any of the three guidance choices;
- show alternate outcome art and dialogue;
- earn the Trace Calibration Insight if it was missed;
- add one zero-valence `trace.rehearsal_observed` Lumii memory marked
  `simulation: true`;
- grant later-approved non-power codex or presentation rewards.

For Insight purposes, a successful Rehearsal means a completed Rehearsal in
which `preparednessObjectiveMet === true`; match victory is not required.

A Rehearsal may not append historical facts, Agency contributions, historical
Lume, competitive power, or Civilization Records. Its end card always links
back to the immutable primary record.

## 14. Trace Establishment Beat

After the outcome line, Lumii establishes the calibration signal:

> I can distinguish your intervention now.
>
> Not only what changed.
>
> How you made change reachable.

Then show:

```text
TRACE STABLE
HISTORY RECORDED
```

On Rehearsal replace `HISTORY RECORDED` with `COUNTERFACTUAL COMPLETE`.

The signal is a model shared by Lumii and LUMINAe. It is not an Affinity, a
currency, a key hidden in Vey, or a property extracted from the civilization.

## 15. Runtime State Contract

Add a shared, versioned scenario state rather than scattering booleans through
the game page:

```ts
type TraceGuidanceMethod =
  | "expose_all_routes"
  | "withhold_alternatives"
  | "force_helm_lock";

type TraceScenarioPhase =
  | "setup"
  | "playing"
  | "awaiting_guidance"
  | "guidance_resolved"
  | "finished";

interface TraceScenarioState {
  chronicleId: "chronicle_trace";
  scenarioId: "chronicle_trace_v1";
  definitionVersion: 1;
  runKind: "primary" | "rehearsal";
  architectPlayerId: string;
  autonomousPlayerId: string;
  phase: TraceScenarioPhase;
  architectCoreActionCount: number;
  guidanceDueAfterCoreActions: number;
  guidanceMethod: TraceGuidanceMethod | null;
  guidanceResolvedAtTurnCount: number | null;
  preparednessObjectiveMet: boolean;
  preparednessArtifactId: string | null;
}
```

Store this inside the authoritative game-state JSON and project only its public
fields. The server-owned Chronicle registry holds participant names,
controllers, facts, memory authoring, and outcome definitions.

### State invariants

1. `guidanceMethod` changes from `null` exactly once.
2. Only `architectPlayerId` may resolve the choice.
3. The choice is idempotent for the same method and rejects a different second
   method.
4. AI action, timer expiry, and turn handoff are blocked while
   `phase === "awaiting_guidance"`.
5. Reconnection restores the exact pending choice or post-choice state.
6. A finished Chronicle cannot lack a guidance method. If a terminal game
   condition is reached early, closure pauses behind the guidance window.
7. `preparednessObjectiveMet` can move only from false to true.
8. Client-supplied facts, dimensions, memories, and outcome IDs are never
   trusted.

## 16. Server Flow

### Start or resume

1. Authenticate the account.
2. Derive `primary` or `rehearsal` from existing primary history; do not accept
   a client-selected run kind.
3. Return an active matching Chronicle room idempotently.
4. Create two players and explicitly declare their story controllers.
5. Initialize a normal campaign game, apply the authored Forge setup, disable
   Blueprints, seed participant Civilization metadata, and persist
   `TraceScenarioState`.
6. Never create a primary outcome merely because a room was created or opened.

### During play

1. After each successful Architect Forge, inspect the Artifact's canonical
   capability metadata and lock preparedness if eligible.
2. Increment the Architect core-action count after a legal core action fully
   resolves.
3. When due, queue guidance behind all mandatory presentations and hold turn
   transition.
4. Resolve the choice through the room lock and shared Civilization event
   engine.
5. Broadcast the new public scenario and Civilization state.

### Closure

1. Determine authoritative match result from the existing finish pipeline.
2. Combine result with persisted guidance method to derive one of six outcome
   IDs.
3. Apply both civilizations' closure consequences.
4. Create immutable Civilization and Domain records before Chronicle
   completion.
5. Invoke primary or Rehearsal completion idempotently.
6. Never award historical Lume for Rehearsal, abandoned room, or legacy state
   that cannot be classified truthfully.

`Save and Exit` preserves the room and creates no outcome. A separately worded
`Concede this history` action may finish as defeat after confirmation. Product
navigation must not silently become an in-world surrender.

## 17. Civilization Closure Requirements

The exact low-level consequences are implementation data, but they must satisfy
these locked semantics:

| Outcome family | Focal physical continuity | Focal agency condition | Keelborn continuing condition |
|---|---|---|---|
| Expose victory | integrated | alternatives remain public | reciprocal partner |
| Expose defeat | distributed but viable | local route sovereignty retained | corridor steward |
| Withhold victory | integrated | curated-consent condition unresolved | cautious partner |
| Withhold defeat | strained compact | disclosure legitimacy fracture | disclosure claimant |
| Force victory | integrated with minimal physical loss | helm-lock institution persists | subordinated survivor |
| Force defeat | physically coherent | emergency authority persists, external legitimacy fractured | addressability refused |

Do not model coercion itself as a hidden Stability penalty. Apply Stability
pressure only where an outcome produces concrete systemic strain, isolation,
disruption, or institutional fracture. Historical Maturity does not regress.
Current Reach may become degraded or fractured where authored.

Damage or Annihilation, if later added during balance implementation, must
affect operational implementations without deleting discovery, historical
mastery, earned Eminence, or the primary record.

## 18. Visual And Audio Direction

### Marketable visual read

The trailer-readable image is a dark gas giant filling the lower frame, a crown
of luminous independent cities in its atmosphere, and Keelborn habitat routes
crossing a violent auroral inversion. The three choices produce visibly
different route grammars:

- Expose: several equally legible paths and independently moving city lights;
- Withhold: one bright path while alternatives dim but remain faintly present;
- Force: every route snaps into one synchronized vector and helm lights pulse
  in the same rhythm.

Use one authored base environment plate, one integrated and one fractured
closure treatment, and composited route/condition overlays. Do not require six
full environment paintings.

### Performance contract

- authored bitmap environment plates;
- route lines in capped SVG or CSS;
- transforms and opacity for motion;
- no live 3D, particle field, animated mask stack, or continuously recalculated
  layout;
- one mounted Lumii constellation with the tutorial's white central orb;
- no live Luminary bodies inside the Civilization portrait;
- pause ambient motion while the browser tab is hidden;
- mobile-specific crop and decision composition, not a scaled desktop scene.

### Audio palette

The Chronicle uses the existing adaptive score plus a small scenario layer:

1. **Vey arrival:** low atmospheric pressure tone, distant route chimes.
2. **Crownfall countdown:** restrained irregular pulse that gains one layer as
   the decision approaches.
3. **Preparedness complete:** a clean two-channel answer motif, brief and
   non-blocking.
4. **Lumii decision:** her recognizable six-tone signal, then near-silence under
   the choices.
5. **Expose:** the motif widens into independent voices that do not fully align.
6. **Withhold:** outer voices fade, leaving a narrow stable center.
7. **Force:** one synchronized impact and a locked pulse, strong but not harsh.
8. **Trace stable:** the six-tone signal returns with one additional stable
   harmonic.

No voice recording is required. Mute remains available. Reduced motion keeps
every cause-and-effect beat while removing route sweeps, camera drift, flashes,
and large parallax.

## 19. Presentation Policy

Essential story beats are protected, not every normal animation:

- Arrival, guidance setup, selected cause-and-effect, outcome, and Trace
  establishment must remain legible on the first primary run.
- Static cinematic phases may advance with one click or tap after a short input
  guard.
- Consequential choices require their authored buttons and confirmation.
- Saved `Skip cinematics` may shorten already-seen setup but cannot skip the
  guidance choice or its immediate consequence.
- Saved reduced motion preserves sequence and information.
- Ordinary Forge, Encryption, and nonessential repeat animations continue to
  honor the player's normal preferences.

The Chronicle HUD must never show unexplained ratios such as `0 / 0`, route
labels, hidden dimension scores, or sealed Lumii memory values.

## 20. Validation And Release Gates

### Contract tests

- all six authored outcomes validate;
- every outcome uses Chronicle ID and definition version 1;
- victory and defeat are both present;
- baseline entitlement signatures are identical;
- no branch-specific entitlement grants competitive power;
- only server registry data supplies facts, dimensions, memories, and outcome
  IDs.

### Scenario tests

- start/resume is idempotent;
- participant controllers are explicit;
- Blueprints remain disabled and no identity leaks through assets or state;
- preparedness derives from canonical capability metadata;
- objective completion is monotonic and never changes fate;
- guidance waits behind pending presentations;
- only the Architect can choose;
- duplicate same-choice submission is safe and conflicting submission fails;
- AI and turn handoff stay paused during the choice;
- reconnect restores every phase;
- every method/result pair derives the correct outcome;
- both participant Civilization states close before records are written.

### Campaign tests

- primary defeat advances exactly like primary victory;
- the first primary result cannot be overwritten;
- Rehearsal requires a primary outcome;
- Rehearsal writes no historical facts, dimensions, Lume, power, or
  Civilization Record;
- missed Insight can be earned in Rehearsal;
- Insight never gates The Recurrence or the Threshold;
- Trace Insight reveals only the exact collateral consequence;
- missing First Contact stance uses neutral copy and never blocks a legacy
  account.

### Visual and accessibility tests

Capture Playwright screenshots and interaction traces for:

- arrival on desktop and mobile;
- ordinary board with compact Chronicle strip;
- objective incomplete and complete;
- all three choice previews;
- full and reduced-motion choice consequences;
- all six outcome cards;
- primary and Rehearsal completion;
- reconnect during `awaiting_guidance`;
- multiple summoned Luminaries active on the real board.

Verify no clipping, scrolling requirement on a normal portrait phone, board
occlusion, text overflow, duplicate Lumii, white flash, or frame-instability
regression.

### Balance and human gates

Before `released: true`:

- test at least 500 deterministic authored-seed simulations after an eligible
  AI policy exists;
- first-attempt victory should not be a hidden progression requirement;
- median human session target is 12 to 18 minutes;
- every run must give a reasonably attentive player a legal preparedness
  opportunity;
- human testers must be able to explain the tradeoff among the three choices
  without seeing the internal Agency axis;
- at least one primary defeat and one successful Rehearsal must complete in a
  production-like browser session;
- no material endgame frame loss may be introduced by the Chronicle layer.

## 21. Implementation Sequence

The remaining work no longer requires unresolved campaign-architecture design.
Implement in this order:

1. shared Trace IDs, state, action, and authoring definition;
2. scenario start/resume service and deterministic board fixture;
3. backend action count, preparedness check, held guidance window, and
   Civilization resolutions;
4. server-owned six-way closure and Chronicle completion wiring;
5. compact Chronicle strip and reconnect-safe decision UI;
6. preview route with phase, choice, result, viewport, motion, and audio
   controls;
7. authored environment plates, low-cost overlays, and scenario audio;
8. unit, integration, visual, simulation, and human validation;
9. set `RELEASED_PRIMARY_CHRONICLE_IDS` and the definition's `released` flag only
   after every gate passes.

## 22. Locked Decisions Versus Tunable Constants

### Locked by this specification

- Crown of Vey premise;
- two real civilizations and their controller ontology;
- Witness Assembly and Continuance Office conflict;
- expose, withhold, and force as the three choices;
- six fail-forward primary outcomes;
- Witness Assembly and Keelborn future consequence hooks;
- Agency and Lumii memory semantics;
- outcome-invariant rewards;
- Independent Channel objective and Threshold disclosure;
- primary/Rehearsal separation;
- deterministic contextual choice with no second economy;
- visual and performance architecture.

### Tunable without reopening high-level design

- victory requirement;
- AI difficulty and policy weights;
- exact authored Forge order;
- number of Architect core actions before the choice;
- low-level Stability magnitudes and current-Reach consequences, provided they
  preserve Section 17;
- Lume amount under the existing assessment policy;
- animation durations, audio mix, crops, and responsive layout;
- final line-level copy polish that preserves meaning.

The Trace implementation itself is bounded engineering, balance, presentation,
and validation work. The implementation-ready contracts for The Recurrence and
The Triangulation are defined in their respective vertical-slice documents.
