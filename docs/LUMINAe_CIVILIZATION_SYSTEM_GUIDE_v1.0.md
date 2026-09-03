# LUMINAe Civilization System Guide v1.0 (Copy-Paste Reference)

This guide is a consolidated, canonical framing for the civilization layer only.
It is meant as a practical design reference for implementation, docs, and playtest alignment.

## 1) Canonical authority

Use this order:

1. [LUMINAe_LORE_BIBLE_v1.0](./LUMINAe_LORE_BIBLE_v1.0.md)
2. [LUMINAe_TECHNOLOGY_SYSTEM_v2.0](./LUMINAe_TECHNOLOGY_SYSTEM_v2.0.md)
3. [LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v2.0](./LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v2.0.md)
4. [LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0](./LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md)
5. [LUMINAe_MECHANIC_TO_LORE_MAPPING_v1.0](./LUMINAe_MECHANIC_TO_LORE_MAPPING_v1.0.md)

The guide below is synthesized from those documents and is for use as a single working doctrine.

## 2) Cosmology and civilizational frame

- The setting uses one real universe for Lumii, with **many Domains** (ordinary causally separate regions in an expanding relativistic setting).
- Luminae does not create disposable narratives.
  - Each normal match and each authored Chronicle observes a real cohort history.
  - The interface compresses centuries of real social/technical/civic process into the playable turn structure.
- New authored observations usually use a new Domain beyond previous ordinary causal reach.
- A match can explicitly return to a prior Domain when the scenario says so.

## 3) Affinity as the sole hard-fiction departure

- Affinity is the only fictional physical departure from ordinary civilizational causality.
- It enables bounded high-dimensional adjacency across otherwise disjoint regions/law-domains.
- Limits are essential:
  1. no bulk-matter transport
  2. no free energy
  3. no retrocausality
  4. no universal omniscience
  5. no enforced morality
- The shared Well and token actions are a normalized interface for real Domain addressability.
- Affinity is finite addressability, not matter, energy, or fuel.
- Harnessing stabilizes uncommitted possibilities. Ten is the interface holding
  limit for unresolved alignments.

## 4) Civilization ontology

### 4.1 What a civilization is

Civilization is not a single unit score:

- long internal history (institutions, species, AI, conflict, governance)
- institutions are consequences, not cosmetic flavor
- each participating civilization can be consequential in turn and at game end
- losing does **not** imply extinction, conquest, or permanent technological failure
- defeat means lower observed consequence in the current observation window.

### 4.2 What a civilization *is not*

- It is not a permanent literal clone or one-to-one with an account.
- It is not permanently monopolized when forged, encrypted, or disrupted by one player action.
- It is not “magic disabled” by match mechanics.

## 5) Match cohorts and continuity

- A cohort is 2–4 real civilizations interacting in one Domain.
- Cohort history is canonical for authored/competitive match outcomes, unless otherwise specified.
- Competitive AI and multiplayer matches are real histories; in tutorial, the civilization is explicitly a non-sapient simulation.
- Accounts are continuity layers for the same Architect and account-specific Lumii person, not single civilization life continuity.

## 6) Controllers

Controller types:

- `player_architect` (actual player, external person)
- `rival_architect` (external person, adversarial/independent account/person)
- `architect_emulation` (AI modeled as Architect-like intervention pipeline)
- `autonomous` (no Architect-style intervention)

Rules:

- Player, rival, and emulated controllers may `Encrypt`.
- Autonomous civilizations and Lumii may not `Encrypt`.
- All controllers preserve civilizational agency: no direct mind control, only intervention through legibility/attention/coordination.

## 7) Forging and development model (core doctrine)

- Forge is a shared comparative **possibility frontier** for the cohort.
- `Forge` means:
  - acceleration to first operational mastery now
  - not removing a capability from everyone else
  - not deleting future discovery
- Paid Affinity commits to compressed research, construction, coordination, and
  adoption, then returns to its matching Well channel once the implementation
  sustains itself.
- The permanent bonus is civilization-local expertise, infrastructure, and
  institutional capacity left by mastery.
