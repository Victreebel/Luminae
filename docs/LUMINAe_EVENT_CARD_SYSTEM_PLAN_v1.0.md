# LUMINAe Event Card System Plan v1.0

## Scheduled Event update — September 27, 2026

New regular games now follow the [scheduled Event specification](LUMINAe_SCHEDULED_EVENT_SYSTEM_v1.0.md): a separate Event deck, a Civilization countdown, approaching-turn dots, and activation after the next successful Forge once armed. The Archive insertion and exact-selection disclosure descriptions below remain historical. Existing saves and same-board replays preserve their original delivery rules.

## Current regular-game policy — September 27, 2026

The [regular Event integration specification](LUMINAe_REGULAR_EVENT_INTEGRATION_v1.0.md)
supersedes the fixed eight-card insertion described below for **new** regular
games: Standard selects three unique Events (one per tier), Frequent selects six
(two per tier), and Off selects none. Selection uses the seven-card `general_v2`
pool, excluding Containment Cascade until pressure/recovery rules are repaired.
Historical games and exact replays retain their saved content. Lore pilots remain
unpublished; guided and authored story encounters keep control of their Events.

## Implemented model — September 26, 2026

This section supersedes the milestone-triggered proposal retained below. Standard
matches now shuffle eight Event cards into the Artifact Archives: two Planetary,
three Stellar, and three Galactic. The opening four molds in each Forge row contain
Artifacts; subsequent reveals can expose an Event instead of an Artifact. There
is no maturity or Blueprint milestone trigger. Fresh matches reshuffle Events;
same-board rematches preserve their exact Archive positions.

The display names and new mechanical descriptions are **draft content**. Existing
Chronicle dialogue and approved authored consequences remain unchanged.

### First playable pool

| Archive | Event | Authoritative effect |
| --- | --- | --- |
| Planetary | Affinity Bloom | Every player gains one available standard Affinity they hold least of, subject to the ten-token limit. |
| Planetary | Orbital Drift | The first unmarked Planetary Artifact returns to the bottom of its Archive and its mold reveals a replacement. |
| Stellar | Stellar Containment Cascade | Every civilization answers Disruption with operational capabilities: strong coverage prevents it, supporting coverage adds minor pressure, and exposed civilizations receive a disrupted homeworld condition and material pressure. |
| Stellar | Affinity Inversion | Players holding three or more of a standard Affinity return two of their most-held color. Other players receive one least-held available standard Affinity. |
| Stellar | System Shock | Each player's most recently Forged operational Artifact becomes Damaged. |
| Galactic | Entropy Storm | Every player returns up to three of their most-held standard Affinity and releases their oldest ordinary Encrypted Artifact into its Archive. Foundry storage remains attached to its Foundry. |
| Galactic | Cosmic Reflux | The oldest Burned Artifact of each tier returns from the Burn Pile to the Forge, replacing an unmarked Artifact if needed. Every player receives one available Singularity, subject to the hand limit. |
| Galactic | Fracture Wave | Each player's highest-tier operational Artifacts become Damaged, up to two per player; ties favor the most recently Forged. |

Ties follow standard Affinity Well order. Scarce gifts are allocated starting
with the active player and proceeding in turn order. Events conserve tokens:
gifts come from the Well, and returned tokens go back into it. Empty supplies,
full hands, empty Burn Piles, and protected/marked molds resolve without inventing
resources or targets. Cosmic Reflux's internal compatibility ID is
`event_galactic_terminus_tide`; its effect concerns the **Burn Pile**, not the
Luminary Terminus.

### Artifact damage and repair

System Shock and Fracture Wave target actual public, forged, operational
implementations. Encrypted, archived, annihilated, and already damaged Artifacts
are ineligible. An empty target set is an explicit no-effect outcome. Public
receipts and history name the exact damaged Artifacts.

Damage preserves ownership, recorded mastery, Eminence, signature interference,
and all Affinity bonuses, including the printed Artifact bonus. It suspends
operational capabilities and adds the existing structural Stability pressure
once per damaged implementation. Damaged components cannot complete a new
Blueprint; already manifested Projects retain
their own state.

