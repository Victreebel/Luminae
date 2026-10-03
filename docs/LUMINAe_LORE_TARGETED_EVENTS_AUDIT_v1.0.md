# LUMINAe Lore-Targeted Events Audit v1.0

Date: 2026-09-26

Implementation update (2026-09-27): the complete 90-Artifact mechanical review,
explicit dependency registry, inspectable rules, and two unpublished pilots are
now implemented. See [the catalog review](LUMINAe_ARTIFACT_EVENT_COMPATIBILITY_AUDIT_v1.0.md)
and [implementation record](LUMINAe_LORE_EVENT_IMPLEMENTATION_v1.0.md).
The original findings below describe the earlier working tree. In particular,
the historical damage-normalization issue is fixed, and the owner's later rule
explicitly preserves Affinity bonuses while damaged. The new pilots use frozen
resolution plans; general Events retain their existing resolution path.

Status: Design recommendation based on the current working tree. This audit
does not adopt new canon, change Artifact wording, enable new Event cards, or
change story availability. Event concepts below are design examples, not
approved narrative copy or balanced card definitions.

## Decision

Proceed with lore-informed Event targeting, using authored technological facts
and the existing Civilization capability catalog. Defer the first substantial
lore-targeted Event pack until an authored post-Vault learning experience is
available. Keep the current general Event pool as the introductory layer.

The desirable payoff is that understanding an Artifact lets a player anticipate
how the world will interact with it. The Event draw can surprise; target
eligibility should be consistent, inspectable, and explainable. Lore knowledge
should reduce the need to consult the rules, not confer an account flag that
changes those rules or require memorizing decorative prose to avoid punishment.

This reinforces visible consequence, coherent mystery, and the importance of
civilizations' actual capabilities. It becomes a poor fit if it turns into
hidden trivia penalties, forces a particular Vault decision, or changes rich
lore into a collection of vulnerability labels.

## Existing foundation and audit scope

The shared registry already supplies the central mechanism:

- All 90 Artifact IDs have explicit capability assignments. Eighteen have one
  capability and 72 have two, drawn from 32 defined capabilities.
- The registry expressly calls these assignments Event-resolution hooks.
- The adopted doctrine derives them from practical capability, permits
  cross-Affinity equivalence, and activates responses only for operational
  implementations.
- Stellar Containment Cascade already uses operational capability coverage to
  produce asymmetric outcomes and report responding Artifacts.
- The Event presentation and automatic resolution sequence already exist.

The audit checked registry coverage and distributions across all 90 IDs, read
the governing lore/story/capability contracts, examined representative semantic
edge cases, and traced the Event preview, commit, lifecycle, and public projection
paths. It did not recertify every sentence of all 90 Artifact histories. A full
prose rewrite is neither necessary nor justified by this proposal.

Sources: [capability registry](../lib/game-types/src/civilization-capabilities.ts),
[capability doctrine](LUMINAe_CIVILIZATION_ARTIFACT_CAPABILITIES_v1.0.md),
[shared technology metadata](../lib/game-types/src/technology.ts), and
[Event engine](../artifacts/api-server/src/lib/gameEngine.ts).

## Meaning of the targeting data

Keep these concepts separate:

| Concept | Question | Recommended treatment |
|---|---|---|
| Practical capability | What does this Artifact actually enable? | Canonical fiction and authority for classification. |
| Response capability | How can this implementation respond or exploit an opportunity? | Reuse the existing 32 capability IDs. |
| Exposure or dependency | Why would this particular phenomenon affect it? | Add explicit, narrowly justified facts only when a selected Event needs them. |
| Current state and location | Is it operational, damaged, archived, an unmastered Forge pathway, or encrypted? | Evaluate separately from class identity. |
| Mystery or provenance | What might its origin or unexplained behavior mean? | Preserve narrative uncertainty; do not silently convert it into a mechanical fact. |

A capability can select a beneficiary or a function affected by an Event when
that relationship is credible. It does not, by itself, prove vulnerability.
For example, hazard containment is not evidence that an Artifact leaks hazards.

Artifacts are translated capability classes with potentially very different
local embodiments. A metallic illustration cannot justify making every local
implementation susceptible to a metal-corroding phenomenon. Prefer functional
properties that remain true across embodiments. If a physical exposure requires
an actual implementation choice, defer it until that choice is represented in
game state; a cosmetic skin must not select a different competitive weakness.

Do not infer eligibility from names, flavor keywords, art, visual `trait` or
`motif`, `artifactForm`, `civLane`, future Blueprint families, or inherited
lineage. Those fields can support an author's review, but are not runtime rules.
Do not add a universal text parser, semantic model, or general tag query language.

