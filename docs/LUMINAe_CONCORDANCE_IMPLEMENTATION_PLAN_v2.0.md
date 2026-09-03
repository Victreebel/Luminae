# LUMINAe Concordance Implementation Plan v2.0

## Status

**Approved doctrine translated into a future engineering plan.** This document
does not itself authorize execution. It supersedes implementation assumptions
that used Reach, Civilization History, non-canonical standard projections,
Kardashev match triggers, or mastery-gated Threshold access.

## Rollout Principles

1. Preserve unrelated worktree changes and treat all existing concordance code
   as provisional until reconciled file by file.
2. Use additive persistence migrations and compatibility reads. Never fabricate
   Chronicles from legacy matches.
3. Feature-flag Domain/Chronicle persistence and the story hub independently.
4. Keep Singularity in production until Focus passes simulations and structured
   human play; do not couple the ontology migration to that experiment.
5. Do not ship the story hub as complete until Chronicle One supports a primary
   defeat and a successful Rehearsal.

## Phase 1: Shared Contracts And Persistence

- Replace public `Reach` terminology with **Domain** and `Civilization History`
  with **Chronicle**. During migration, accept deprecated identifiers on reads
  but emit canonical terminology from new APIs.
- Define globally unique Domain and cohort records for every 2–4-player match,
  including observation epoch, scenario identity, controller types, all final
  civilization states, and explicit prior-Domain return when authored.
- Give each account full access to its own civilization record and a read-only
  cohort summary. Authored Chronicles retain complete consequential state for
  every participant according to campaign access policy.
- Persist Architect statistics, individual civilization records, Domain/cohort
  summaries, Chronicle primary outcomes, Rehearsals, Calibration Insights,
  Lumii relationship state, hidden dimensions, and account-sealed Luminary
  relations as distinct concepts.
- Record that Lumii observed each Rehearsal as a simulation without changing the
  primary outcome, hidden-dimension inputs, or historical ending inputs.
- Migrate cleared Vaults, tutorial completion, First Contact stance, and legacy
  Signals unchanged. Label under-specified older matches Legacy Comparisons.

### Public interface minimum

New shared contracts must expose `domainId`, `cohortId`, `chronicleId` when
applicable, `observationEpoch`, `controllerType`, `finalCivilizationStates`,
`primaryOutcome`, `rehearsalOfChronicleId`, `calibrationInsightEarned`, and
account access level. Controller values remain `player_architect`,
`rival_architect`, `architect_emulation`, and `autonomous`.

## Phase 2: Engine Concordance

- Assign one Domain to every new 2–4-player match. Rematches receive a new
  Domain unless an authored scenario explicitly returns to the prior Domain.
- Enforce Encrypt legality server-side: player, rival, and emulated Architects
  may Encrypt; autonomous civilizations and Lumii may not.
- Preserve discovery separately from implementation state. Damage disables and
  repair restores an implementation; Annihilate removes the implementation but
  retains discovery.
- Keep immediate Luminary qualification. Store starting-position balance in an
  interface-only initiative adjustment excluded from historical Eminence.
- Remove provisional Kardashev match triggers. Introduce Operational Reach only
  after new numerical calibration; store literal Kardashev Type separately and
  never derive it from a single Forge.
- Keep current Forge costs, refill, first-claim removal, and permanent bonuses.
  Their approved historical meaning is interface doctrine, not a reason to
  alter balance in this phase.
- Expose Built On and Leads Toward in Artifact details and use them in authored
  objectives and autonomous priorities without making them standard purchase
  prerequisites.

## Phase 3: Chronicle Campaign

- Build the principal single-player `/story` surface around **The Three
  Chronicles**: Trace, Recurrence, and Triangulation remain calibration signal
  names.
- Each Chronicle declares 2–4 named civilizations, every controller, a visible
  preparedness objective, primary victory and defeat consequences, and its
  later echoes.
- Write the first result once as primary canon. Permit Archive Rehearsals that
  Lumii remembers as simulations. Primary or Rehearsal preparedness may grant
  one Insight without rewriting history.
- Unlock the Vault Threshold after all three primary outcomes regardless of
  result. Use each Insight to unredact one exact protocol consequence or
  forecast; never use Insights to deny access.
- Keep the Threshold conflict as an Architect–Lumii relationship rupture while
  preserving the global Covenant.
- In standard matches, Luminary contact remains compressed and automatic. In
  Chronicles, pause for terms, acceptance, or refusal.
- Retire the Decryption Key as a power item; preserve existing copies only as
  non-power Archive collectibles and preserve already-cleared accounts.

## Phase 4: Presentation And Tutorial

- Rename player-facing Reach/History labels to Domain/Chronicle and separate the
  Architect statistical profile from civilization, cohort, Domain, Chronicle,
  and Luminary records.
- Describe ordinary matches as real Domain cohort histories rather than
  projections. Describe the Forge as a comparative frontier and the Well as
  finite temporary Domain addressability.
- Label the tutorial civilization as a non-sapient interface simulation while
  preserving real First Contact. Teach persistence and real consequences at the
  opening of Chronicle One, not inside the control tutorial.
- Use Operational Reach for match progression and reserve Kardashev Type for
  historical metadata. Never call Singularity a sixth natural Affinity.
- Replace prophecy claims with inference, prediction, reordered presentation,
  or uncertainty consistent with the Lore Bible.

## Phase 5: Evidence-Gated Mechanics

- Calibrate candidate Operational Reach thresholds so 70–90% of standard
  winners achieve Galactic Operational Reach near match end, completion remains
  at least 99.5%, game length stays within 10% of baseline, and opener-relative
  spread remains within four percentage points. Do not reuse 5/4/1 without new
  evidence.
- Test Artifact-bound Focus against portable Singularity with identical seeds.
  A challenger must match or improve completion and seat parity, keep game
  length within 10%, preserve Encrypt use and reserved-Forge conversion within
  20%, pass Blueprint regression simulations, and perform at least as well in
  structured human play.
- If Focus fails, retain Singularity as finite Architect-only LUMINAe capacity,
  visually distinct from the five natural modes and from the Domain Well.
- Do not retest end-of-round Luminary claims without a materially different
  design; the existing candidate failed its stated gate.

## Verification

- Add migration fixtures for cleared, partial, tutorial-only, legacy, and new
  accounts, including compatibility reads from provisional Reach/History data.
- Test Domain assignment, explicit authored returns, 2/3/4-player cohorts,
  controller-specific Encrypt legality, final-state recording, account access,
  Damage/repair, Annihilation memory, sealed facets, and initiative separation.
- Test primary defeat, continued Chronicle access, primary and Rehearsal
  Insights, Lumii's simulation memory, withdrawal, Threshold rupture, and an
  intact Covenant.
- Test multiplayer accounts sharing one Domain while receiving only their own
  full civilization record plus the cohort summary.
- Run Artifact, Luminary, Blueprint, Operational Reach, and Encrypt simulation
  matrices before enabling changed rules.
- Restore all API and frontend tests, then run library and application
  typechecks plus the web build. Treat the currently stale four frontend tests
  as unresolved until implementation updates their approved terminology.
- After any tutorial copy or behavior change, complete the production tutorial
  from First Contact through victory in a browser. Before story rollout,
  complete Chronicle One through a primary defeat and a successful Rehearsal.
- Do not repackage the native app unless separately requested.

## Acceptance

The program is complete only when documentation, public contracts, persistence,
engine behavior, story presentation, migrations, tests, simulations, and
browser verification all describe the same ontology. Passing compilation alone
is not concordance.
