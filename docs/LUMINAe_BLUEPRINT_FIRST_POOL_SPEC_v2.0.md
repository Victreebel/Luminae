# LUMINAe Blueprint First Pool v2.0

## Status

**Canonical Blueprint and Manifested Project rules for Technology System v2.**
This document supersedes the v0.x first-pool notes and the first-release rules
in `LUMINAe_BLUEPRINT_VERTICAL_SLICE_v1.0.md` where they conflict.

## System Rules

- A normal player has two owner-private Blueprint slots. Lumii receives three
  scenario-authored slots in the first clearance challenge.
- Exact forged components satisfy recipes automatically. Components remain in
  the tableau, keep their bonuses, may satisfy multiple recipes, and are not
  consumed by manifestation unless a later Project rule explicitly moves them.
- Before manifestation, identity, recipe, progress, targets, recovery cards,
  and cosmetic variant remain owner-private.
- After manifestation, Project name, owner, public rule, operational state,
  Covenant state, and presentation become public.
- Simultaneous manifestations queue in assigned-slot order. Required
  presentation pauses input and turn clocks and resumes correctly after
  reconnect.

## Antimatter Detonator

Form and scale: Stellar Device.

| Stage | Artifact |
|---|---|
| Reaction Core | `t1r01` Ignition Kernel |
| Containment Cage | `t1p04` Magnetic Bottle |
| Governed Trigger | `t1r04` Causal Spark Coil |
| Annihilation Sink | `t2o01` Horizon Extractor |

After manifestation, uniformly mark one eligible face-up Tier II Artifact in
ordinary play. If none exists, remain Armed and target the next eligible card.
If another effect removes the target, retarget after that effect and its refill.

A legal Forge or Encrypt of the target consumes the claimant's action before
payment, Annihilates the target, spends no Affinity, grants the Detonator owner
2 Eminence, and leaves the Project Spent. The action was consumed because the
claim was legal; the implementation never completes.

Broken Covenant also Annihilates two random eligible Tier I implementations
belonging to the Forger. Annihilation is not Burn.

Worldshield intercepts before Annihilation. The claim then continues normally,
both one-use Projects become Spent as applicable, and Antimatter grants no
Eminence or Broken collateral.

## Mantle-to-Orbit Foundry

Form and scale: Planetary Infrastructure.

| Stage | Artifact |
|---|---|
| Thermal Baffle | `t1r07` Entropy Pyre Baffle |
| Mantlelift Coil | `t1s02` Mantlelift Driver Coil |
| Vacuum Forge Die | `t1o05` Blackglass Forge Die |

Manifestation grants 1 Eminence. The owner receives an explicit `Foundry Forge`
claim action for Tier II Artifacts. It reduces each nonzero printed natural
Affinity channel by one; Singularity and zero-cost channels are unchanged. It
has two sustainable uses.

The third use is an explicit Overdrive:

- Intact Covenant: finish the Forge, return all three recipe components to their
  respective Tier I Archives, and permanently deactivate the Foundry.
- Broken Covenant: finish the Forge and place the three components in a private
  recovery group. Each component returns through a separate free normal Forge
  action. After all three return, the Foundry becomes Active with zero uses and
  grants no second manifestation reward.

## Ascension Registry

Form and scale: Stellar Institution.

| Stage | Artifact |
|---|---|
| Readiness Verification | `t1p05` Recursive Lens |
| Deferral Boundary | `t1s03` Null-Loop Anchor |
| Public Record | `t1r08` Oathfire Igniter |

When another civilization begins a turn with a legal Tier II claim but makes
none, add one public Deferral counter, at most once per round. Any legal Tier II
claim clears all Deferral counters, including a claim annihilated by Antimatter.

At two Deferrals, gain 2 Eminence. Under Intact Covenant, become Spent. Under
Broken Covenant, clear Deferral and remain Active for later judgments.

## Worldshield Covenant

Form and scale: Planetary Network. It is retained for later Campaign and Custom
play and is not part of Lumii's opening challenge.

| Stage | Artifact |
|---|---|
| Early Warning | `t1s01` Echo Splinter |
| Concealed Defense | `t1o01` Entropy Veil |
| Civic Repair | `t1p06` Living Lattice Node |

Manifestation grants 1 Eminence and makes the Project Vigilant. It intercepts
the first hostile Burn, Annihilation, Nullification, or cancellation of a legal
claim, expends a hostile one-use source without paying its removal reward,
continues the claim normally, and then becomes Spent. Under Broken Covenant it
remains Vigilant after each interception.

## Covenant State

Covenant state is mode-authored and public once declared. Campaign may assign
it per side; Custom uses a symmetric setting; Competitive defaults to
Intact-only. It is not a hidden choice made during resolution.

## First Clearance Challenge

Only wins in standard four-civilization games containing the player and exactly
three Hard AI opponents count. At 5/5 the account becomes `challenge_ready`;
losses never reduce progress.

First Vault entry starts or resumes Lumii's focused 1v1 challenge. Lumii uses
Intact Antimatter, Foundry, and Ascension Registry. Scenario Antimatter weights
publicly observable Tier II desirability 60/25/15 across ranked candidates.
The assistance is disclosed, but the target is not. Cursor, hover, click, and
private player data are never inputs.

Lumii uses Foundry to claim desirable safe Tier II alternatives and avoids her
marked target unless taking it is strategically decisive. Defeat permits a
fresh retry; interrupted attempts resume. Victory reveals the system, grants
Antimatter, equips it in slot one, and leaves Foundry and Ascension as corrupted
Vault records.

## Modes And Balance Gate

- Standard: Blueprint-free.
- Campaign: story-authored ownership, Covenant state, and scenarios.
- Custom: owned Blueprints with symmetric host policy.
- Competitive: disabled until certified.

Competitive requires 1,000 seeded Blueprint-aware simulations and 50 completed
human playtests. The match-wide target is any Project manifesting in 10-20% of
ordinary four-player matches. Reports must also include individual
manifestation rates, Antimatter detonation rate, secrecy failures, stability,
seat bias, and no more than a two-percentage-point Blueprint win-rate delta.

Blueprint gameplay, slots, clearance, and competitive access are never sold.
Only presentation cosmetics may be monetized, with identical timing,
information, reduced-motion behavior, and gameplay.

