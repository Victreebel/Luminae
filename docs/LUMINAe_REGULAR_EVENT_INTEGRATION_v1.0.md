# LUMINAe Regular Event Integration v1.0

## Scheduled Event update — September 27, 2026

New regular games now follow the [scheduled Event specification](LUMINAe_SCHEDULED_EVENT_SYSTEM_v1.0.md): a separate Event deck, a Civilization countdown, approaching-turn dots, and activation after the next successful Forge once armed. The Archive insertion and exact-selection disclosure descriptions below remain historical. Existing saves and same-board replays preserve their original delivery rules.

Date: 2026-09-27. Status: implemented rules; initial balance values require playtesting.

## Decision and justification

Regular, non-story games select a random subset of the reviewed Event catalog at
match creation. The host can choose the frequency when creating the room or
while it remains in the lobby. All players can inspect the setting before
launch. These settings work in ordinary Standard rooms without Blueprint
ownership or campaign clearance.

| Setting | Planetary | Stellar | Galactic | Total inserted |
| --- | ---: | ---: | ---: | ---: |
| Off | 0 | 0 | 0 | 0 |
| Standard (default) | 1 | 1 | 1 | 3 |
| Frequent | 2 | 2 | 2 | 6 |

Each tier selects without replacement and shuffles its selected Events into
that tier's remaining Artifact Archive. No duplicate Event cards are inserted.
Opening Forge rows contain four Artifacts each. Event cards add to the Archives;
they do not remove Artifacts. Inclusion is not a guarantee of being encountered:
the match may finish before a selected card is drawn.

Three default cards give each tier a possible cosmic interruption while
preserving room for ordinary play. Six doubles the number of inserted cards for
players who want more volatility. This is a starting calibration, not a claim
that the observed number of activations will exactly double. Selection is
independent of player identity, account progress, Affinity commitment, technologies
owned, and who is winning. Effects may respond asymmetrically to public player
state once revealed.

Within the current seven-card catalog, Frequent necessarily includes both
Planetary and both Stellar candidates; it randomly selects two of the three
Galactic candidates. Their positions remain random. More authored cards can
increase variety later; duplicates or unpublished pilots are not needed to fill
this setting.

## Released pool

New regular games use `general_v2` and `regular-events-v2`. The selected IDs are
persisted at creation, rather than recomputed from a changing catalog. The Log
announces the actual selected cards and their rules without revealing their
Archive order or remaining counts. Players can prepare for a known set of
possibilities without knowing the next draw.

| Tier | Eligible Event | Consequence and role |
| --- | --- | --- |
| Planetary | Affinity Bloom | Grants a least-held available standard Affinity within the hand limit; a gentle introduction to shared Events. |
| Planetary | Orbital Drift | Replaces the leftmost unmarked Planetary Artifact, returning it to its Archive; changes a shared opportunity. |
| Stellar | Affinity Inversion | Returns two tokens from players holding at least three of one standard Affinity; other players may gain a least-held available token. Makes concentration consequential. |
| Stellar | System Shock | Damages each player's newest operational forged Artifact, if one exists. Brings the repair mechanic into ordinary games. |
| Galactic | Entropy Storm | Removes up to three tokens of each player's most-held standard Affinity and returns their oldest ordinary Encrypted Artifact to its Archive. Foundry storage is preserved. |
| Galactic | Cosmic Reflux | Returns the oldest Burned Artifact of each tier to its Forge where possible and grants an available Singularity within the hand limit. Creates late opportunities at a larger scale. |
| Galactic | Fracture Wave | Damages up to two highest-tier operational forged Artifacts per player, with newest-first ties. Escalates the Stellar damage pattern. |

These are summaries; the shared card definitions and receipts remain the exact
rules. A missing eligible target produces a no-effect outcome, without selecting
a substitute from another zone. Tier escalation concerns reach and potential
disruption; a Galactic Event need not always be punitive.

Stellar Containment Cascade is excluded from **new** regular selections. Its
exposed result currently combines authored pressure with structural disruption
pressure, and ordinary homeworld recovery is undefined. Release requires clear
pressure accounting, readable receipts, and an attainable recovery rule. The
card remains available in development previews and historical games/replays.

Signal Clarity and Synchronization Shear remain in the unpublished
`lore_pilot_v1` profile. The 90-Artifact compatibility audit and public targeting
evidence are already implemented. Releasing these pilots requires an authored
introduction and balance/comprehension review; a player account flag must never
silently change shared match eligibility or immunity.

## Introduction and story policy

The initial guided rehearsal, current Chronicles, and Vault clearance use no
random regular Events. Their authored consequences and presentation gates remain
in control. Existing saved games retain what they already contain. This change
does not write or alter tutorial, Chronicle, Vault, or Lumii dialogue.