The existing capability vocabulary is closed. Additions need the canon review
required by its doctrine. A future separate exposure vocabulary must likewise
justify each fact and must not become a back door for relabeling every card.

### Concrete checks

| Artifact | Current evidence | Consequence for Event design |
|---|---|---|
| Ashroot Bloom, `t1r02` | Flare; post-burn ecological recovery; `ecological_recovery`. | It can respond to ecological aftermath despite its Affinity. Lore already adds information beyond color. |
| Petrified Bloom, `t1p08` | Ecology lineage; preserved life-pattern reference; `memory_preservation`. | An ecological history does not establish vulnerable living tissue. |
| Solar Immune Organ, `t2e01` | Radiation adaptation; `ecological_adaptation`. | A radiation Event should consider its response before treating it as generically vulnerable biological machinery. |

These are semantic examples, not promises of universal immunity or newly
assigned exposures. Their effective lore comes from
[cardLore.ts](../artifacts/api-server/src/lib/cardLore.ts) and the shared registry.

## Smallest useful implementation

Extend the existing Event resolver with a few typed, explicit selectors when
the first pilot is built. Keep definition, selection, effects, and presentation
separate; do not build a second Event system.

Each authored Event needs the following contract:

1. **Availability:** Event ID and rules version, deck tier, and the match or
   authored-encounter content profile in which it can appear.
2. **Eligibility:** Explicit zone, lifecycle states, capability or reviewed
   exposure IDs, and simple declared matching semantics. Start with one
   capability selector; introduce combinations only for a demonstrated need.
3. **Selection:** All eligible players are evaluated. State whether the cap is
   per player or global, the deterministic tie order, and what happens when
   zero targets exist. No eligible target is a valid result, not permission to
   strike an unrelated Artifact.
4. **Response and consequence:** Which existing capabilities mitigate or exploit
   the phenomenon, the bounded outcome, duration, recovery, and any exact
   exceptions. Do not derive magnitude from an ominous-sounding label.
5. **Causal evidence:** The selected public Artifact IDs, matched fact, response,
   and resulting change. Record why an otherwise plausible candidate was
   unaffected when that distinction matters to comprehension.
6. **Resolution stability:** Freeze eligibility and responses from one pre-Event
   snapshot before applying consequences. Define scarce-resource allocation and
   shared-board ordering explicitly. An earlier player's mutation must not
   silently change another player's susceptibility.

Use stable Artifact IDs and shared typed capability IDs. If a new exposure is
required, keep a small authored registry with its definition, source evidence,
reviewed memberships and exclusions, and version. Review all 90 cards for each
new exposure, distinguishing reviewed exclusion from unresolved classification.
Unreviewed membership blocks publication of that selector; it must not grant
accidental immunity.

Do not retag an Artifact merely to reach a desired balance distribution. Fix the
Event's frequency, effect, cap, or alternative responses instead. Preserve exact
Blueprint component recipes and normal Forge prerequisites.

### Persistence and hidden information

The current Event preview runs on a cloned game state. Acknowledgement computes
the effects again under the action gate using the current definitions. For an
expanded targeting system, persist a versioned resolution plan or retain the
versioned resolver necessary to reproduce it. Store target IDs and causal
evidence so a deployment or reconnect cannot reinterpret a pending preview.
An ID named `rulesVersion` without a reproducible resolver/plan is insufficient.

The initial pilot should select only public operational implementations. Current
Event receipts are public and forwarded by
[stateProjection.ts](../artifacts/api-server/src/lib/stateProjection.ts).
Targeting encrypted hands, deck order, or private Blueprints requires a separate
privacy design: hiding an ID alone does not prevent an outcome or target count
from revealing secret category membership. Keep any future private resolution
plan separate from its viewer-specific receipt.

### Lifecycle integration gate

Do not ship a damaging Event by simply emitting a generic
`set_artifact_implementation: damaged` consequence. In the audited working tree,
`normalizeCivilizationState` promotes IDs still in the active forged tableau to
operational, while `effectiveAffinityBonuses` reads the separate bonus totals.
A lifecycle flag alone can be overwritten or leave an active economic bonus.

Before damage is used, verify or implement one atomic path covering lifecycle,
active tableau, bonuses, recovery, signature interference, Blueprint eligibility,
and the existing scoring/history rules. Test it through normalization and reload.
Damage suspends operation; it does not erase discovery. Annihilation and Foundry
storage have different meanings and cannot be substituted for it. Civilization
work is ongoing, so recheck this integration gate at implementation time.

## Player understanding and presentation

