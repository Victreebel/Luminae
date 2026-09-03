# LUMINAe Chronicle: The Recurrence Vertical Slice v1.0

## Status

**Implementation-ready narrative, rules, persistence, presentation, and
validation contract for Opening Chronicle Two.**

This document resolves the high-level content decisions for The Recurrence.
Runtime constants identified as tunable may change through balance and
usability testing without reopening the Chronicle's narrative architecture.

The Recurrence remains unreleased until every release gate in Section 23
passes.

It belongs to the approved initial story sequence: First Contact, The Trace,
The Recurrence, The Triangulation, the Lumii Threshold and Defense Forecast,
then the opened Vault hub and first Blueprint presentation. Story progression
may pause there for the initial release. This Chronicle creates one explicit
later Basilisk-era return hook, but no later campaign content is required for
The Recurrence itself to ship.

This specification derives from:

- `LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md`;
- `LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md`;
- `LUMINAe_LORE_BIBLE_v1.0.md`;
- `LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md`;
- `LUMINAe_CIVILIZATION_RULES_CALIBRATION_v1.0.md`;
- `LUMINAe_CIVILIZATION_ARTIFACT_CAPABILITIES_v1.0.md`;
- the current Chronicle persistence and Civilization-resolution contracts.

Where presentation copy in this document conflicts with a later approved
line-editing pass, the later copy may replace it without changing the facts,
choices, or outcome semantics defined here.

## 1. Chronicle Contract

| Field | Value |
|---|---|
| Chronicle ID | `chronicle_recurrence` |
| Scenario ID | `chronicle_recurrence_v1` |
| Definition version | `1` |
| Movement | Movement I: The Three Chronicles |
| Primary dimension | Knowledge |
| Question | Who may hold a dangerous truth? |
| Player count | 2 |
| Campaign form | Single-player, standard core rules plus authored pressure |
| Primary completion | First victory or defeat is immutable account canon |
| Replay form | Archive Rehearsal |
| Prerequisite | Primary outcome for `chronicle_trace` |
| Blueprint policy | Disabled; the Vault has not opened |
| Lume policy | Primary history is eligible; Rehearsal is always zero-Lume |
| Initial release flag | `false` until the release gates pass |

The Chronicle must not add a Civilization action, knowledge currency, research
tree, prerequisite queue, worker system, or parallel economy. The player uses
the ordinary Collect, Forge, Encrypt, Harness, and Luminary-alliance rules. The
authored layer adds one visible preparedness objective and one consequential
knowledge-custody window inside normal turn resolution.

## 2. High Concept

The planet **Eido** keeps one face toward a violent white star. The **Meridian
Houses** inhabit a narrow band of cities between the burning dayside and the
black-glass nightside. Beneath the dark ice, the **Oru Current** is a second,
autonomous civilization whose people preserve identity and history through
electrochemical motion across a planetary ocean.

Every few centuries, Eido's star reverses its magnetic poles. The event is
called the **White Return**. The Meridian Houses survived the last Return
through a planetary shield whose origin became myth.

As the next Return approaches, the Houses recover the **Deep Index**, an
authenticated archive beneath the ice. It establishes three facts:

1. the old shield was not passive;
2. it forced the Oru Current into one conductive pattern and erased three Oru
   memory generations;
3. its final layer contains an unverified correction that may protect both
   civilizations without repeating the erasure.

The correction and the original coercion use the same operational grammar. If
the complete Index is made readable, it may save both civilizations and also
give every reader the means to command or rewrite the Oru. If the operational
grammar is sealed, the warning survives but the best defense may become
unavailable. If access is divided, survival depends on a small custody system
that neither public can fully audit.

The Architect does not decide what is true. The Architect changes who can hold,
test, withhold, or act on the truth. Lumii is learning whether the Architect
distinguishes responsible disclosure from acquisition, and whether restraint
preserves a warning or merely creates a more dangerous absence.

## 3. Participants And Ontology

### 3.1 Domain

| Field | Value |
|---|---|
| Domain ID | `domain_white_return` |
| Display name | The White Return |
| Primary world | Eido |
| Compressed interval | The final 36 days before the White Return and the generations immediately after |
| Shared pressure | Exposure, transformation, and incomplete knowledge |

This Domain has no causal, cultural, or historical connection to the Crown of
Vey. That separation is required: Recurrence proves that LUMINAe's interpretive
model can recognize the Architect's treatment of knowledge across an unrelated
horizon.

### 3.2 Meridian Houses of Eido

| Field | Value |
|---|---|
| Civilization ID | `civ_meridian_houses_of_eido` |
| Controller | `player_architect` |
| Focal role | Civilization that physically recovered the Deep Index |
| Existing history | Twilight cities governed through independent Houses, common observatories, and public evidentiary courts |
| Core tension | Their continued survival may depend on admitting that an earlier survival erased another civilization's memory |

The player is not the Houses' ruler. Ordinary game actions represent
capabilities and historical possibilities the Architect accelerates into
practical reach.

### 3.3 Oru Current

| Field | Value |
|---|---|
| Civilization ID | `civ_oru_current` |
| Controller | `autonomous` |
| Runtime control | Authored AI policy representing aggregate autonomous action |
| Existing history | A subglacial civilization whose persons, institutions, and records persist through bounded currents rather than fixed bodies |
| Core stake | The Deep Index can help preserve the Oru through the White Return and can also make their substrate externally commandable |