Players select damaged Artifacts in Civilization and queue free repairs without
spending their core action. Repair occurs at the end of that owner's turn.
Queuing may happen off turn once the shared resolution gate permits actions.
Repair restores operation without changing bonuses, clears the matching damage
Conditions, and reevaluates Blueprint/Luminary eligibility. Any resulting presentation must
finish before later end-of-turn effects proceed. AI opponents queue their own
repairs before their normal turn action. Reconnect and duplicate requests do not
heal early, multiply bonuses, or repeat manifestation rewards.

The eight-card pool is seeded into new matches. Existing matches retain their
saved decks; same-board rematches retain those exact cards and positions.

### Resolution and presentation contract

1. A normal action or prior effect reveals the Event in a Forge mold. Archive
   draws divert leading Events into a temporary reveal space beside the Forge,
   then complete the normal Artifact draw if an Artifact remains. Events never
   enter Encrypted hands, Artifact collections, or the Burn Pile.
2. Existing Summon, Luminary activation, Blueprint manifestation, and detonation
   presentation queues resolve before Event consequences are committed.
3. The server previews one Event for all players on a cloned state and creates a
   durable public receipt with its definition, source mold, locked outcome
   previews, and timestamp. Board state, resources, history, and logs remain
   unchanged. The source Event remains in its mold until acknowledgement.
4. The client finishes its current animation queue, trembles the Event at its
   source, brings it to the foreground, plays the general activation, and then
   presents its explanation with its unique effect and sound profile. Reduced
   motion and Skip complete the same authoritative receipt.
5. Acknowledgement commits the previewed consequences exactly once, removes the
   source Event, and reveals the next card. A new Event continues the same lane before end-of-turn effects, start-of-turn
   effects, AI actions, planned actions, turn timers, or player handoff resume.

Blind draws resolve against the post-action game state. For example, Entropy
Storm can release an Artifact just Encrypted by the draw that revealed it. The
receipt reports the number released without exposing a hidden Artifact identity.
Events discovered simultaneously resolve one at a time in Planetary, Stellar,
then Galactic Forge order. Reconnects retain the receipt; duplicate
acknowledgements are harmless. New receipts use `phase: reveal` until commit;
legacy `phase: receipt` saves already committed and are never applied twice.
Planned-action validation drains a clone of this same sequence, leaving the live
match untouched.

The public Forge preserves vacant mold positions while an Event occupies them.
Archive order, the private Event catalog, hidden Encrypted identities, and
Archive-draw provenance remain private. Each Event records a civilization
history entry. The containment card continues to use the existing capability,
condition, stability, and Defining Trial rules.

The normal client sequence uses 1.25 seconds of Forge trembling, 1.25 seconds
of travel, and 1.6 seconds of activation. The explanation appears only after
activation, alongside the Event-specific effect and sound. Its effect dwell
adapts to the amount of rules/outcome text (6.5–11 seconds), followed by a
3-second receipt and a short exit. Reduced motion preserves reading time.
Pause, keyboard-accessible scrolling, and Skip remain available. Hidden tabs
pause their local presentation and cancel sound. A faster peer cannot interrupt
another client's receipt: future snapshots wait behind its local presentation
lease. Chronicle introductions, decisions, results, and their sound tails use
the same entry barrier without changing their dialogue.

Owner audio direction (2026-09-27): baseline-negative Events use low, weighty
effects appropriate to their phenomenon, including their arrival, activation,
and resolution cues. Containment uses descending pressure pulses; damage uses
low impacts and detuned fracture textures. Soft low-pass filtering controls
harsh upper harmonics. Avoid bright rising whistles and upper-octave shimmer
for these Events. Affinity Bloom retains a brighter opportunity sound; other
neutral or positive Events can use gentler middle-register tones. Animation
timing is unchanged by this sound revision.