The first ordinary match defaults to Standard. Before launch, the room explains
how many cards are inserted and that they activate when drawn. During a match,
the Log provides rules for the selected pool. The first actual activation uses
the shared readable presentation and per-player outcome receipt; persistent
history explains what happened after it closes.

Future story integration should use the following teaching sequence. These are
scene intentions, not approved dialogue or newly implemented encounters:

1. Teach one legible shared Event and its consequences after the core Forge loop
   is understood. Keep this authored teaching encounter separate from the
   random regular selection.
2. Introduce System Shock with an operational Artifact and a real subsequent
   repair opportunity. Show that Affinity bonuses survive while Blueprint and
   Legacy eligibility require restoration.
3. After Vault confrontation and lore exploration, teach a reviewed capability
   or dependency through inspectable evidence before a consequential lore Event.
   Preserve withdrawal as a valid story choice.
4. Release a reviewed lore expansion as a shared, announced match ruleset. Do not
   give knowledgeable accounts different immunity or hidden Event pools.

## Resolution, damage, and replay contract

Keep the existing Event lane: previous effects and presentations finish; the
card trembles in the Forge, moves forward, and activates; its explanation appears
with the unique effect animation; the receipt resolves before the next Event,
Chronicle, turn handoff, or ordinary action proceeds. World-scale shockwaves,
player avatars, low-register adverse audio, pause, skip, and reduced-motion
support remain intact. No new phase timers or overlapping cinematics are added.

Damage targets the single operational Artifact implementation, not every camera
view. It preserves Affinity bonuses, ownership, mastery, and Eminence. Damaged
Artifacts cannot supply new Blueprint components or eligible Legacy evidence;
completed Projects retain their own state. Existing free queued repairs resolve
at the end of the owner's turn. Prolonged-damage Legacy scoring is deferred until
Legacy Victory is designed.

A known boundary remains: damage revealed during the final turn transition may
leave no subsequent owner-turn repair opportunity. This integration does not add
extra rounds, automatic healing, or secret last-round immunity. Do not claim a
guaranteed repair window. The eventual Legacy closing rules must explicitly
address final-round damage before prolonged-damage penalties are introduced.

Fresh rematches preserve the room frequency and select anew. Same-board rematches
preserve the exact initial selection, frequency, profile, Artifact order, and
Event positions. Normalization must not insert Events into existing saves or
turn an explicit Off/empty selection back on. Legacy `general_v1` games and exact
replays retain their historical eight-card pool. Public projections announce the
selection but never expose private Archive order or hidden Encrypted identities.

## Implementation and release checks

- Shared catalog/types and OpenAPI describe frequency separately from content
  profile. Public room APIs do not expose unpublished profile selection.
- `rooms.event_frequency` persists the host setting. Migration
  `0022_room_event_frequency.sql` adds the column, checks its values, and marks
  authored scenario/campaign room settings Off without rewriting saved games.
- Create, host lobby updates, challenge creation, start, room summaries, and
  fresh/same-board rematches carry the setting. Invalid modes and unauthorized
  or post-launch edits are rejected by existing room access rules.
- Game initialization persists selected IDs/frequency in the initial board and
  Event state, uses tier-matched selection, and protects the Artifact-only opening.
- Frontend creation/lobby controls and the Log show the setting and actual pool.
- Targeted verification covers mode counts, unique tier selection, random
  variation, Off/reconnect normalization, historical replay, scenario isolation,
  API validation, settings UI, and existing resolution/damage/repair behavior.

Before publishing this initial calibration, playtest observed Events per game,
consecutive Event chains, presentation time, repairs queued/completed, and late
Blueprint/Legacy opportunity loss. Compare two- and four-player games and each
frequency. Change future rulesets deliberately; do not rewrite saved selections.

## Verification completed

- Backend suite: 476 tests passed; final room contract/settings checks: 26 passed.
- Frontend settings, pool inspection, and game-tab checks: 12 passed.
- Four browser cases passed at desktop and phone widths, including keyboard
  selection and read-only joiner settings. These cases use isolated API fixtures.
- Five real local API/database flows passed: default, Off, Frequent, Off changed
  to Frequent, and Frequent changed to Off. Each checked host-only edits, invalid
  values, launch, reconnect, persisted selection, tier counts, and private-state
  exclusion. All five temporary test rooms were removed afterward.
- Migration 0022 passed rollback-only validation and was applied to the local
  development database. Production/deployed databases still need the migration.
- Shared API generation, backend/frontend TypeScript, scoped lint, and whitespace
  checks passed. No native app was repackaged.