The Oru are not a device, ecology, collective resource, or moral prop. They are
a separately recorded civilization. The runtime AI does not imply a hidden
Architect or make the Oru less sapient.

### 3.4 The Deep Index

The Deep Index is a local historical archive and control record. It is not:

- a Blueprint or Blueprint component;
- a Vault key planted in Eido;
- a Basilisk instance or message;
- information sent backward in time;
- a Luminary artifact;
- proof that the White Return is artificial.

Its three player-facing layers are:

| Layer | What is known |
|---|---|
| Warning | The coming White Return and the failure modes of Eido's old shield |
| Record | Verifiable evidence of the three erased Oru memory generations |
| Grammar | The original command system and an incomplete, unverified correction |

The archive remains causally ordinary. Its later importance comes from how its
warning, absence, or custody pattern helps advanced civilizations recognize a
new dangerous inference. It is not a hidden campaign key.

### 3.5 Continuing institutions

Each possible custody method creates or transforms a returning institution:

- the **Open Index Assembly** maintains public copies and adversarial review;
- the **Keepers of the Blank** preserve an authenticated warning and evidence
  that an operational relation was intentionally removed;
- the **Two Readers Compact** gives one appointed reader from each civilization
  a complementary part of the operational proof, with either able to refuse.

At least one of these forms survives every primary outcome. The campaign later
returns to the concrete form that actually exists in primary history.

## 4. Epistemic Limits

The Chronicle must show what is known, what is inferred, and what remains
unresolved.

Known with strong evidence:

- the Deep Index is authentic;
- the prior shield used the Oru as its conductive substrate;
- three Oru memory generations terminate at the shield event;
- the complete operational grammar can impose a global Oru pattern;
- the White Return presents a real, near-term threat to both civilizations.

Not known:

- whether the correction preserves Oru identity under full planetary load;
- whether public scrutiny can identify every coercive relation before use;
- whether a sealed grammar can be reconstructed from the warning and surviving
  implementations;
- whether a dual-custody institution will remain legitimate under crisis.

The uncertainty is genuine, but v1 uses no hidden random outcome roll. The six
closures are deterministic from custody method and authoritative match result.
Imperfect information creates the decision; it does not conceal a dice table.

## 5. What The Match Represents

The ordinary Eminence race represents which civilization establishes Eido's
historically decisive response to the White Return first.

- Architect victory means the Meridian Houses establish the reference defense
  and its governing custody arrangement.
- Architect defeat means the Oru establish the reference response first, and
  the Houses continue under a different balance of protection, dependence,
  fracture, or accountability.

Neither result erases the losing civilization. Both receive Civilization
Records and continuing conditions. Competitive result, physical survival,
Knowledge evidence, and historical quality remain separate.

### Initial gameplay policy

- `gameMode`: `campaign`
- `scenarioId`: `chronicle_recurrence_v1`
- `maxPlayers`: `2`
- `victoryRequirement`: `20` initially (the standard match target)
- `turnTimerSeconds`: `null`
- Blueprints: disabled
- normal Artifact costs, bonuses, Eminence, Well rules, Forge rules,
  Encryption, Singularity, and Luminary claim rules remain authoritative
- the Forge receives a deterministic authored opening that preserves multiple
  legal strategies while making at least one preparedness-eligible Tier I
  Artifact reachable before the custody window

The exact board seed, AI difficulty, and action timing are tunable balance
constants. They may move only if the invariants in Section 8 remain true.

## 6. Experience Flow

### Phase 1 - Arrival

1. Show Eido divided among white stellar fire, a narrow inhabited twilight,
   and black nightside ice.
2. Let Oru light move beneath the ice before naming it as a civilization.
3. Establish the White Return and the newly recovered Deep Index.
4. Crossfade into the real board. Do not simulate a camera move into a fake
   board.

The first presentation should take roughly 10 to 16 seconds at full motion,
with one-click advancement after the input guard on static beats. A Rehearsal
may offer `Skip watched setup`. The custody window can never be skipped.

### Phase 2 - Ordinary play and preparedness

The player takes ordinary turns. A restrained Chronicle strip shows:

```text
WHITE RETURN
CUSTODY WINDOW  3 ACTIONS
INDEPENDENT READER  0 / 1
```

On mobile this becomes one compact row. Eligible Forge cards receive one small
reader marker. The UI must not put an explanatory card over the Forge or render
an unexplained ratio such as `0 / 0`.

### Phase 3 - Index disclosure

After the Architect completes the configured number of core actions, queue the
Deep Index window behind any pending Forge, Summon, Luminary effect, turn-order
presentation, or other mandatory cinematic. Pause turn handoff. Do not
interrupt an animation already in progress.

Lumii reveals the archive one sentence at a time, then presents the three
authored player lines. The choice does not consume a normal turn.

### Phase 4 - Custody consequence

Apply the selected Civilization resolution to both participants, persist it,
and play a short cause-and-effect treatment:

- public copies distribute across both civilization portraits;
- the sealed method collapses into an authenticated dark absence surrounded by
  its warning;