Event spectacle now includes scene-wide wavefronts and a symbolic world for each
affected civilization, labelled with its name and actual player avatar. Public
receipts determine shields, strain, resonance, and infrastructure damage;
Artifact damage never depicts destruction of the planet. Phone layouts make
room above the reading panel. Pause, Skip, and reduced motion remain supported.
These presentation worlds do not create additional deployments or targets.

The development route `/dev/events` previews all eight cards, four-player receipts,
full/reduced motion, and sound. It is excluded from production routing.

### Scope and validation

Competitive Events are removed when an authored Chronicle is configured, leaving
that Chronicle's existing consequence and choice gates in control. Old saved
milestone receipts remain acknowledgeable; old matches are not silently seeded
with a new deck mid-match. The current pool does not rewrite Terminus Luminary
requirements, victory requirements, printed Artifact bonuses, or exact Blueprint
recipes. Damage temporarily suspends operational contributions as described above.

Dedicated engine tests cover tier insertion, exact-board replay, no milestone
trigger, capability-dependent outcomes, prior-presentation gates, successive
Event reveals, hand limits, token conservation, hidden-hand privacy, Burn Pile
recovery, reconnect acknowledgement, and complete two- and four-player AI
matches after all eight Event types. Damage tests additionally cover target
selection, deferred commit, preserved bonuses, suspended capabilities, repair, persistence,
and operational Blueprint readiness. Existing Artifact/Luminary test fixtures keep
ordinary Artifact decks so their targeted assertions remain deterministic.

### Owner correction: damage, Affinity, and Legacy

Damaged Artifacts retain their Affinity bonuses. Until repaired, they cannot
contribute to new Blueprints or Legacy qualification. Repair restores eligibility
without awarding another bonus or repeating a Project's manifestation reward.

The current Legacy prototype has four criteria, not an individual Artifact point
score. Its maturity and Galactic Identity eligibility exclude damaged Artifact
evidence without erasing the Civilization's historical records. Other qualifying
evidence may still satisfy those criteria; damage is not a blanket veto on Legacy.
Completed Projects retain their own state and historical Great Works credit,
and an already awarded Legacy victory is not revoked.

Legacy's full design remains open. The owner proposes an additional consequence
for leaving Artifacts damaged over time. Record this as a design requirement to
evaluate, not an active penalty: no duration multiplier, lost points, grace
period, or permanent neglect debt is implemented. Decide whether time is counted
in the owner's turns, whether repair clears or gradually recovers the penalty,
and how it is capped before enabling it. Existing recorded damage/repair turns
provide evidence, but a future duration system must also close intervals on
archival, annihilation, or replacement rather than treating an unresolved old
Condition as ongoing damage forever.

## Historical proposal (superseded by the implementation above)

## Status

Implementation plan. Event cards are not part of the live match rules yet.

This plan treats the Civilization View as the home of rare, consequential
events. It does not turn that view into a recurring resource-management screen.

## Product Goal

Event cards should make a civilization's accumulated Artifacts, manifested
Blueprints, stability, and history matter in a small number of memorable match
beats. A player should understand:

1. What changed in the wider world.
2. Which part of their civilization answered it.
3. What mechanical consequence resulted.

Events must reveal the value of the Civilization View. They must not require a
player to memorize decorative lore, trace abstract route overlays, or perform
routine maintenance between normal turns.

## Launch Scope

- Zero to two Event windows in a standard match.
- A small authored Event deck selected when the room is created.
- One synchronized Event resolution lane shared by all clients.
- Automatic capability-based outcomes first.
- Optional player-choice Events only after the automatic system is proven.
- Event cards never create a third victory currency.
- Event outcomes may affect Eminence, Blueprint progress, civilization
  conditions, Forge state, or the Affinity Well, but must use existing game
  currencies and rules.

## Trigger Model

Events are milestone-triggered, not checked every turn.

The launch trigger policy should support two windows:

| Window | Default trigger | Purpose |
| --- | --- | --- |
| First contact | First civilization reaches Stellar maturity or manifests the first Blueprint | Introduce civilization-scale consequence after players have built meaningful identity |
| Late pressure | First player enters the final-round threshold, before the final round is released | Create one last readable test of the civilizations players built |

