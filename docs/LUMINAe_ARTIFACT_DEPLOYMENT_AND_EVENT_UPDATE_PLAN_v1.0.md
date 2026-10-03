# LUMINAe Artifact Deployment and Event Update Plan v1.0

Implementation update (2026-09-27): the lore compatibility layer now includes an
evidence-backed review of all 90 Artifacts, explicit reviewed targeting facts,
public inspection and causal receipts, and two unpublished Event pilots with
frozen resolution plans. See [the implementation record](LUMINAe_LORE_EVENT_IMPLEMENTATION_v1.0.md).
Independent deployments and per-scale Blueprint requirements remain deferred.
The substantial Event expansion and post-Vault lesson remain future authored
content; the pilot pool is not automatically enabled by account progression.

Date: 2026-09-26

Status: Proposed implementation plan requested by the project owner. This file
records the recommended work and acceptance criteria; it does not change live
rules, adopt new narrative copy, or authorize rewriting approved dialogue.

Related investigation:
[Lore-Targeted Events Audit](LUMINAe_LORE_TARGETED_EVENTS_AUDIT_v1.0.md).

Current priority update: the owner's subsequent request brings basic damage
Events forward. System Shock and Fracture Wave now use the existing single
implementation model and repair queue; see the current
[Event implementation](LUMINAe_EVENT_CARD_SYSTEM_PLAN_v1.0.md). Single-Artifact
operational Blueprint readiness is included in that integration. Independent
deployments and per-scale Blueprint requirements remain later work. The lore
targeting pilot and its frozen resolution plans are now implemented; expanding
that approach to the full Event catalog remains later work.

Owner correction: damage retains Affinity bonuses and excludes an Artifact from
new Blueprint and Legacy contributions until repaired. A further Legacy penalty
for prolonged damage is proposed but deferred until the Legacy rules, timing
unit, recovery behavior, and cap are designed. Do not add an economic damage
penalty or a duration formula as a substitute for that design. See the current
Event document's owner-correction section for the bounded Legacy integration.

## Intended result

Players can see a mastered technology remain relevant as their civilization
expands. Where credible, its applications appear at larger scales with a
recognizable visual identity. Events act on explicit operational facts, and
players can see why a particular implementation responded or suffered damage.

Later, a small number of independently modeled deployments can introduce useful
repair priorities. Blueprint construction requires its participating functions
to work, without requiring every unrelated application of a technology across
the civilization to be pristine.

## Recommended rules to preserve throughout

1. **Class, deployment, and view are different.** An Artifact identifies a
   capability class. A deployment is an actual operational realization. A
   camera view can show that deployment or its wider consequences.
2. **Presentation creates no liability.** Changing views, revealing a locator,
   or adding a decorative application creates no additional repair requirement.
3. **Plausibility controls representation.** Author supported scales per
   Artifact. Higher-scale presence represents adoption, infrastructure, or
   consequences, not an arbitrarily enlarged copy of the card illustration.
4. **One Artifact bonus remains one bonus.** Damage retains Affinity bonuses.
   Additional depictions and later deployments do not multiply Affinity bonuses,
   Eminence, mastery counts, or Blueprint component counts.
5. **Damage preserves discovery.** Repair restores operation. Damage, archival,
   annihilation, and Nullification retain their distinct meanings.
6. **Blueprint readiness is specific.** All required participating deployments
   must function. Unrelated deployments do not block construction. Existing
   exact component IDs remain the recipes.
7. **Completed Projects have their own state.** Later component damage does not
   dismantle or remanifest a Project unless an explicitly authored Project rule
   establishes an ongoing dependency.
8. **Events have inspectable causes.** Existing capability tags describe
   responses; exposure needs its own justified evidence. No runtime parsing of
   flavor, names, art, visual traits, or lore keywords.
9. **Everyone uses the same match rules.** Story teaches connections;
   competitive availability is a shared, announced profile fixed at match
   creation, not a per-account immunity or targeting modifier.