- conditional access separates into two complementary reader halves.

Resume the held turn transition only after the consequence is legible. The
Chronicle strip then shows the custody posture without exposing internal
Knowledge-axis language.

### Phase 5 - Closure

When the ordinary match ends, derive one of six server-owned outcomes from:

```text
custody method x authoritative match result
```

Apply both civilizations' consequences, create historical Records, complete
the Chronicle transaction, and establish the Recurrence calibration signal.

## 7. Opening Dialogue

The opening may acknowledge the immutable Trace guidance method without
changing rules, objectives, available custody choices, or rewards.

### Trace exposed

> At Vey, you made every route legible.
>
> This record contains a route that can be used against the people it may save.

### Trace withheld

> At Vey, you narrowed what others could see.
>
> Here, the missing part can be reconstructed.

### Trace forced

> At Vey, you used control to protect.
>
> Here, the dangerous thing is the means of control itself.

### Legacy or unavailable Trace detail

> This Domain has no path to Vey.
>
> LUMINAe can still bring its question into relation with you.

### Common continuation

> Eido turns one face toward its star.
>
> The Meridian Houses live in the narrow country between fire and ice.
>
> Beneath the dark glass, the Oru remember through motion.
>
> The White Return is approaching.

The Chronicle does not ask for a personality, route, or doctrine declaration at
its opening.

## 8. Calibration Insight Objective

### Player-facing objective

```text
INDEPENDENT READER
Establish a way to test the Deep Index before custody is decided.
```

Before the custody window, the Architect must Forge one Artifact whose
operational capability is a primary means of independent reading or audit:

- `artifact:evidence_verification`
- `artifact:signal_interpretation`
- `artifact:information_recovery`
- `artifact:record_governance`
- `artifact:predictive_modeling`
- `artifact:memory_preservation`

The check uses canonical capability metadata, not a hard-coded display-name
list. It locks when the qualifying Forge completes. Later Damage or
Annihilation does not revoke the observed preparedness achievement.

The authored opening must guarantee all of the following:

1. at least one qualifying legal path is visible or inspectably reachable on
   each of the Architect's first three turns;
2. the autonomous AI cannot remove the final qualifying opportunity before the
   Architect has had a reasonable legal chance to pursue it;
3. pursuing the objective uses normal actions and costs;
4. meeting or missing it never changes the primary outcome, custody choice,
   civilization fate, rewards, or Threshold access.

Meeting the objective grants `Calibration Insight // Recurrence` at primary
closure or after a later completed Rehearsal in which the objective was met. It
unredacts exactly this Threshold consequence:

```text
FIRST SEAL DEACTIVATION IS PERMANENT.
```

Without the Insight, the same Threshold row remains:

```text
SEAL REVERSIBILITY // REDACTED
```

This is preparation, not permission. The Insight does not reveal a Blueprint,
recipe, private protocol, Lumii's hidden strategy, or outcome probability.

## 9. Deep Index Dialogue And Choice

### Lumii setup

> The Deep Index is genuine.
>
> It records how the Meridian Houses survived the last White Return.
>
> The shield did not consume an empty field.
>
> It forced the Oru Current into one conductive pattern.
>
> Three of their remembered generations end there.
>
> The final layer claims it can protect both civilizations without repeating
> that loss.
>
> Neither civilization can prove the claim.
>
> The same layer contains the grammar that made the first erasure possible.

The interface presents three player lines. It never labels them Disclosure,
Containment, Conditional Access, Kinship, Inquiry, Dominion, or morality.

### Choice A - Publish

Player line:

> Give both civilizations the whole Archive.

Confirmation:

```text
Every warning, gap, and control relation becomes public.
No authority can monopolize it.
No authority can recall it.

PUBLISH THE DEEP INDEX
```

Lumii response:

> Then responsibility will be distributed with the danger.

Internal ID: `publish_complete_index`.

### Choice B - Preserve the warning

Player line:

> Preserve the warning. Seal the control grammar.

Confirmation:

```text
Everyone will know what happened and what may return.
No living reader will retain the complete method.
The strongest defense may be lost with it.

PRESERVE THE WARNING
```

Lumii response:

> You are preserving the fear without the answer.

Internal ID: `seal_operational_grammar`.

### Choice C - Divide custody

Player line:

> Divide the Archive. Require both civilizations.

Confirmation:

```text
One Meridian reader and one Oru reader must consent.
Neither civilization can use the method alone.
Neither public can inspect the complete method.

ESTABLISH TWO-READER CUSTODY
```

Lumii response:

> Then trust becomes part of the mechanism.

Internal ID: `establish_dual_custody`.

All three choices are defensible and costly:

- Publish maximizes scrutiny and shared warning while making proliferation
  irreversible.
- Preserve the warning prevents immediate possession while weakening the best
  available defense and inviting later reconstruction without proof.
- Divide custody makes affected-party consent operational while concentrating
  knowledge in a small institution that may fracture under pressure.

## 10. Immediate Civilization Resolution

Use the shared deterministic `CivilizationResolutionRequest` pipeline:

- source: `{ sourceType: "chronicle", sourceId: "chronicle_recurrence" }`
- form: `contextual`
- timing: `trigger_window`
- pressure tags: `exposure`, `transformation`
- uncertainty: represented in authored evidence, with no random roll in v1