Each room snapshots its Event deck and trigger policy. Replays of the same board
reuse the same Event order. Fresh rematches reshuffle from the approved pool.

An Event window fires only after the current core action and all Luminary and
Blueprint presentations resolve. It holds the same sequence-level camera and
input lease. The next turn cannot begin until the Event result is authoritative
and its presentation completes.

## Authoritative Resolution Order

```text
Trigger detected
  -> Event identity committed by server
  -> Public reveal
  -> Civilization scene framed
  -> Affected civilizations highlighted
  -> Existing capabilities and conditions evaluated
  -> Optional private choices collected, when the card explicitly requires one
  -> Outcomes committed atomically
  -> Outcome animation
  -> Persistent result receipt and Civilization history entry
  -> Camera/view restored
  -> Turn pipeline resumes
```

The reveal is never allowed to race normal Forge, Encrypt, Harness, Assimilate,
Luminary, or Blueprint actions.

## Card Contract

Every Event definition should contain:

```ts
interface CivilizationEventCardDefinition {
  id: string;
  title: string;
  rulesText: string;
  timing: 'first_contact' | 'late_pressure' | 'authored';
  pressureTags: CivilizationPressureTag[];
  affectedPlayers: 'all' | 'leader' | 'trailing' | 'qualified';
  qualification?: EventQualificationRule;
  requiredCapabilityIds?: string[];
  interactingCapabilityIds?: string[];
  outcomes: CivilizationEventOutcomeDefinition[];
  fallbackOutcomeId: string;
  presentation: CivilizationEventPresentation;
}
```

Rules text is mechanical and short. Flavor copy, if any, is secondary and may
not be required to understand the result.

Every committed Event instance should contain:

```ts
interface CivilizationEventInstance {
  eventId: string;
  definitionId: string;
  triggerTurnCount: number;
  phase: 'reveal' | 'awaiting_choice' | 'resolving' | 'receipt' | 'complete';
  affectedPlayerIds: string[];
  choicesByPlayerId: Record<string, string>;
  outcomesByPlayerId: Record<string, string>;
  createdAt: number;
}
```

The server owns eligibility, random selection, legal choices, timeouts, and
results. Clients own only presentation and submit explicit legal choices.

## Capability Resolution

The existing Civilization capability, pressure, stability, condition, and
history contracts should be reused. An Event asks a mechanical question such as
"Does this civilization have a capability that answers disruption pressure?"
It does not invent a parallel set of city statistics.

Artifacts and Blueprints should answer Events through their existing authored
capabilities. A response must identify the actual Artifact implementation or
manifested project that supplied it. Scan mode can then focus and illuminate
that 2.5D manifestation during resolution.

Blueprint state matters as follows:

- Assembling: contributes no public Blueprint capability.
- Manifested and operational: contributes its authored capability.
- Spent or recovering: remains a completed Legacy project, but contributes only
  capabilities explicitly allowed in that state.
- Antimatter Detonator is the reference implementation for this distinction:
  assembly remains private, manifestation creates a public stellar project, and
  device state controls whether its catastrophe capability is currently usable.

## Presentation Contract

### Reveal

- Show the Event title and one short mechanical sentence.
- Keep the Civilization scene visible; use edge chrome rather than a central
  opaque panel.
- Do not show outcome text before the server commits the outcome.

### Resolution

- Frame the relevant scale and site.
- Illuminate only manifestations that actually contribute.
- Use one visual cause followed by one result. Avoid simultaneous unrelated
  particles, labels, and map geometry.
- A choice card may pause only the choosing player's local presentation, while
  other players see an unobtrusive waiting state. The authoritative turn still
  waits for all required choices or deterministic timeout defaults.

### Receipt

- After the animation, leave a concise result receipt long enough to read.
- State the mechanical delta first.
- Name the Artifact, Blueprint, capability, or condition that caused the branch.
- Add the result to Civilization history and the normal match log.