Keep practical rules inspectable before consequential commitments: a concise
Artifact inspector and the active Event-pool reference should expose the relevant
facts. There is no need to print 32 capability chips on every card. Deeper lore
can make those facts memorable and help players anticipate connections.

At activation, show the phenomenon, identify matched Artifacts, and explain the
specific cause and consequence. Keep that explanation available in Event history
after the cinematic. A player should be able to tell why one apparent peer was
affected and another was not without reading a wiki.

Retain the existing order: earlier effects settle, the Event card trembles and
comes forward, activation completes, then its explanation remains visible while
the unique effect highlights actual targets. Resolution and all Event/Chronicle
presentation must finish before later phases. Use authoritative target evidence
for both visuals and rules; animation must not independently guess eligibility.
Keep readable timing, reduced motion, and full meaning without audio.

The mystery may concern why the cosmic phenomenon exists. Its immediate
mechanical stakes must remain understandable. In competitive content, do not
hide a targeting fact solely because an account has not reached a lore scene.
If making the rule public would itself spoil a central revelation, keep that
Event in authored story content until a spoiler-safe, fair version exists.

## Introduction and progression

The post-Vault instinct is sound for a substantial new layer of causal reading.
It follows the progression from operating the interface to understanding what
the civilization has actually built. However:

- The current onboarding doctrine ends initial publication at the opened Vault
  hub. A later Event lesson belongs to future authored continuation, not an
  automatic launch-time unlock of nonexistent content.
- Withdrawal from Lumii's refusal is a valid story outcome. Access to baseline
  competitive rules or power must not reward overriding her boundary.
- Current Chronicles remove the random competitive Event pool. Introduce a
  pilot through an explicit authored encounter profile; do not inject random
  Events into protected Chronicle sequences.
- Story progression can control teaching order. Competitive matches must use
  one announced, versioned Event pool fixed at creation, with the same targeting
  rules for every player. No per-account immunities, unseen eligible pools, or
  mid-match insertions based on a participant's story progress.

### Recommended pilot

Begin with an authored opportunity that visibly responds to one existing
capability, rather than an unexpected loss of an Artifact. A transient signal
that can be interpreted by operational `artifact:signal_interpretation` sources
is a suitable candidate for design testing: the current catalog has eight such
Artifacts across four Affinities and all three tiers. Evaluate every player and
cap the benefit per player, avoiding a reward that scales with every matching
Artifact. Highlight the actual responders. This is a pilot concept, with final
reward and fiction still to be authored and balanced.

Those eight memberships establish a candidate response family, not universal
decoding ability. Select a phenomenon their precise practical capabilities can
credibly answer and review every inclusion; a broad capability label cannot
replace that semantic check.

After that proves understandable, introduce one recoverable threat with an
explicit exposure and at least one credible response route. Teach anticipation
in a forecast or rehearsal before placing that threat into consequential
history. Do not pretend an Event that has already activated offers a response
choice if the rules resolve it automatically; strategic counterplay occurs in
the earlier build and preparation decisions.

Keep deck escalation in impact rather than rule complexity: Planetary effects
should be small and local; Stellar effects can create recoverable pressure;
Galactic effects can reach several systems with explicit caps. No tier needs
hidden targeting, permanent knowledge erasure, or an unavoidable loss of every
recovery route to feel disruptive. Individual Events need not hit every player
equally, and a credible no-effect result should remain possible.

## Establish now versus defer

| Establish now | Defer until justified |
|---|---|
| The distinction between capability, exposure, state, and mystery. | A large exposure taxonomy or blanket lore relabeling. |
| Existing catalog coverage and an Event-first audit method. | Rewriting all 90 Artifact narratives. |
| The bounded selector, causal receipt, persistence, and shared-pool contracts above. | A generic query engine, multi-zone chains, or procedural semantic inference. |
| The launch/story boundary and competitive fairness rule. | Live post-Vault Event cards before their learning experience exists. |
| A public, automatic opportunity pilot specification. | Hidden-hand/deck targeting, spoiler-dependent predicates, and new response-choice systems. |
| Lifecycle and privacy integration requirements. | Damage, permanent removal, or history-altering effects before the relevant adapter is verified. |
| Reuse of the current presentation sequence and target evidence. | Bespoke audiovisual production for a large untested roster. |

This audit establishes the design recommendation now. The smallest next code
change should implement the selected pilot and its evidence path, not scaffold
all of these future possibilities at once. Build the content-profile/versioning
support with that pilot rather than adding dormant architecture independently.

## Balance and release evidence

