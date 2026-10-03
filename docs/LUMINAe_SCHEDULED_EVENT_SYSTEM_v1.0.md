# LUMINAe Scheduled Event System v1.0

Date: 2026-09-27. Owner-approved direction: a separate Event deck, a countdown
within Civilization, a three-dot warning on approaching personal turns, and
activation after the next successful Forge once the countdown is empty.
Updated 2026-09-29: a ready Event fills a genuinely vacated Forge mold before
that mold draws its replacement Artifact.

This replaces Archive insertion for new regular matches. Existing saved games
and same-board replays retain their saved delivery model. This document supersedes
the new-match delivery and public-selection sections of
[LUMINAe_REGULAR_EVENT_INTEGRATION_v1.0.md](LUMINAe_REGULAR_EVENT_INTEGRATION_v1.0.md).

## Rules

New regular matches use `scheduled_forge_v1` delivery. Artifact Archives contain
only Artifacts. A separate private Event deck holds a random, nonduplicated
selection from the reviewed seven-card `general_v2` catalog. Standard selects
one Event of each tier; Frequent selects two of each tier; Off selects none.
Containment Cascade and the unpublished lore pilots remain excluded.

| Setting | Planetary countdown floor | Stellar countdown floor | Galactic countdown floor |
| --- | --- | --- | --- |
| Standard | 4 complete rounds | 8 complete rounds | 12 complete rounds |
| Frequent | 4 and 6 complete rounds | 8 and 10 complete rounds | 12 and 14 complete rounds |

These are provisional earliest readiness times, not guaranteed activation
rounds. A complete round means one ordinary turn for each player, measured from
the actual opening player. Acknowledgements, animations, repairs, and other
subactions never advance the countdown. The same readiness floors apply in
2-, 3-, and 4-player games when measured in each player's turns.

When the countdown reaches zero, the Event becomes **armed**. It remains armed
until any player successfully Forges an Artifact. Face-up, Encrypted, and the
existing special Archive Forge/recovery paths qualify when they actually Forge.
Encryption, Harnessing, passing, repairing, failed Forge attempts, and non-Forge
Artifact grants do not qualify. A Forge that completed before readiness cannot
retroactively activate an Event.

The ready Event takes the next real Forge vacancy. A face-up Forge creates that
vacancy immediately; an Encrypted, Archive, or recovery Forge can ready the Event
without creating a vacancy, so it waits for a later departure. Once readied,
Encryption or a board effect can also supply that vacancy. The Event never
displaces an occupied Artifact. Its physical source tier need not match its own
Event tier, and the next Artifact remains in its Archive until acknowledgement.

All prior Luminary, Blueprint, board effects, and departure animations resolve
before the Event enters its presentation lane. Cosmic matter fills the empty
mold and solidifies into the Event card, followed by its existing tremble,
activation, explanation, unique effect, and receipt sequence. Consequences commit
exactly once under the existing acknowledgement barrier; the vacated mold then
draws its Artifact replacement, if available.

Only one Event can be released by a Forge. Once it resolves, the next countdown
must allow at least four complete turn cycles in Standard, or two in Frequent,
after the triggering turn finishes. The next tier's original readiness floor
also applies. Waiting at zero therefore shifts subsequent Events later and does
not create a backlog of immediately due activations.

Victory checks take priority. Once the final round or another closing condition
has been reached, no new scheduled Event is released. A separate Event deck
never keeps an otherwise finished match open. This is an explicit change for
new scheduled games; legacy Archive games retain their saved rules.

## Presentation

The full forecast belongs only to the **Civilization** layer. It shows the next
Event tier, the remaining round countdown, and the armed state. A displayed
round count includes a partially completed cycle; it is not a claim that every
player has that many whole rounds left.

During the local player's turn introduction, show a small three-dot indicator
only when at most three of that player's turns remain before readiness:

- Three turns: three filled dots.
- Two turns: two filled dots and one empty dot.
- One turn: one filled dot and two empty dots.
- Armed: three empty dots and “Cosmic Event ready.” The full forecast explains
  the successful Forge trigger and subsequent vacancy requirement.

If a player has no personal turns left before readiness while other players
still need to finish the cycle, the indicator must not claim that the Event is
already armed. The forecast distinguishes that waiting state from actual zero.

The dots empty slowly enough to read and carry a short, low-register sound.
The cue respects sound preferences, hidden-tab behavior, reduced motion, and
turn-identity deduplication. It must not replay from ordinary polling or overlap
an active Event/Chronicle presentation. No numeric full countdown is added to
the Board or Log.

Scheduled Events materialize in the Forge; they do not visually emerge from an
Artifact Archive or deplete its crystal. The normal Artifact refill and depletion
follow Event acknowledgement. Source metadata stores the physical tier and mold
index so reconnects can replay the same formation. Legacy receipts with a null
source index retain their temporary reveal; blind Archive Events retain their
existing origin.

The Log describes the eligible Event catalog, rather than disclosing the actual
selected deck. With a known tier schedule, exposing one selected Event per tier
would reveal the entire Standard sequence. Actual selection and order stay
private until revealed. Targeting rules and per-player outcome explanations
remain inspectable. Archive Encryption controls no longer warn that scheduled
Events can be drawn there; legacy matches retain that warning.

All added explanatory labels are mechanical UI copy. No approved tutorial,
Chronicle, Vault, Lumii, Artifact lore, or player-response dialogue is revised.

## Persistence and compatibility

Private Event state saves the selected queue, tier readiness floors, cursor,
next completed-turn threshold, last activation count, and any ready card. The
public forecast exposes only status, next tier, rounded remaining cycles, and
remaining personal turns. It must never expose the selected queue or replay
snapshot.

Same-board replay preserves the separate deck's order and delivery model, then
restarts its countdown. Reconnect restores the current countdown or armed/
resolving state without reshuffling, decrementing, or applying consequences
again. Legacy saves without delivery metadata continue to use Archive insertion.
Current authored stories and the guided rehearsal continue to exclude random
Events. No database schema change is needed for this JSON state extension.

## Balance implications

The clock progresses independently of action choice, while the final Forge
requirement gives the table a readable activation moment. Players can delay an
armed Event by postponing Forging; this is an intentional consequence of the
owner's rule. That delay cannot accelerate stronger tiers or produce several
Events at once.

Frequent increases incidence without advancing the initial Stellar/Galactic
floors. Damage retains Affinity bonuses and uses the existing free end-of-turn
repair system. Newly scheduled damage never interrupts an already closing game,
although this does not invent a general guarantee of repair before every
possible victory condition. Prolonged-damage Legacy penalties remain deferred.

Tune the provisional floors and intervals using observed match lengths, armed
waiting times, recovery opportunities, and how often each tier is encountered.
A Galactic floor that most ordinary games never reach should be changed in a
future ruleset, not silently rewritten in saved matches.

## Verification completed

- All 500 backend tests passed, including countdowns for every opening seat in
  2-, 3-, and 4-player games, successful/failed Forge paths, presentation gates,
  delayed readiness, replay, private projection, and endgame precedence.
- Thirty-eight targeted frontend tests passed; backend/frontend TypeScript
  passed. Scoped lint had no errors; the existing game-page hook warnings remain.
- Eleven browser cases passed, covering 3/2/1/0 dots, no early warning, duplicate
  updates, Civilization-only forecast, candidate catalog, desktop/phone layout,
  reduced motion, and creation/lobby settings.
- Live local API checks passed for Off, Standard, and Frequent. The complete
  countdown → armed → Encryption still armed → successful Forge → public receipt
  → reconnect → new countdown flow passed. Three temporary QA rooms were removed.
- Read-only verification confirmed the existing player test match retains its
  original Archive delivery. The local API was restarted with the new source.

Screenshot: [two remaining turn dots](../artifacts/qa/scheduled-events/event-warning-2.png).