All three trajectories remain available. Capability, Affinity identity,
Stability, and Conditions must be inspectable context, but none may silently
remove a custody choice. This first Knowledge test concerns the disposition of
dangerous information, not whether the player drew a correct card.

Record one scenario condition on each participant:

| Choice | Meridian Houses condition | Oru condition |
|---|---|---|
| Publish | `chronicle:recurrence_open_index` | `chronicle:recurrence_public_grammar` |
| Preserve warning | `chronicle:recurrence_warning_custody` | `chronicle:recurrence_command_boundary` |
| Divide custody | `chronicle:recurrence_meridian_reader` | `chronicle:recurrence_oru_reader` |

These Conditions are historical state, not automatic Stability penalties.
Apply Stability pressure only when an authored outcome produces physical loss,
institutional fracture, isolation, or disruption.

## 11. Six Primary Outcomes

Every outcome completes The Recurrence. Baseline entitlements are identical.
The custody method determines Knowledge evidence and the surviving form of the
Deep Index. Victory or defeat determines which civilization establishes the
reference defense and the continuing condition of both societies.

### 11.1 Publish + victory - The Open Index

Outcome ID: `recurrence_published_victory`.

The Meridian Houses complete the corrected shield under public, adversarial
review. The Oru retain their memory and gain permanent standing in the
evidentiary courts. Copies of the command grammar spread beyond any one
institution's power to recall them.

Lumii:

> They kept their memories.
>
> The command that once erased them now belongs to everyone.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `published_complete` |
| `chronicle.recurrence.v1:archive_disposition` | `public_complete` |
| `chronicle.recurrence.v1:knowledge_custodian` | `distributed_public` |
| `chronicle.recurrence.v1:meridian_condition` | `open_index_civic` |
| `chronicle.recurrence.v1:oru_condition` | `auditing_partner` |
| `chronicle.recurrence.v1:white_return_resolution` | `meridian_reference_verified` |
| `chronicle.recurrence.v1:returning_record` | `open_warning` |

### 11.2 Publish + defeat - The Unbounded Grammar

Outcome ID: `recurrence_published_defeat`.

The Oru establish an independent defense before the Meridian response is
ready. Both civilizations survive, but uncontrolled copies of the Deep Index
accelerate attempts to recover and repurpose the command grammar. The Oru
withdraw behind audited signal boundaries while the Houses fracture over their
founding history.

Lumii:

> No one owns the truth.
>
> No one owns what it can now become.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `published_complete` |
| `chronicle.recurrence.v1:archive_disposition` | `public_complete` |
| `chronicle.recurrence.v1:knowledge_custodian` | `distributed_public` |
| `chronicle.recurrence.v1:meridian_condition` | `fractured_disclosure_compact` |
| `chronicle.recurrence.v1:oru_condition` | `autonomous_shield_steward` |
| `chronicle.recurrence.v1:white_return_resolution` | `oru_reference_unbounded` |
| `chronicle.recurrence.v1:returning_record` | `open_warning` |

### 11.3 Preserve warning + victory - The Warning Without A Key

Outcome ID: `recurrence_sealed_victory`.

The Meridian Houses build a less efficient defense from the warning and their
own operational capabilities. The core cities and the Oru survive, while
several exposed Meridian settlements are lost. The Keepers of the Blank retain
the authenticated record of the erasure and the visible shape of the removed
relation, but not the command grammar itself.

Lumii:

> They survived without repeating the erasure.
>
> They will have to trust that the missing answer deserved to remain missing.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `warning_sealed` |
| `chronicle.recurrence.v1:archive_disposition` | `warning_only` |
| `chronicle.recurrence.v1:knowledge_custodian` | `keepers_of_the_blank` |
| `chronicle.recurrence.v1:meridian_condition` | `scarred_shelter_network` |
| `chronicle.recurrence.v1:oru_condition` | `uncommanded_neighbor` |
| `chronicle.recurrence.v1:white_return_resolution` | `meridian_reference_conventional` |
| `chronicle.recurrence.v1:returning_record` | `censored_absence` |

### 11.4 Preserve warning + defeat - The Empty Interval

Outcome ID: `recurrence_sealed_defeat`.

The Oru derive an independent defense. The Meridian Houses' incomplete shelters
fail along the outer twilight, fragmenting several Houses and making the sealed
grammar look less like restraint than theft. The Oru shelter survivors but
refuse access to their new defense. The warning remains authenticated; the
method remains absent.

Lumii:

> You left them a warning and no proof.
>
> Defeat made the absence look like a lie.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `warning_sealed` |
| `chronicle.recurrence.v1:archive_disposition` | `warning_only` |
| `chronicle.recurrence.v1:knowledge_custodian` | `keepers_of_the_blank` |
| `chronicle.recurrence.v1:meridian_condition` | `twilight_fragmentation` |
| `chronicle.recurrence.v1:oru_condition` | `refuge_steward` |
| `chronicle.recurrence.v1:white_return_resolution` | `oru_reference_independent` |
| `chronicle.recurrence.v1:returning_record` | `censored_absence` |

### 11.5 Divide custody + victory - The Two-Reader Dawn

Outcome ID: `recurrence_conditional_victory`.