10. **Resolution stays sequential.** Prior effects settle before an Event starts;
    the Event's explanation, effects, and presentation finish before subsequent
    Event, Chronicle, Blueprint, or turn phases continue.

Camera scenes (`surface`, `orbit`, `stellar`, `galaxy`), Artifact/Event deck tiers
(Planetary, Stellar, Galactic), current operational Reach, historical Maturity,
and literal Kardashev Type must remain distinct. In particular, acquiring one
high-tier Artifact or opening a distant camera does not establish a whole new
operational civilization scale.

## Work order and release boundaries

| Stage | Deliverable | Release boundary |
|---|---|---|
| 1 | A small, credible set of higher-scale Artifact representations. | Can ship with the existing shared Artifact condition and existing gameplay rules. |
| 2 | Reliable damage/repair state transitions and stable Event previews. | Foundations ship after regressions pass; no new damaging Event enabled by this stage. |
| 3 | One public capability-based opportunity Event and an authored introduction plan. | Test in developer/controlled scenarios first; story release waits for appropriate content. |
| 4 | A bounded pilot of independently damageable deployments and centralized repair. | Experimental authored scenario only. |
| 5 | Blueprint readiness based on required operational deployments. | Experimental profile first; update canonical rules alongside a deliberate rollout. |
| 6 | Validated Event expansion and broader visual coverage. | Publish only reviewed, tested content profiles; old matches retain their original rules. |

Stages 1 and 2 can proceed independently after their file boundaries are agreed.
Stage 3 uses the stable Event path from Stage 2 and can proceed without Stage 4.
Stage 4 follows visual validation and lifecycle consolidation. Stage 5 depends
on Stage 4. The later story release is a separate dependency; it need not hold
up the initial visual improvement.

## Stage 1 — Show technological adoption across scales

**Expected visible outcome:** a technology retains its native installation and
recognizable identity, while appropriate wider views show its adoption or
effects. Selecting any representation opens the same Artifact dossier. Damage
to that Artifact remains consistent across all its representations.

Start with six contrasting examples: Ignition Kernel, Ashroot Bloom, Living
Chronicle, Mantlelift Driver Coil, Solar Immune Organ, and Mnemosyne Star-Index.
These exercise industry, ecology, archives, surface-to-orbit logistics, orbital
infrastructure, and system networks. They are a visual pilot, not six new cards.

For each, author a short presence table specifying:

- native representation and supported additional camera scenes;
- whether another scene shows a connected locator, distant consequence, or
  visible adoption of the same technology;
- the existing civilization evidence needed to show that adoption;
- a stable visual identity, geometric support, density limit, and damage cue;
- one sentence explaining why the representation is credible.

Use existing profiles and fields (`nonNativeRepresentationPolicy`,
`higherScaleConsequences`, `visibilityByCameraScale`) before introducing another
metadata system. Extend them only where an actual pilot requires a distinction.
Unreviewed Artifacts keep their current native representation. Do not imply
galactic adoption solely because a player opened the galactic camera; use
recorded development evidence and appropriate locators when reach is absent.

Implement the missing renderer consumption of those policies. Use bounded
instancing or shared visual treatments where appropriate, with authored
exceptions. The native physical placement remains stable; a distant
representation does not acquire a second gameplay identity. Portrait and Scan
must use the same source identity and placement evidence.

Primary files:

- [Shared manifestation profiles](../lib/game-types/src/artifact-manifestations.ts)
- [Artifact manifestation layer](../artifacts/luminae/src/components/CivilizationArtifactManifestationLayer.tsx)
- [Derived deployment sites](../artifacts/luminae/src/lib/civilizationDeploymentSites.ts)
- [Civilization panel](../artifacts/luminae/src/components/CivilizationScenePanel.tsx)

Acceptance: the six examples remain identifiable across their supported views;
unknown/unsupported reach does not imply new construction; selection and damage
are coherent; no extra bonuses or repair targets appear. Check desktop/mobile,
Portrait/Scan, reduced motion, sparse and saturated civilizations, and scene
transition performance. Intentionally update the old native-only rendering test
while preserving placement and physical-support checks.

