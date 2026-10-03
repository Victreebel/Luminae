# LUMINAe Event Semantic Consistency Review v1.0

Scope update: this document preserves the v2 review as history. The subsequent [all-tier audit](LUMINAe_ALL_TIER_ARTIFACT_AUDIT_v1.0.md) supersedes conflicting functions and classifications across all 90 Artifacts. Current Event facts v4 use shared canonical functions, with 11 synchronization memberships and seven signal-interpretation responders.

Date: 2026-09-28. Status: classification and inspection changes implemented;
automated verification and player comprehension review are separate checks.

## Scope and outcome

This user-approved pass compared all **90 Artifacts** with their effective
functional lore, practical role, capability assignments, and reviewed Event
dependency: 40 Planetary, 30 Stellar, and 20 Galactic. Tier III uses the bounded
practical functions in `TIER_THREE_ARTIFACT_CANON`, not displaced megastructure
descriptions. Approved lore and dialogue remain unchanged.

The pass corrects clear mechanical mismatches without treating every suggestive
phrase as a new power. Artifacts retain one or two capabilities. It also records
interpretations that still need human comprehension review; complete catalog
coverage does not establish that every player will predict every interaction.

The [fact registry](../lib/game-types/src/artifact-event-facts.ts) is now
`artifact-event-facts-v2`: **five** Artifacts have the distributed-synchronization
dependency, **85** have explicit reviewed exclusions, and **nine** have Signal
interpretation. Signal Clarity and Synchronization Shear remain unpublished
pilots. The seven-card regular Event catalog is unchanged.

## Classification corrections

| Artifact ID | Change | Functional basis |
| --- | --- | --- |
| `t1r07`, `t2r06` | Replace Resource reclamation with Energy conversion; retain Thermal management. | Turning waste heat into useful work or energy does not establish recycling matter. |
| `t1e01` | Add Ecological recovery alongside Ecological propagation. | Replication Spore explicitly repairs damaged land through bounded growth. |
| `t2s06` | Replace Failure isolation with Hazard detection; retain Signal interpretation. | Convergence Lens detects forced convergence; inspection does not itself stop a failure spreading. |
| `t2e04` | Replace Distributed coordination with Signal interpretation; retain Cross-ecology mediation. | Mycelial Relay Spindle explicitly translates signals among different systems. Translation does not establish shared control. |
| `t3e03` | Remove Failure isolation; retain Ecological adaptation. | Its bounded adaptive function does not expressly isolate cascading failures. |
| `t3o02` | Remove Failure isolation; retain Predictive modeling. | Forecasting a dangerous outcome is not preventing its spread. |
| `t3p02` | Remove Precision fabrication; retain Evidence verification. | Verifying fabrication history does not itself fabricate components. |
| `t3s04` | Remove Distributed synchronization dependency; retain its capabilities. | Ordering records across unequal times need not synchronize separated live systems. |

Capability changes can affect authored Chronicle readiness, pressure responses,
operational Civilization Maturity, and Legacy eligibility. They do not change
printed costs, Affinity bonuses, Blueprint recipes, or the seven regular Events'
fixed selectors. Pilot selectors use the revised capabilities and dependency.

## Player-facing evidence

Artifact inspection now exposes capability and dependency labels **below the
lore**, with expandable practical justification and reviewed exclusions. This
lets the player see relevant properties before committing an Artifact without
having to discover the entire classification inside a collapsed section.

A capability describes a response an operational Artifact can supply. A
dependency describes a specific relationship an Event can disrupt. Neither
implies the other: communication or distributed storage alone does not establish
synchronized control, and a protective capability does not grant universal
immunity. Event rules determine lifecycle requirements, target order, caps,
protection, and consequences.

## Acceptance standard for new Events

1. **Lore supports a reasonable hypothesis.** Use the effective practical
   function and functional prose. Names, artwork, Affinity, lineage, and mystery
   sentences must not silently determine eligibility.