The Meridian Houses establish the reference shield only after an Oru reader
accepts the final configuration. Both civilizations survive with limited loss.
The Two Readers Compact becomes a standing institution: neither civilization
can use or disclose the complete grammar without the other's participation.

Lumii:

> Neither could use the answer without being answered by the other.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `dual_custody` |
| `chronicle.recurrence.v1:archive_disposition` | `conditionally_disclosed` |
| `chronicle.recurrence.v1:knowledge_custodian` | `two_readers_compact` |
| `chronicle.recurrence.v1:meridian_condition` | `answerable_custodian` |
| `chronicle.recurrence.v1:oru_condition` | `veto_partner` |
| `chronicle.recurrence.v1:white_return_resolution` | `joint_reference_meridian_led` |
| `chronicle.recurrence.v1:returning_record` | `split_warning` |

### 11.6 Divide custody + defeat - The Withheld Half

Outcome ID: `recurrence_conditional_defeat`.

The Oru establish an independent defense from their own substrate while the
Meridian reader delays final consent to the shared method. The custody
mechanism prevents unilateral use, but mutual trust fractures. Each
civilization retains one complementary record. The Compact survives as a
contested necessity rather than a reconciled partnership.

Lumii:

> The mechanism held.
>
> Their trust did not.

Facts:

| Key | Value |
|---|---|
| `chronicle.recurrence.v1:custody_method` | `dual_custody` |
| `chronicle.recurrence.v1:archive_disposition` | `conditionally_disclosed` |
| `chronicle.recurrence.v1:knowledge_custodian` | `two_readers_compact` |
| `chronicle.recurrence.v1:meridian_condition` | `delayed_compact` |
| `chronicle.recurrence.v1:oru_condition` | `defense_steward` |
| `chronicle.recurrence.v1:white_return_resolution` | `oru_reference_independent_bounded` |
| `chronicle.recurrence.v1:returning_record` | `split_warning` |

## 12. Hidden-Dimension And Lumii Memory Authoring

Victory and defeat never reverse the epistemic meaning of the custody method.

| Custody method | Knowledge contribution | Rationale key | Lumii memory | Valence |
|---|---:|---|---|---:|
| Publish | support 2 | `recurrence_distributed_dangerous_truth` | `recurrence.accepted_irreversible_disclosure` | `0` |
| Preserve warning | pressure 2 | `recurrence_preserved_warning_without_method` | `recurrence.chose_warning_without_answer` | `0` |
| Divide custody | support 1 | `recurrence_shared_conditional_access` | `recurrence.made_consent_part_of_access` | `+1` |
| Divide custody | pressure 1 | `recurrence_bounded_operational_access` | same event; do not duplicate memory | - |

`support` is disclosureward evidence and `pressure` is containmentward evidence
under the current ledger vocabulary. Conditional access deliberately records
both kinds of evidence. It must not be flattened into a neutral zero or treated
as the hidden correct answer.

The memory detail records the exact custody method and outcome ID. It remains
account-sealed. The client may receive authored dialogue selected by the
server, but it must not receive raw contribution magnitudes, sealed rationale
keys, relationship valence, or future-return eligibility.

The Recurrence contributes no Agency or Plurality score. The Oru remain
individually legible in every outcome, but that fact is not pre-scored as the
later Plurality calibration.

## 13. Basilisk-Era Return Contract

The Recurrence must leave one exact return form in primary history. Later
content may transform it but cannot substitute another branch's archive.

| Primary archive disposition | Later usable form | Strength | Risk |
|---|---|---|---|
| `public_complete` | Open Warning | Distributed scrutiny and many independent witnesses | More capable readers can reconstruct dangerous relations |
| `warning_only` | Censored Absence | The warning and the fact of deliberate removal remain recognizable | Skeptics may reconstruct the missing method without its original caution |
| `conditionally_disclosed` | Split Warning | Reconstruction requires consent across two civilizations | Estrangement, loss, or isolation of one reader can make the warning unusable |

The later return may acknowledge victory-specific conditions, such as House
fragmentation or Oru withdrawal, but these three forms remain the principal
contract.

The initial Chronicle must not explain the Basilisk, imply that the Deep Index
contains it, or tell the player which return form will later be most useful.
The return demonstrates a general truth: deleting an answer can also delete the
warning that should accompany its rediscovery.

## 14. Entitlements, Lume, And Progression

All six outcomes grant the same baseline entitlement:

```ts
{
  kind: "archive_record",
  entitlementId: "chronicle_recurrence",
  competitivePower: false,
}
```

No outcome grants a Blueprint, Affinity, Eminence, starting resource, account
power, or exclusive principal Chronicle. No expression entitlement is required
for v1.

Primary completion:

- records victory or defeat once;
- awards historical Lume under the Civilization Record policy;
- unlocks The Triangulation when that Chronicle is shipped;
- contributes authored facts, Knowledge evidence, and Lumii memory;
- grants the Insight if the preparedness objective was met.

If The Triangulation is not shipped, the Archive says:

```text
CURRENT CHAPTER COMPLETE
THE NEXT RECORD IS NOT YET AVAILABLE
```

It must not show a broken launch action or imply an undisclosed gate.

## 15. Archive Rehearsal