Expand beyond the six only after visual review. If additional representations
cannot be made legible economically, retain a consequence or locator rather
than commissioning a full unique installation at every scale.

## Stage 2 — Consolidate lifecycle and Event resolution

The current working tree already has repair selection, a repair queue, and
end-of-turn restoration. Extend that path; do not create another repair action
or a second independently writable lifecycle model.

First reconcile the existing single-implementation transitions: operational,
damaged, archived, and annihilated. One authoritative transition must keep the
active tableau, bonuses, operational capability derivation, Conditions,
Stability, history, signature interference, and existing Project rules coherent.
Normalization/reload must preserve a valid damaged state instead of inferring
operation solely from an active-card list. Resolve matching damage Conditions
without counting the same harm twice.

Keep current repair timing and the existing test repair policy during this
work. Free test repair is not evidence that the production repair economy is
settled. Do not add costs or consume the core action merely while fixing state
consistency.

For Events, preserve automatic preview followed by acknowledged commit and the
current presentation gate. Freeze targeting and response evidence from one
pre-Event state. Prefer persisting a versioned effect plan containing the selected
targets, reasons, and bounded consequences; retain a versioned resolver only if
that is already practical. A version number alone is insufficient.
Acknowledgement cannot reinterpret an Event because content changed during a
deployment or reconnect. Keep any private plan separate from public receipts.

Add content-profile/rules-version persistence as part of this concrete Event
path. Preserve legacy pending Events and rematches. New defaults apply to new
matches; old matches do not silently gain new cards, penalties, or repair rules.

Primary files:

- [Shared state and derivation](../lib/game-types/src/index.ts)
- [Game engine](../artifacts/api-server/src/lib/gameEngine.ts)
- [Viewer projection](../artifacts/api-server/src/lib/stateProjection.ts)
- [API contract](../lib/api-spec/openapi.yaml) and generated API packages when required

Acceptance: damage and repair survive normalization/reload; Affinity bonuses
remain unchanged and operational capabilities transition once; archived/annihilated implementations cannot use normal
repair; repeated repair or Event acknowledgements are idempotent; preview and
commit agree; old saves remain playable; private information remains private.

## Stage 3 — Prove lore-based targeting with one opportunity

Use the existing capability catalog. Design one automatic Event that visibly
identifies public operational responders and gives a bounded benefit per player.
The transient-signal opportunity described in the audit is a candidate, not
final canon: review its concrete phenomenon against every proposed responder's
precise capability. Broad `signal_interpretation` membership does not prove
universal decoding ability.

The definition must state selector, location/lifecycle eligibility, target cap,
tie order, response, outcome, no-target result, and scarce-resource allocation.
Every player is evaluated under the same rule. Zero eligible targets is valid.
Do not add hidden-hand, deck-order, or private Blueprint targeting to this pilot.

Show the matched Artifact and plain causal reason in the activation explanation
and persistent Event history. Reuse the current tremble, lift, activation,
explanation/effect, and settlement sequence. Add a suitable unique visual/audio
profile only once the effect is fixed. Preserve readable pacing and equivalent
information in reduced motion and muted play.

Plan an authored introduction after the Vault learning sequence. Current launch
story ends at the opened Vault hub, so developer and controlled scenario testing
may proceed while the later Chronicle is unavailable. Do not insert random
Events into existing protected Chronicles or make overriding Lumii's refusal a
requirement for competitive completeness. Any new narrative remains draft.

Primary files: the Event definitions in shared types, existing game-engine
Event resolvers, [Cosmic Event overlay](../artifacts/luminae/src/components/CosmicEventPresentationOverlay.tsx),
[Event audio](../artifacts/luminae/src/lib/cosmicEventAudio.ts), and
[Event sequence gate](../artifacts/luminae/src/lib/cosmicEventSequenceGate.ts).