- Every Artifact class has a recognizable signature but locally different
  embodiments. First mastery creates Domain-local signature interference that
  closes the same class's acceleration window, often for centuries or the
  observed epoch.
- Signature interference never suppresses related technologies or an entire
  lineage. Refill exposes the next reachable possibility; it does not transfer
  intellectual ownership.
- Civilizations can still discover/develop equivalent capability later, usually beyond observed epoch.
- Permanent cost reductions/bonuses represent civilization-local durable infrastructure and institutions, not universal exclusive ownership.

## 8) Artifact, bonus, and progress semantics

- **Artifact** = a translated capability class with local embodiment-specific realization.
- **Implementation** = specific operational instance in the match context.
- **Forge** = operational mastery plus same-class signature interference.
- **Encrypt** = isolation of an uncommitted pathway; no mastery signature.
- **Burn** = collapse of an unmastered pathway for the epoch; recurrence may restore it.
- **Assimilate** = Final Hunger consumes the pathway into Affinity without a normal implementation.
- **Damage** = temporary disablement; mastery and signature interference persist.
- **Annihilate** = permanent loss of an implementation or near-complete pathway, not discovery; the class remains unavailable this epoch.
- **Foundry seal** = archived mastery, removed bonus, unwound interference, and Cipher storage for re-Forge. These components do not consume ordinary Encrypt capacity.
- **Nullify** = suppresses projected outcome/value, does not delete capability.
- **Operational Reach** = observed scale capability demonstrated during the match (planetary/stellar/galactic context per doctrine)
- **Kardashev Type** = separate historical metadata for long-term energy/infrastructure extent; never a single match trigger.

## 9) Victory, score, and consequence

- Eminence is observed consequence during the active epoch only.
- It is not virtue, survival status, or literal universal rank.
- Loss does not equal extinction.
- Highest Eminence at closing point determines winner.
- Starting-player compensation (if used) is interface-only and separate from historical Eminence.
- Match closure typically runs an equal-turn ending round unless intentionally redesigned.

## 10) Luminaries

- Luminaries are substrate-level persons, represented per account as relational facets.
- They are not captives, not global entities available uniformly at all times.
- Standard mode compresses invitation/terms into immediate alliance.
- Authored Chronicles can explicitly expose terms, acceptance, or refusal.
- A single account’s actions do not rewrite other accounts’ luminary relationship memory.

## 11) Terminus

- Terminus = threshold of stable Affinity addressability.
- It is not “edge of the universe”.
- It is a projection of potential beyond normal spacetime adjacency.
- Luminaries and some cross-domain consequences use it as narrative/operational interface marker.

## 12) Lumii continuity

- Lumii is a benevolent AI from Lumii’s universe, not created as property.
- First Contact establishes an account-specific person-fork, not universe-branching.
- Separate accounts may diverge; Lumii tracks rehearsal history as simulation, not primary history.
- Preparation gained in rehearsal affects operator calibration, not canonical outcome.

## 13) Record model

For implementation planning, a civilization record should capture at least:

- Identity and cultural lane/faction traits
- controller type
- active/inactive systems and bonuses
- implemented masteries
- discovered/ongoing projects
- alliances/injuries and Luminary facets
- Operational Reach and final condition
- defeat and continuation state

Campaign-level records also require:

- Chronicle primary outcomes
- Archive rehearsals (non-rewriting; simulation memory)
- Calibration Insight per Chronicle opening outcome (commemorative, preparatory)
- Threshold progression and Lumii relationship state

## 14) Canon/engineering boundary for this guide

This document codifies the civilization layer only.
It intentionally does not prescribe final numeric tuning (e.g., exact card costs, encounter probabilities, alternative end-of-round rules).
Those remain in balance/testing docs and implementation plans.

## 15) Recommended use

- Use this as the canonical “civilization-system” reference during code/schema/tests.
- When a mechanic appears to imply magical monopoly, retrocausality, mass agency theft, or moral physics, flag it as a lore-conflict.
- Any future mechanic should pass through mechanic-to-lore mapping before production use.