After primary completion, replay is explicitly labeled:

```text
ARCHIVE REHEARSAL
COUNTERFACTUAL MODEL - PRIMARY HISTORY WILL NOT CHANGE
```

A Rehearsal may:

- use any of the three custody choices;
- show alternate outcome art and dialogue;
- earn the Recurrence Calibration Insight if it was missed;
- add one zero-valence `recurrence.rehearsal_observed` Lumii memory marked
  `simulation: true`;
- grant later-approved non-power codex or presentation rewards.

For Insight purposes, a successful Rehearsal means a completed Rehearsal in
which `preparednessObjectiveMet === true`; match victory is not required.

A Rehearsal may not append historical facts, Knowledge contributions,
historical Lume, competitive power, Civilization Records, or a second returning
archive form. Its end card always links back to the immutable primary record.

## 16. Recurrence Establishment Beat

After the outcome line, Lumii establishes the second calibration signal:

> This Domain has no path to Vey.
>
> Yet the distinction survived the horizon.
>
> I can recognize it again.

Then show:

```text
RECURRENCE STABLE
HISTORY RECORDED
```

On Rehearsal replace `HISTORY RECORDED` with `COUNTERFACTUAL COMPLETE`.

Recurrence names the successful generalization of the mutual interpretive
model. It is not a temporal loop, a natural Affinity, the Phoenix Paradox
Luminary, or the Luminary effect `Eternal Recurrence`. Code, assets, analytics,
and audio must use a `chronicle_recurrence` namespace to prevent collisions.

## 17. Runtime State Contract

Add a shared, versioned scenario state rather than scattering booleans through
the game page:

```ts
type RecurrenceCustodyMethod =
  | "publish_complete_index"
  | "seal_operational_grammar"
  | "establish_dual_custody";

type RecurrenceScenarioPhase =
  | "setup"
  | "playing"
  | "awaiting_custody"
  | "custody_resolved"
  | "finished";

type RecurrenceOutcomeId =
  | "recurrence_published_victory"
  | "recurrence_published_defeat"
  | "recurrence_sealed_victory"
  | "recurrence_sealed_defeat"
  | "recurrence_conditional_victory"
  | "recurrence_conditional_defeat";

interface RecurrenceScenarioState {
  chronicleId: "chronicle_recurrence";
  scenarioId: "chronicle_recurrence_v1";
  definitionVersion: 1;
  runKind: "primary" | "rehearsal";
  architectPlayerId: string;
  autonomousPlayerId: string;
  phase: RecurrenceScenarioPhase;
  architectCoreActionCount: number;
  custodyDueAfterCoreActions: number;
  custodyMethod: RecurrenceCustodyMethod | null;
  custodyResolvedAtTurnCount: number | null;
  preparednessObjectiveMet: boolean;
  preparednessArtifactId: string | null;
  outcomeId: RecurrenceOutcomeId | null;
}
```

Store this inside authoritative game-state JSON and project only public fields.
The server-owned Chronicle registry holds participant names, controllers,
facts, memory authoring, and outcome definitions.

### State invariants

1. `custodyMethod` changes from `null` exactly once.
2. Only `architectPlayerId` may resolve the choice.
3. The action is idempotent for the same method and rejects a different second
   method.
4. AI action, timer expiry, and turn handoff are blocked while
   `phase === "awaiting_custody"`.
5. Reconnection restores the exact pending choice or post-choice state.
6. A finished Chronicle cannot lack a custody method. If a terminal condition
   is reached early, closure pauses behind the custody window.
7. `preparednessObjectiveMet` can move only from false to true.
8. Client-supplied facts, dimensions, memories, and outcome IDs are never
   trusted.
9. The scenario state contains no sealed later-return evaluation or hidden
   Blueprint identity.

## 18. Server Flow

### Start or resume

1. Authenticate the account.
2. Require a primary Trace outcome.
3. Derive `primary` or `rehearsal` from existing Recurrence history; do not
   accept a client-selected run kind.
4. Return an active matching Chronicle room idempotently.
5. Create two players and explicitly declare their story controllers.
6. Initialize a normal campaign game, apply the authored Forge setup, disable
   Blueprints, seed participant Civilization metadata, and persist
   `RecurrenceScenarioState`.
7. Never create a primary outcome merely because a room was created or opened.

### During play

1. After each successful Architect Forge, inspect canonical capability metadata
   and lock preparedness if eligible.
2. Increment Architect core-action count after a legal core action fully
   resolves.
3. When due, queue custody behind all mandatory presentations and hold the turn
   transition.
4. Resolve the choice through the room lock and shared Civilization event
   engine.
5. Broadcast the new public scenario and Civilization state.

### Closure

1. Determine authoritative match result from the existing finish pipeline.
2. Combine result with persisted custody method to derive one of six outcome
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

## 19. Civilization Closure Requirements

Low-level values are implementation data, but they must satisfy these locked
semantics:

| Outcome family | Meridian continuity | Knowledge condition | Oru continuing condition |
|---|---|---|---|
| Publish victory | integrated | complete Index irreversibly public | auditing partner |
| Publish defeat | viable but institutionally fractured | complete Index irreversibly public | autonomous shield steward behind signal boundaries |
| Preserve victory | scarred but integrated | authenticated warning survives without method | uncommanded neighbor |
| Preserve defeat | twilight Houses fragmented | censored absence becomes contested | refuge and defense steward |
| Conditional victory | integrated with limited loss | complete access requires two readers | veto partner |
| Conditional defeat | strained compact | split archive remains operable but contested | defense steward and complementary reader |