Acceptance: players can predict responders from inspectable facts and explain
the outcome; the receipt exposes no private information; all earlier animations
finish first and all later phases wait. Measure Affinity/tier/Blueprint-component
coverage before assigning Event frequency. Retain the original six general
Events while this candidate is experimental.

## Stage 4 — Pilot independent operational deployments

Proceed only if the visual pilot reveals a useful choice about protecting or
restoring one deployment rather than another. Start with a small authored
scenario: one technology, two credible operational deployments, one recoverable
disruption, and a visible unaffected application. Establish deployment through
an explicit scenario/development milestone, never by visiting a camera view.

Keep the model bounded: one aggregate deployment per authored operational role
and scale in the pilot, not individual damageable buildings. A deployment needs
a stable ID, parent Artifact ID, operational role, physical scope/placement,
lifecycle state, and transition provenance. Continue to store discovery/mastery
at the Artifact-class level. Renderers reference deployment IDs; their generated
screen positions never become server state.

Do not persist `CivilizationDeploymentSite` directly: it is a frontend display
model. Reconcile the existing Artifact record, manifestation assignments, and
generic Civilization entities to establish one authoritative ownership of
deployment lifecycle before adding fields. Migrate an existing Artifact to one
primary deployment, preserving its condition and placement; do not fabricate
unrecorded historical deployments.

Proposed pilot defaults:

- Only authored operational deployments can be targeted or repaired.
- Damage is scoped to the selected deployment. Other deployments retain their
  state. Locators and consequences merely reflect their source's state.
- Retain the normal Artifact Affinity bonus through damage, even if all
  deployments are damaged; repair never grants another copy of that bonus.
  Show partial deployment damage explicitly instead of presenting the whole
  class as lost. Separate archival and annihilation rules still apply.
- Scope response capabilities to the phenomenon's actual theater. A healthy
  remote deployment is not automatic protection for every location.
- Record damage and its matching Condition once. Do not multiply Stability
  pressure by the number of pictures or count both the class summary and its
  deployment as separate losses. Use an authored cap for pilot deployment damage.
- Keep the existing centralized repair queue. Permit selecting one deployment
  or all damaged deployments of a technology without navigating every scene.

Before enabling the pilot beyond developer scenarios, specify how existing
class-targeting effects, Foundry archival/recovery, annihilation, and explicit
Blueprint blocks interact with deployments. A secondary deployment must not
silently evade one of those effects or restore a removed bonus. If these cases
cannot be reconciled clearly, keep independent deployments experimental and
ship the visual stage alone.

Acceptance: damage to one of two deployments leaves the other intact; a view
change creates no state; repair restores the intended deployment exactly once;
one bonus stays one bonus; old-save migration preserves history; all views agree
on the same damage; the repair choice produces a consequence players understand.

## Stage 5 — Make Blueprint readiness operational and specific

This is a deliberate rules extension. Current eligibility checks forged
Artifact IDs and explicit exclusions; it does not evaluate per-deployment
operation. Do not describe this as merely exposing an existing rule.

Retain exact recipes. Add optional, explicit operational requirements for each
participating component in the experimental rules profile. Default to one
qualifying operational source for a required function. A Project that actually
depends on a distributed chain may name several required roles; all those roles
must work. Do not require a surface component to be relocated merely because
the finished Project has a stellar theater.

For the first controlled example, demonstrate a surface-to-orbit function with
two required operational links and one unrelated damaged deployment. Either
required link can block construction; the unrelated damage cannot. Keep existing
production recipes and first-pool behavior pinned to their existing profile
until this rule extension is intentionally released.

Use one readiness evaluator for authoritative construction and the owner's
Blueprint panel. It reports which exact required function is missing, damaged,
or explicitly blocked. Do not expose an unmanifested Blueprint or its dependency
graph through public Event receipts, opponent repair controls, or spectator views.

After queued repair commits, reevaluate readiness and queue any newly eligible
manifestation in the staged resolution path. Finish the repair presentation
before Project manifestation; retain Event/Chronicle ordering and pause turn
advancement until the required presentations finish. Do not grant manifestation
rewards a second time when an already manifested Project's inputs recover.