## Initial Event Archetypes

### 1. Automatic pressure event

All civilizations resolve simultaneously against one pressure tag. Existing
capabilities determine protected, partial, or exposed outcomes. This should be
the first production implementation because it is deterministic and adds no
mid-resolution player choice.

### 2. Focused crisis event

One qualified player chooses between two legal consequences. The decision uses
large, plain mechanical outcomes and a timeout default. This should ship only
after reconnect, AI, and multiplayer waiting behavior are verified.

### 3. Shared opportunity event

Players who meet a public condition receive a benefit. This archetype must not
reward the current leader by default and must not duplicate ordinary Artifact
or Blueprint rewards.

## Prototype Event For Engineering

Working identifier: `event_stellar_containment_cascade`.

This is an engineering prototype, not approved final card copy.

- Timing: first contact.
- Pressure: disruption.
- Affected players: all.
- Resolution: automatic.
- Protected branch: an operational authored containment or interception
  capability prevents the condition.
- Partial branch: resilience capability reduces the duration or severity.
- Exposed branch: apply one existing temporary civilization condition.
- Presentation: frame each affected civilization in turn, highlight the exact
  responding manifestation when one exists, then show a shared result receipt.

The Antimatter Detonator may interact only if its authored device state and
capabilities logically answer the Event. The Event system must not special-case
its Blueprint ID merely because it is the Blueprint prototype.

## Multiplayer, AI, And Recovery

- Event instances persist in game state and survive reconnects.
- Every phase is idempotent and acknowledged by event ID.
- AI choices use the same legal option list and deterministic scoring contract
  as human choices.
- Timeout defaults are authored per card and visible before selection.
- A rematch clears runtime Event instances and snapshots the next room's deck.
- Animation skipping acknowledges only the current presentation beat; it never
  skips an unresolved choice or applies a client-side result.
- Decorative animation pauses when the document is hidden, but authoritative
  timers do not.

## UI Placement

- Event deck/count: compact status in the Civilization tab, not the main Board
  HUD.
- Active Event: controlled cinematic over the Civilization scene.
- Past Events: Civilization Record history.
- Event details: a sheet opened from history, with the outcome and responding
  manifestations.
- No permanent map routes, grids, or Event pins outside Scan mode.

## Delivery Phases

### Phase 1: Contracts and automatic prototype

- Add Event definitions and server-owned Event instances.
- Add room-snapshotted Event deck and milestone trigger cursor.
- Route resolution through the existing turn presentation gate.
- Implement one automatic pressure Event.
- Record outcomes in Civilization history.

### Phase 2: Presentation and accessibility

- Implement reveal, resolution, and receipt beats.
- Add reduced-motion and mobile-performance variants.
- Add Scan focus for responding manifestations.
- Verify no controls or important animation are obscured at phone widths.

### Phase 3: Choice Events

- Add private legal-choice projection and deterministic timeout defaults.
- Add AI choice scoring.
- Add reconnect and spectator states.
- Ship one focused crisis Event.

### Phase 4: Content expansion

- Balance the Event pool against affinity identities and Blueprint loadouts.
- Add telemetry for comprehension, skip rate, choice time, and match impact.
- Expand only after playtests show that players can explain why each outcome
  occurred.

## Required Verification

- Unit tests for trigger eligibility, deck determinism, capability branches,
  timeout defaults, and idempotent resolution.
- Integration tests proving normal actions cannot interleave with Event phases.
- Projection tests for private choices and public outcomes.
- Reconnect tests at every Event phase.
- Same-board and fresh-board rematch tests.
- AI simulations for outcome frequency and leader/trailer impact.
- Desktop and mobile screenshots for reveal, resolution, receipt, history, and
  reduced-motion states.
- Performance trace confirming the idle Civilization View returns to its normal
  animation budget after Event completion.

## Launch Gate

Do not ship Event cards merely because the pipeline works. The first card is
ready only when a new player can answer all three questions without reading the
log:

1. What happened?
2. Why did my civilization receive this outcome?
3. What changed mechanically?