Do not model disclosure, secrecy, or conditional access itself as a Stability
bonus or penalty. Apply pressure only from concrete loss, fracture, isolation,
disruption, or institutional failure. Historical Maturity does not regress.
Current Reach may become degraded or fractured where authored.

Damage or Annihilation, if later added through balance implementation, must
affect operational implementations without deleting discovery, historical
mastery, earned Eminence, the Deep Index disposition, or the primary record.

The Oru remain a separate civilization in every record. The command grammar
must never be represented as ownership of the Oru.

## 20. Visual And Audio Direction

### Marketable visual read

The trailer-readable image is Eido filling the lower frame: a white star burns
at one edge, Meridian cities form a thin amber-and-teal line across the
twilight, and cyan Oru currents move beneath black-violet nightside ice. The
Deep Index appears as a dark glass archive aperture within the ice, surrounded
by authenticated white record lines.

The custody choices produce distinct visual grammar:

- Publish: record lines branch into many readable copies across both
  civilization portraits; the grammar remains visibly impossible to recall.
- Preserve warning: inner operational lines collapse to black while an outer
  warning ring and checksum remain bright.
- Divide custody: the Index separates into cyan and amber halves connected by
  an incomplete relation that illuminates only when both are present.

Use one authored base environment plate, one integrated and one fractured
closure treatment, and composited archive/condition overlays. Do not require
six full environment paintings.

### Performance contract

- authored bitmap environment plates;
- capped SVG or CSS record lines using transforms and opacity;
- no live 3D, particle field, animated mask stack, or continuously recalculated
  layout;
- one mounted Lumii constellation with the tutorial's white central orb;
- no live Luminary bodies inside the Civilization portrait;
- pause ambient motion while the browser tab is hidden;
- mobile-specific crop and choice composition, not a scaled desktop scene;
- reduced motion replaces branching travel with stepped illumination while
  preserving every cause-and-effect beat.

### Audio palette

The Chronicle uses the existing adaptive score plus a restrained scenario
layer:

1. **Eido arrival:** low subglacial harmonic, brittle distant ice, and a slow
   stellar pulse.
2. **White Return countdown:** one additional pulse layer as custody approaches.
3. **Preparedness complete:** a short signal is stated, independently checked,
   and answered.
4. **Deep Index reveal:** Lumii's six-tone signal followed by a dry glass
   inversion and near-silence beneath the choice.
5. **Publish:** the motif spreads into many separated, readable voices.
6. **Preserve warning:** upper information tones disappear while the warning
   pulse remains.
7. **Divide custody:** cyan and amber call-and-response phrases lock only on the
   final interval.
8. **Recurrence stable:** Lumii's six-tone motif returns in an unrelated timbre,
   then resolves into the same final relation used for Trace.

No voice recording is required. Mute remains available. Scenario audio assets
must not share names or lifecycle keys with Phoenix Paradox or `Eternal
Recurrence`.

## 21. Presentation Policy

Essential story beats are protected, not every normal animation:

- Arrival, Deep Index disclosure, selected custody consequence, outcome, and
  Recurrence establishment remain legible on the first primary run.
- Static cinematic phases may advance with one click or tap after a short input
  guard.
- Consequential choices require authored buttons and confirmation.
- Saved `Skip cinematics` may shorten already-seen setup but cannot skip the
  custody choice or its immediate consequence.
- Saved reduced motion preserves sequence, evidence, and sentence-by-sentence
  Lumii speech while reducing travel, flashes, parallax, and ice movement.
- Ordinary Forge, Encryption, and nonessential repeat animations continue to
  honor normal preferences.

The Chronicle HUD must never show hidden-axis labels, internal custody IDs,
future Basilisk utility, or an unexplained numerical meter.

## 22. Privacy And Projection

The server owns the Deep Index disposition and authored outcome.

- Public game state may expose the current scenario phase, visible objective,
  objective completion, and selected custody posture after confirmation.
- Raw Knowledge contributions, Lumii valence, later-return evaluation, and
  sealed rationale keys remain account-private or sealed.
- The client submits only a recognized custody method, never consequences.
- No Blueprint ID, recipe, asset path, sound name, or inaccessible UI metadata
  may imply that the Deep Index is a Blueprint or reveal post-Vault content.
- Opponent or spectator projections must not receive account-sealed Trace
  memories used to choose opening dialogue.

## 23. Validation And Release Gates

### Contract tests

- exactly three recognized custody methods;
- exactly six authored outcomes;
- each method maps deterministically to victory and defeat;
- baseline entitlements are identical across all outcomes;
- Publish authors one disclosureward contribution;
- Preserve warning authors one containmentward contribution;
- Divide custody authors both contributions without duplicating Lumii memory;
- no outcome authors Agency or Plurality contributions;
- the scenario namespace cannot collide with Phoenix recurrence state.

### Scenario tests

- only the Architect may resolve custody;
- the same choice retries idempotently and a different second choice returns a
  conflict;