Primary files: shared Blueprint definitions/types, `eligibleBlueprintArtifactIds`
and `checkBlueprintManifestations` in the game engine, the repair resolver,
[Blueprint panel](../artifacts/luminae/src/components/blueprints/BlueprintGamePanel.tsx),
state projection, and the shared presentation sequencing hooks.

Acceptance: required damage blocks and repair unblocks a new Project; unrelated
damage does not; exact IDs and explicit exclusions still apply; one Artifact can
still support multiple recipes; recovery does not duplicate rewards; existing
Projects retain their independent state; private assembly remains private.

## Stage 6 — Expand only what players understand

Use the opportunity pilot to establish comprehension, then add a recoverable
threat in an authored forecast/rehearsal before consequential story use. Add
exposure facts only when that selected threat requires them. Review all 90
Artifacts for each new fact, recording inclusion, reviewed exclusion, and
unresolved membership. Unreviewed membership blocks publication of the selector.

Balance Event occurrence and bounded impact rather than making semantic tags
equally common. Check specialization penalties, existing Affinity Events,
mandatory-defense strategies, leader advantages, and recovery opportunities.
Planetary Events stay modest; Stellar Events create recoverable pressure;
Galactic Events may affect several systems with explicit limits. Increased
disruption must not require obscure rules or eliminating every recovery route.

Expand visual coverage in reviewed batches after Stage 1 passes. Publish new
gameplay through a shared match content profile, initially in controlled story
or Custom contexts. Competitive rollout requires balance evidence and public
rules access independent of account story progress. Preserve the initial
opened-Vault release boundary until continuation is actually authored.

At the relevant runtime release, reconcile the Technology v2 wording about
Artifact properties, Blueprint operational requirements, the Civilization
lifecycle guide, and stale audit snapshots. Preserve historical provenance and
approved dialogue; do not silently relabel the entire lore catalog.

## Verification and implementation discipline

Use small changesets with these primary existing test homes:

| Concern | Targeted verification |
|---|---|
| Presence, placement, support, and selection | `civilizationArtifactManifestations.test.ts`, `CivilizationArtifactManifestationLayer.test.tsx`, `civilizationDeploymentSites.test.ts`, `civilizationEnvironmentSockets.test.ts`, `CivilizationScenePanel.test.tsx` |
| Lifecycle, repair, migration, and derived state | `civilizationFoundation.test.ts`, `civilizationEvolution.test.ts`, `gameEngine.test.ts`, `civilizationOutcomeCalibration.test.ts`, `civilizationRecords.test.ts` |
| Blueprint readiness and existing Project behavior | `blueprintEngine.test.ts`, `blueprintClearance.test.ts`, `BlueprintGamePanel.test.tsx` |
| Event determinism and privacy | `civilizationEventCards.test.ts`, `stateProjection.test.ts`, `turnTimer.test.ts` |
| Presentation ordering and accessibility | `CosmicEventPresentationOverlay.test.tsx`, `cosmicEventSequenceGate.test.ts`, `use-cosmic-event-ingress.test.tsx`, `use-luminary-presentation-engine.test.ts`, Chronicle gate tests |
| Visible evidence | Extend the existing Civilization evidence fixtures and `/dev/events`; cover desktop/mobile, reduced motion, reconnect, and representative saturated scenes. |

Run focused tests first. Type-check all affected shared/API/client packages when
schemas change and regenerate clients from the API source. Perform the web build
and production asset-budget check for visual asset or cross-package integration
changes. Recheck concurrent working-tree changes before editing shared files;
preserve unrelated work. Native packaging is outside this plan unless requested.

## First implementation batch

Begin with Stage 1's six-Artifact presence audit and one end-to-end rendered
example, followed by the remaining five if the treatment is legible and efficient.
In parallel, consolidate the existing single-Artifact damage/repair path in
Stage 2. These provide useful visible progress and trustworthy state without
making the larger deployment/Blueprint experiment a prerequisite for shipping.
