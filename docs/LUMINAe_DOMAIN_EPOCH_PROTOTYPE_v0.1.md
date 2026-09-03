# LUMINAe Domain Epoch Prototype v0.1

Status: isolated rules laboratory; **not approved for production migration**.

## Boundary and purpose

The prototype lives entirely in `artifacts/domain-epoch-lab`. It does not import the production engine or expose its contracts through production APIs. It changes no live rules, AI, database state, accounts, campaign persistence, tutorial, art, audio, or 90-Artifact catalog.

The laboratory implements a deterministic `Ruleset`, `GameState`, four-action `PrototypeAction`, and `SimulationReport`. Rulesets select a seed, 2–4 civilizations, quick/standard/epic format, one of three evaluation models, the 15- or 30-Artifact catalog, and an isolated optional-module list. Every state contains a replay-grade action log.

## Implemented grammar

- Five Affinity sectors each expose one Program opportunity. Sector decks advance from planetary to stellar to galactic scale.
- Every civilization has two active Program slots.
- **Initiate** moves one frontier Artifact into a slot, refills that sector, and commits one required addressability unit from the Well.
- **Channel** commits exactly two addressability units. Repeating one Affinity in the same action increases Domain Tension.
- **Pivot** abandons an acceleration window, returns actually committed addressability, and adds one Tension.
- **Coordinate** exhausts an operational capability for the epoch. A capability with the condition’s tag addresses it directly for two progress; another capability provides improvised support for one. Only direct coordination grants Eminence.
- A filled Program becomes operational automatically. Its committed addressability returns to the Well, while any lineage substitution returns nothing because it was never a Well unit.
- A valid `Built On` implementation substitutes one requirement on a later Program. This is specific lineage, not a generic discount.
- The acceleration window is exclusive during the observation epoch. Its removal does not erase or monopolize the underlying capability.
- Fixed Eminence, ranked Legacy, and Keystone/Imperative closing-epoch evaluations run on the same state machine.
- The Domain outcome is calculated separately from the most consequential civilization.

When a civilization has no legal intervention at its scheduled interval, LUMINAe records a forced no-intervention interval and advances the observation. This prevents an engine deadlock without inventing a fifth player action. The report treats forced intervals above 1% as a failed gate so the mechanism cannot hide a broken action economy.

## Mechanic-to-lore mapping

| Interface event | Literal historical change | Interface compression |
| --- | --- | --- |
| Frontier refill | The cohort’s next legible acceleration opportunity enters operational reach. | Five sectors summarize a much larger possibility frontier. |
| Initiate | A civilization directs institutions and Affinity addressability toward accelerated mastery. | One choice compresses proposals, consent, research, and early construction. |
| Channel | Temporary Domain addressability is committed to active development. | Units and turns summarize long resource and coordination histories; no free energy is created. |
| Concentrated Channel | Concentration strains the Domain’s bounded addressability network. | One Tension point summarizes mounting systemic risk. |
| Pivot | A civilization abandons the accelerated route while retaining what ordinary history has learned. | The card leaves the observed frontier; underlying discovery is not erased. |
| Program operation | The civilization reaches first operational mastery within the observation epoch. | The Artifact represents one locally specific implementation of a broader capability. |
| Lineage substitution | Existing infrastructure or knowledge directly satisfies one later requirement. | One substituted unit compresses a concrete `Built On` dependency. |
| Coordinate | An operational capability is redirected toward a shared Domain condition. | Exhaustion represents finite attention and deployment capacity during that epoch. |
| Eminence evaluation | LUMINAe compares consequence during the observed era. | It is not conquest, survival, morality, or permanent technological superiority. |
| Domain outcome | The cohort collectively leaves its Domain flourishing, strained, or fractured. | It is intentionally independent of individual comparative rank. |

Civilizations retain agency throughout: Architect choices alter legibility and acceleration opportunities, while the represented civilizations authorize, enact, resist, and bear responsibility for historical action.

## Automated evidence

The committed reports use 100 seeds across 27 configurations: 2/3/4 civilizations × 2/3/5 epochs × three evaluation models, for 2,700 games per catalog.

### 30-Artifact core report

Source: `artifacts/domain-epoch-lab/reports/core-2700.json`

| Gate | Result |
| --- | ---: |
| Completion | **Pass** — 100% |
| Deadlocks | **Pass** — 0 |
| Dominant action | **Pass** — Channel 52.83% |
| Well starvation | **Pass** — 0% |
| Forced no-intervention intervals | **Pass** — 0.081% |
| Both Program slots used | **Pass** — 99.95% |
| Opener-relative seat spread | **Fail** — 21.33 percentage points; limit 4 |

The candidate therefore fails the automated-core gate. It must not proceed to the prescribed 20-session solo study, external recruitment, system expansion, physical production, or production migration in its current form.

### 15-Artifact stress report

Source: `artifacts/domain-epoch-lab/reports/micro-2700.json`

The 15-card micro-loop is suitable for rules/unit testing and the quick graybox, but it is not a viable all-format catalog: the full 2/3/5-epoch stress matrix produces 8.41% forced no-intervention intervals and a 26.67-point seat spread. This does not invalidate its narrower micro-loop role; it prevents treating the small catalog as a complete game.

## Human and commercial gates

No human preference, teach-time, wall-clock duration, blind-identity, physical-viability, or legal conclusion has been recorded. Those gates remain deliberately unstarted because the automated seat-parity condition failed. A later commercial review must address final rule expression, layout, branding, trade dress, provenance, and relevant jurisdictions; there is no percentage-different shortcut.

## Next candidate question

The next rules iteration should target initiative without smuggling a hidden historical Eminence adjustment into the result. Candidate experiments should be isolated behind new ruleset parameters and compared on the same seeds. The strongest initial tests are balanced initiative sequences, frontier-choice timing changes, or comparative evaluation at equal information horizons. Acceptance thresholds must remain unchanged.
