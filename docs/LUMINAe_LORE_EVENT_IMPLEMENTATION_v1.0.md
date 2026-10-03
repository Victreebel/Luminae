# LUMINAe Lore Event Implementation v1.0

## Scheduled Event update — September 27, 2026

New regular games now follow the [scheduled Event specification](LUMINAe_SCHEDULED_EVENT_SYSTEM_v1.0.md): a separate Event deck, a Civilization countdown, approaching-turn dots, and activation after the next successful Forge once armed. The Archive insertion and exact-selection disclosure descriptions below remain historical. Existing saves and same-board replays preserve their original delivery rules.

## Regular-game release update

New regular games now use the seven-card `general_v2` pool and the configurable
random selection in the [integration specification](LUMINAe_REGULAR_EVENT_INTEGRATION_v1.0.md).
Standard inserts three cards, Frequent six, and Off none. `general_v1` remains
available for historical games/replays. Containment Cascade is excluded from new
regular selections pending pressure/recovery fixes. The two lore pilots below
remain unpublished and are not added by the Frequent setting.

Date: 2026-09-27. Status: compatibility foundation and unpublished pilots implemented.

## What changed

All 90 Artifacts now have a mechanical compatibility review tied to their
effective practical function. The September 28
[semantic consistency pass](LUMINAe_EVENT_SEMANTIC_CONSISTENCY_REVIEW_v1.0.md)
corrects eight capability assignments and one dependency; no approved Artifact prose, mystery,
dialogue, printed bonus, or Blueprint recipe was rewritten. This is a review
of runtime mechanical meaning, not a recertification of every historical lore
document. The [complete audit](LUMINAe_ARTIFACT_EVENT_COMPATIBILITY_AUDIT_v1.0.md)
records every inclusion, exclusion, source, and bounded interpretation.

The shared [fact registry](../lib/game-types/src/artifact-event-facts.ts) adds
one closed dependency: `dependency:distributed_synchronization`. Five Artifacts
coordinate separated active systems through shared timing, aligned control,
or distributed correction. The other 85 have explicit reviewed exclusions.
Communication, archives, social agreements, Affinity, artwork, and names do
not establish that dependency. A response capability is not itself a weakness.

Regression checks require the complete catalog, all fact reviews, unchanged
source evidence, and agreement with the capability assignments that were
reviewed. Adding a fact or changing an Artifact's function requires renewed
review; missing data must not silently grant immunity.

## Pilot rules and availability

| Event | Tier | Selection and consequence |
| --- | --- | --- |
| Signal Clarity | Planetary | Each player with an operational, public, forged signal interpreter can gain one least-held available standard Affinity. No universal decoding is implied: interference subsides within each interpreter's established domain. The newest responder supplies the evidence; additional responders do not multiply the reward. |
| Synchronization Shear | Stellar | Each player loses operation of at most one implementation with the reviewed dependency. Choose the newest unprotected eligible Artifact. Its own resilient computation protects only that Artifact; skip it when selecting the target. No eligible target means no damage. |

Both evaluate all players. Signal Clarity allocates scarce Well supply in fixed
seating order, with standard Well order breaking Affinity ties and the existing
hand limit enforced. This ordering is explicit in the rules. Synchronization
Shear has no scarce shared allocation and cannot hit an unrelated Artifact.

The eight existing Events remain in `general_v1`. The two pilots are isolated
in `lore_pilot_v1`, an explicit internal initialization/encounter profile with
no live room-creation option. Same-board replay retains the profile. Existing
saves do not gain new Event cards. Chronicle setup removes random Events, and
Chronicle presentation remains protected. No account flag or Vault decision
changes competitive susceptibility, immunity, or draw pools.

The pilots can be inspected immediately in the development presentation:

- `/dev/events?event=signal_clarity&motion=full`
- `/dev/events?event=synchronization_shear&motion=full`
- `/dev/card-browser?id=t1s04` — expand Event interactions.

These previews use labelled sample players and temporary existing illustrated
plates. Each pilot has its own slow effect geometry and synthesized sound
profile. The existing tremble, lift, activation, effect, receipt, and settle
sequence remains. Existing Event card art and animation direction are retained.

## Resolution and persistence

Typed rules declare the zone, operational lifecycle, selector, per-player cap,
tie order, and any self-protection. The server reads one pre-Event state and
creates a serializable `lore-events-v1` plan with schema version 1, exact selected
public Artifact IDs, causal evidence, consequences, and reserved token grants.

The preview does not apply damage or resources. Acknowledgement applies that
saved plan, never reselecting against a changed catalog or reordered tableau.
Grant capacity/supply is checked before any mutation. Missing or incompatible
plans fail without retargeting; repeated acknowledgement does not apply an
effect twice. The saved rules explanation is displayed even if the current
catalog changes before reconnect. General Events retain their existing
preview/recompute resolver; conversion of that whole catalog is future work.

Private plans never enter the public projection. Public evidence contains only
the operational forged Artifact IDs that participated, the matched capability
or reviewed fact, the response/target role, and the reason. No Encrypted hand,
deck order, unrevealed Blueprint, or private source is used by these selectors.
Targeting those zones would require a separate privacy design.

## Lifecycle and inspection

Damage uses the existing persistent implementation lifecycle, damage condition,
stability consequence, and free repair queue. It keeps discovery, ownership,
mastery, Eminence, and Affinity bonuses. Damaged implementations cannot respond
operationally, assemble new Blueprints, or supply eligible Legacy evidence.
Repair restores operation through the existing owner-turn resolution flow.
Completed Projects retain their own state. No prolonged-damage Legacy formula
or separate per-camera liability was introduced.

Artifact detail sheets and the card catalog show capability and dependency
labels beneath the lore before commitment. Practical roles are visible alongside
the labels; Event interactions expands to explain why the capabilities fit,
what the dependencies mean, and which targeting properties are explicitly excluded.
The Log shows the announced match Event collection. Activation receipts and
Civilization history retain causal reasons and the actual Event identity.
History remains inspectable after animation, with scrolling and reading pause.
Reduced motion retains the explanation and existing presentation gates.

## Deferred release work

- Author the post-Vault lesson, including a forecast or rehearsal before the
  first consequential lore threat. The current onboarding endpoint has no
  such continuation to unlock automatically. Withdrawal remains valid.
- Balance the two draft mechanical pilots and test player comprehension.
  Commission their final card illustrations before including them in a
  released content collection.
- Expand reviewed exposures and lore Events only for demonstrated mechanics;
  review every Artifact for each added fact. Do not build a keyword parser or
  a general hidden-tag query system.
- Independently model multiple deployments only when gameplay needs them;
  visual scale alone does not create another damage or repair obligation.
- Design the duration-based Legacy consequence separately with explicit
  timing, caps, recovery, and history treatment.

Verification covers catalog/source drift, eligibility and self-protection,
selection caps, supply conservation, lifecycle exclusion, reload and duplicate
acknowledgement, repair/bonuses, fixed pools/replay, private-state projection,
presentation gates, and desktop/mobile inspection. No native package was built.