Capability categories are semantic, not equally sized balance groups. Current
membership ranges from one to nine Artifacts. `controlled_shutdown` and
`secure_communication` each occur once; `failure_isolation` and
`evidence_verification` each occur nine times.

Selected coverage checks illustrate why an Event audit matters:

| Capability | Cards | Affinity distribution | Tier distribution |
|---|---:|---|---|
| Ecological recovery | 5 | Flare 1, Verdance 4 | I: 5 |
| Ecological adaptation | 4 | Verdance 4 | II: 2, III: 2 |
| Memory preservation | 8 | Continuum 5, Abyss 1, Radiance 1, Verdance 1 | I: 4, II: 4 |
| Signal interpretation | 8 | Radiance 4, Continuum 2, Flare 1, Abyss 1 | I: 3, II: 2, III: 3 |
| Information recovery | 2 | Abyss 1, Continuum 1 | I: 1, III: 1 |

Do not sample tags uniformly and assume the resulting Event pool is fair.
Measure expected impact using draw frequency, reachable implementations at that
stage, exposure, mitigation, caps, and recovery cost. Check concentration by
Affinity and by existing Blueprint component sets. Avoid double-penalizing a
specialized build through both Affinity Events and near-identical lore predicates,
or making one defensive Artifact mandatory. Positive opportunities also need a
check against making the current leader harder to catch.

Before expansion, the pilot must demonstrate:

- Players can predict eligible targets from inspected practical facts and can
  explain the result afterward, including plausible exclusions.
- Lore-invested players gain anticipation without others needing compulsory
  external reading; the initial explanation fits the existing cinematic pace.
- All memberships are reviewed, zero/one/many targets behave correctly, and
  disabled or unmastered cards cannot supply operational protection.
- Target ordering, caps, mitigation, resource conservation, and no-target results
  are deterministic. Preview, commit, reconnect, duplicate acknowledgement, and
  old-save behavior agree.
- An affected implementation's lifecycle, economy, history, and recovery remain
  coherent through normalization and reload.
- Public receipts do not disclose private state; Event/Chronicle sequencing and
  hidden-tab/reduced-motion behavior remain intact.

## Source cleanup and value boundaries

Some historical evidence is stale: the older Civilization metadata audit CSV
reports capability tags and shared runtime lineage as absent, and older Artifact
audits describe Tier III cards as complete megastructures. Effective Tier III
lore is overridden from the shared bounded-keystone registry in `cardLore.ts`.
Do not treat those old snapshots or pre-override literals as missing work or
canonical targeting facts. Mark/synchronize the affected historical references
when the pilot is implemented; preserve their provenance.

Technology v2's statement that Artifacts have only their existing gameplay-facing
properties needs a narrow clarification alongside a shipped targeting feature.
The later capability doctrine already permits contextual Event hooks. Clarify
that boundary rather than giving every tag a passive power or new prerequisite.

Do not literalize poetic prophecy: the Lore Bible prohibits backward information
transfer even where mystery text sounds prophetic. Do not make agency, plural
governance, or a player's treatment of Lumii a hidden moral score that determines
cosmic punishment. Protect approved lore and dialogue; author any new connective
lines as draft through the existing authorship process.

The relevant governing sources are:

- [Lore Bible](LUMINAe_LORE_BIBLE_v1.0.md): Artifact ontology, implementation
  loss, and limits on apparent prophecy.
- [Player Fantasy and Onboarding Doctrine](LUMINAe_PLAYER_FANTASY_AND_ONBOARDING_DOCTRINE_v1.0.md):
  comprehension, visible consequence, mystery with coherence, progressive
  disclosure, and the opened-Vault launch boundary.
- [Story Mode Framework](LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md): valid withdrawal
  and the purpose of the Threshold confrontation.
- [Chronicle Campaign Architecture](LUMINAe_CHRONICLE_CAMPAIGN_ARCHITECTURE_v1.0.md):
  equal baseline competitive entitlement across story outcomes.
- [Technology v2](LUMINAe_TECHNOLOGY_SYSTEM_v2.0.md) and
  [Capability Doctrine](LUMINAe_CIVILIZATION_ARTIFACT_CAPABILITIES_v1.0.md):
  bounded capabilities, exact recipes, and explicit response tags.
- [Dialogue Authorship Contract](LUMINAe_DIALOGUE_AUTHORSHIP_CONTRACT_v1.0.md):
  preservation of approved wording and draft status for new copy.

The historical milestone proposal retained beneath the current
[Event implementation notes](LUMINAe_EVENT_CARD_SYSTEM_PLAN_v1.0.md) also cautions
against memorizing decorative lore. It is supporting design history, not a
current rule that prohibits this proposal.