2. **Visible properties confirm eligibility.** State the relevant capability or
   reviewed dependency before commitment, with a bounded explanation. Review
   every Artifact for each new dependency; missing metadata is not immunity.
3. **The Event states the exact outcome.** Specify the zone and operational
   state, selection order, per-player limits, protection, and consequence.
   Receipts must identify the actual target or responder and explain why.
4. **Separate opportunity from vulnerability.** A technology that can interpret
   a signal is not automatically fragile to signal effects. Detection is not
   prevention; preservation is not governance; verification is not fabrication.
5. **Test comprehension as well as code.** Have players predict targets from
   the displayed lore and properties before revealing the answer. Investigate
   repeated disagreements rather than declaring the code's answer self-evident.
   Any proposed change to approved prose requires separate authorship approval.

Separate Event decks remove Artifact-deck dilution as a catalog constraint.
Frequency, disruption, readability, and recovery opportunities still require
balance review as the lineup grows.

## Interpretations still requiring comprehension review

These existing assignments remain in place; this pass does **not** certify that
their rationale is obvious from the lore. Review them before expanding Events
that depend on these distinctions.

| Artifact | Open interpretation |
| --- | --- |
| Char Tendril (`t1e03`) | Searching burned ground for surviving life supports recovery assessment, but does not plainly promise early Hazard detection. |
| Facetcell Shard (`t1e05`) | Reconfigurable optical computation is explicit; correctness under noise or failure, implied by Resilient computation, is less explicit. |
| Interstice Gate Seed (`t2s01`) | Gate-site initialization supports a transit role; the System stabilization response is not readily apparent from a seed placed for a possible future gateway. |
| Simulation Loom (`t2s03`) | Predictive modeling is explicit. Evidence verification needs clarification in the mechanical explanation; rejecting simulated futures must not imply changing reality. |
| Continuity Vessel (`t2s04`) | Preserving shared identity is clear. Binding decisions among independent participants, implied by Plural governance, are less clear. |
| Mnemosyne Star-Index (`t2s05`) | Preserving differing worlds' accounts is clear. A shared index does not obviously coordinate separated active institutions or resources. |
| Radiant Erasure Casket (`t2o02`) | The practical role says authorized signal deletion, while flavor describes sealing dangerous knowledge. Deletion and containment are distinct; no wording was silently reconciled. |
| Plural Habitat Forge Heart (`t3r04`) | Fabricating habitats compatible with unrelated life is explicit; Cross-ecology mediation may suggest active exchange beyond compatible construction. |
| Federated Logic Substrate (`t3p03`) | Exchanging proofs without merging identities is explicit; Plural governance may suggest binding collective decisions beyond independent proof exchange. |

The [original compatibility audit](LUMINAe_ARTIFACT_EVENT_COMPATIBILITY_AUDIT_v1.0.md)
records the per-Artifact explanations. The
[lore Event implementation](LUMINAe_LORE_EVENT_IMPLEMENTATION_v1.0.md) describes
resolution and publication boundaries. These checks establish implementation
behavior; balance work, player comprehension, and publication of the pilots
remain separate release work.

## Verification completed

- All 508 backend tests passed, including new behavioral checks for the
  Spindle's Signal Clarity reward and Chronicle readiness, historical ordering
  surviving Shear, detection versus containment, waste-heat conversion, and
  operational Maturity changes preserving historical achievement.
- Twenty focused frontend tests passed, including visible labels, expandable
  explanations, unknown-card handling, Civilization profiles, and dialogue locks.
- Seven browser cases passed across desktop and 390px phone layouts: four Event
  explanations and three Artifact inspections, including keyboard expansion and
  property labels positioned below the unchanged lore.
- Backend and frontend TypeScript checks passed. Scoped lint had no errors; the
  existing card-browser URL-sync hook dependency warning remains.
- Preview verification also corrected a card-browser filter effect that reset
  the URL-selected Artifact during effect replay or hot reload. The local lore
  API was restarted after it was found stopped. No native package was built.