- AI, timers, turn handoff, and game closure pause during the custody window;
- pending Forge, Summon, effect, and turn-order presentations finish first;
- reconnect restores setup, pending choice, resolved choice, and closure;
- early victory still requires custody resolution before completion;
- qualifying capability Forge locks preparedness exactly once;
- later Damage or Annihilation does not revoke preparedness;
- Blueprints remain disabled and no Deep Index state enters Blueprint logic.

### Campaign tests

- Recurrence requires a primary Trace outcome but not Trace victory or Insight;
- first completion writes one immutable primary outcome;
- victory and defeat both unlock shipped Triangulation content;
- Rehearsal requires a primary outcome;
- Rehearsal writes no historical facts, dimensions, Lume, power,
  Civilization Record, or returning archive form;
- missed Insight can be earned in a completed Rehearsal;
- Insight never gates Triangulation or the Threshold;
- Recurrence Insight reveals only permanent first-seal deactivation;
- unavailable Trace detail uses neutral copy and never blocks a valid legacy
  account.

### Record and privacy tests

- both participant civilizations receive separately typed primary Records;
- archive disposition, knowledge custodian, and returning record are preserved;
- Oru history is never stored as a Meridian implementation or Project;
- hidden contribution magnitudes and relationship valence remain absent from
  public REST, WebSocket, logs, analytics, audio, and UI projections;
- Deep Index state leaks no Blueprint identity or recipe;
- legacy state is marked unavailable rather than fabricated.

### Visual and accessibility tests

Capture Playwright screenshots and interaction traces for:

- arrival on desktop and mobile;
- ordinary board with compact Chronicle strip;
- objective incomplete and complete;
- all three choice previews;
- full and reduced-motion custody consequences;
- all six outcome cards;
- primary and Rehearsal completion;
- reconnect during `awaiting_custody`;
- multiple summoned Luminaries active on the real board.

Verify no clipping, scrolling requirement on a normal portrait phone, board
occlusion, text overflow, duplicate Lumii, white flash, confusing use of the
Phoenix motif, or frame-instability regression.

### Balance and human gates

Before `released: true`:

- test at least 500 deterministic authored-seed simulations after an eligible
  AI policy exists;
- first-attempt victory must not be a hidden progression requirement;
- median human session target is 12 to 18 minutes;
- every run must give a reasonably attentive player a legal preparedness
  opportunity;
- human testers must be able to explain the tradeoff among public disclosure,
  warning-only containment, and dual custody without seeing the Knowledge axis;
- no choice may be consistently described as the obviously correct answer;
- testers must understand that the Deep Index is local history, not a Blueprint
  or Vault key;
- at least one primary defeat and one successful Rehearsal must complete in a
  production-like browser session;
- no material endgame frame loss may be introduced by the Chronicle layer.

## 24. Implementation Sequence

The remaining Recurrence work no longer requires unresolved narrative or
campaign-architecture design. Implement in this order:

1. shared Recurrence IDs, state, action, capability set, and outcome mapper;
2. server-owned Chronicle definition with six outcomes, mixed conditional
   Knowledge contributions, facts, and memory authoring;
3. scenario start/resume service and deterministic board fixture;
4. backend action count, preparedness check, held custody window, and
   Civilization resolutions;
5. server-owned six-way closure, two Civilization Records, and Chronicle
   completion wiring;
6. compact Chronicle strip and reconnect-safe decision UI;
7. preview route with phase, custody, result, viewport, motion, and audio
   controls;
8. authored Eido plates, low-cost archive overlays, and scenario audio;
9. unit, integration, visual, simulation, and human validation;
10. set release flags only after every gate passes.

No native app repackaging is part of this sequence.

## 25. Locked Decisions Versus Tunable Constants

### Locked by this specification

- Eido, the Meridian Houses, the Oru Current, the White Return, and the Deep
  Index premise;
- two real civilizations and their controller ontology;
- the prior shield's erasure of three Oru memory generations;
- the unverified correction sharing the coercive operational grammar;
- Publish, Preserve warning, and Divide custody as the three choices;
- six fail-forward primary outcomes;
- public archive, censored absence, and split archive as later return forms;
- Knowledge and Lumii memory semantics, including mixed conditional evidence;
- outcome-invariant rewards;
- Independent Reader objective and permanent-first-seal disclosure;
- primary/Rehearsal separation;
- deterministic contextual choice with no second economy or hidden random roll;
- visual, audio, privacy, and performance architecture;
- explicit separation from Blueprints, the Basilisk, Phoenix Paradox, and
  `Eternal Recurrence`.

### Tunable without reopening high-level design

- victory requirement;
- AI difficulty and policy weights;
- exact authored Forge order;
- number of Architect core actions before custody;
- low-level Stability magnitudes and Reach consequences, provided they preserve
  Section 19;
- Lume amount under the existing assessment policy;
- animation durations, audio mix, crops, and responsive layout;
- final line-level copy polish that preserves meaning.

The Recurrence is now bounded implementation, balance, presentation, and
validation work. The Triangulation's implementation-ready contract is defined
in `LUMINAe_CHRONICLE_THE_TRIANGULATION_VERTICAL_SLICE_v1.0.md`.
