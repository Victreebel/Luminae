# LUMINAe Blueprint Spec: Antimatter Detonator v0.1

## Status

**Core effect locked. Competitive legality remains provisional pending playtest.**

This is the first Blueprint specified to an implementation-ready rules level. It follows the system doctrine in `docs/LUMINAe_BLUEPRINT_SYSTEM_DESIGN_v0.1.md`:

- the owner alone sees its identity, requirements, and progress before completion
- the Civilization Tab tracks assembly during a match
- the Blueprint Vault tracks ownership, assignment, mastery, and history outside a match
- obtaining the final component automatically manifests a public device
- every manifestation plays a device-completion cinematic
- the public device carries one owner-secret charge after Blueprint completion
- competitive access is standardized by the seasonal legal pool
- campaign may add story consequences without changing the competitive rule

## Decision Summary

```text
Name: Antimatter Detonator
ID: bp_antimatter_detonator
Family: Catastrophe Engine
Scale: Stellar
Strategic classification: Type II precision interdiction device; anti-Type I at full campaign yield
Affinities: Flare / Abyss / Radiance
Unlock tier: Core
Role: Guaranteed reward for defeating Lumii's First Clearance challenge
Competitive legality: Provisional; intended for the first legal pool
Assembly: 4 distinct eligible Artifacts in 4 functional sockets
Manifestation: Automatic when the final component is obtained
Manifest reward: None
Public device state: Armed
Secret target: 1 random face-up Tier II Forge Artifact; owner-visible only
Trigger: A legal Forge or Encrypt claim of the target
Detonation reward: +2 Eminence
Detonation: Cancel the claim before payment, Annihilate the target, then become Spent
Broken Covenant: Also Annihilate 2 random Tier I Artifacts belonging to the Forger
Components consumed: No
Manifestation limit: Once per player per match
```

## Identity

### Civilization Fantasy

The Antimatter Detonator is not merely a bomb. It is the complete civilizational apparatus required to produce an annihilation charge, keep matter and antimatter apart, govern the ignition sequence, and decide whether firing is permissible.

Its deepest secret is not antimatter. Its deepest secret is controlled refusal: a civilization has learned to hold extinction in a stable state without confusing capability for permission.

### Lore Position

- Civilization lane: black-furnace / catastrophe-governance civilization
- Natural affinities: Flare supplies release, Abyss supplies the annihilation boundary, Radiance supplies containment and public authority
- Natural Luminary consequence: The Iron Harbinger
- Campaign question: What does a civilization become after it proves it can erase something completely?

### Canonical Flavor Line

> The charge was never the secret. The civilization that could agree on when not to touch it was.

## Canonical Player Rule

```text
ANTIMATTER DETONATOR
Catastrophe Engine | Stellar Blueprint

ASSEMBLY
Reaction Core: Ignition Kernel
Containment Cage: Magnetic Bottle
Governed Trigger: Causal Spark Coil
Annihilation Sink: Horizon Extractor

MANIFESTATION
When assembly is complete, this device manifests automatically.
Place it in your public civilization as Armed.
After prior submitted actions settle, secretly attach its charge to one random
face-up Tier II Forge Artifact. Only you see which Artifact is charged.

SECRET CHARGE
When any player legally attempts to Forge or Encrypt the charged
Artifact, reveal it and cancel that claim before payment. The action is spent.
Annihilate the Artifact, refill its Forge position, and gain 2 Eminence.
Then this device becomes Spent.

BROKEN COVENANT — HIDDEN UNTIL DECLARED
Annihilate 2 random Tier I Artifacts belonging to the Forger as well.
```

The short card rule is authoritative. The sections below define how each line resolves.

## Assembly Specification

### Socket 1: Reaction Core

Requires **Ignition Kernel** (`t1r01`). It starts and regulates the controlled
reaction without turning the Blueprint into a general furnace.

### Socket 2: Containment Cage

Requires **Magnetic Bottle** (`t1p04`). It holds the opposed matter fields apart
until the governed trigger permits contact.

### Socket 3: Governed Trigger

Requires **Causal Spark Coil** (`t1r04`). It binds ignition to a defined
consequence chain and prevents accidental or premature release.

### Socket 4: Annihilation Sink

Requires **Horizon Extractor** (`t2o01`). It samples and couples the annihilation
boundary to the marked Artifact's fabrication signature without opening an
unrestricted path through forbidden physics.

### Global Constraints

All four exact Artifacts must belong to the owner and remain eligible for
Blueprint assembly. Components are not consumed and may continue to contribute
their normal Affinity bonuses.

### Eligible Artifact Pool

Assembly reads:

- the owner's forged Artifacts

The matcher excludes:

- reserved but un-forged Artifacts
- Assimilated Artifacts
- Artifacts recorded in `blueprintBlockedCardIds`
- any Artifact whose active rule explicitly says it cannot be used for Blueprints

Discounted or zero-cost forges remain eligible unless another rule blocks them.

### Automatic Tracking

The owner never manually slots ordinary Artifacts in v1. Each exact socket
fills automatically when its Artifact becomes eligible. The Civilization Tab
shows the four records and their current status to the owner only. Obtaining the
last missing Artifact queues manifestation after the supplying action settles.

## Manifestation Specification

### Trigger

Manifestation requires no player action. It triggers automatically after a state change leaves the owner with:

- all four exact component sockets filled
- no prior Antimatter Detonator manifestation that match
- no current effect explicitly preventing Blueprint manifestation

The action or effect that supplied the final component finishes resolving before the manifestation sequence begins.

### Resolution Order

Resolve manifestation in this order:

1. Re-evaluate the owner's private socket matching after the current action or effect settles.
2. Mark the Antimatter Detonator completed.
3. Create its public manifested-device state as `armed`.
4. Queue a `BlueprintManifestationEvent` for the Antimatter Detonator.
5. Play the manifestation cinematic without overlapping another major cinematic.
6. Return to the board with the Armed device anchored to the owner's public civilization display.
7. Mark every action submitted before manifestation as ineligible to trigger the new charge.
8. After all such actions settle, secretly select one random face-up Tier II Forge Artifact as the charged target.
9. Continue with resulting Luminary-arrival and victory presentation.

If the same state change completes several Blueprints, their manifestation events play in assigned Blueprint-slot order.

The manifestation event is global. Board input and turn timers remain gated for the shared cinematic window, and cosmetic variants may not change that window.

### Public Device State

The manifested Antimatter Detonator has two states:

- `armed`: public, carrying one unused owner-secret charge
- `spent`: public, already detonated, and no longer usable

Every player can inspect its name, owner, trigger rule, eligible target tier, and current state. Only the owner receives the charged Artifact ID. The device remains visible after becoming Spent.

## Secret Charge Specification

### Target Selection

- Select uniformly from the face-up Tier II Forge Artifacts after all actions submitted before manifestation have settled.
- Store the charged Artifact ID in the owner's private Blueprint projection only.
- Opponents know that one eligible Tier II Artifact is charged, but receive no marker, index, or probability hint identifying it.
- If no face-up Tier II Artifact exists, the device remains Armed without a target and attaches automatically when the next eligible Tier II Artifact enters the Forge.
- The owner cannot manually select, move, or reveal the charge.

### Trigger

The charge triggers when any player, including its owner, submits a legal action that would claim the charged Artifact from the Forge by:

- Forging it
- Encrypting it

The claim must be legal before the charge is checked. A Forge attempt therefore requires sufficient Affinities after normal discounts, and Encrypt must satisfy its normal prerequisites. An action submitted before the Detonator manifested cannot trigger it. Assimilation does not trigger this version of the device.

### Detonation Resolution

Resolve the first legal claim of the charged target in this order:

1. Reveal that the claimed Artifact carried the charge.
2. Cancel the claim before any Affinity payment, return, Singularity gain, printed Eminence, permanent bonus, marker transfer, or other claim reward.
3. Consume the claimant's action.
4. Mark the Antimatter Detonator `spent`.
5. Remove the target and its markers permanently to the public Annihilated zone.
6. Refill the vacated Forge position under the normal Tier II refill rule.
7. If Broken Covenant is declared, randomly select and Annihilate up to two eligible Tier I Artifacts belonging to the Forger. The Forger makes no selection.
8. Grant the Detonator's owner 2 Eminence.
9. Resolve resulting Luminary and victory checks.

Annihilation is not a Burn. It creates no Burn event, never enters the Burn Pile, cannot return through Eternal Recurrence, and does not count for Catalyst Bloom or other Burn observers.

### Worldshield Interception

Worldshield Covenant intercepts before Annihilation. Reveal the charged target,
mark both devices Spent, grant no Antimatter Eminence or Broken Covenant
collateral, and continue the protected legal claim normally, including payment
and the Artifact's normal rewards.

### Retargeting Before Detonation

If a non-claiming effect removes, Burns, returns, randomizes, or otherwise makes the charged Artifact unavailable before a legal claim triggers it, finish that effect and its Forge refill first. Then secretly select a new random face-up Tier II target. This is relocation of the same unused charge, not an additional charge or detonation.

Implementation should identify this event with `sourceType: "blueprint_device"` and `sourceBlueprintId: "bp_antimatter_detonator"`, rather than pretending a Luminary caused it.

### Components After Manifestation

- Components are not spent, discarded, locked, or removed.
- The same Artifacts may continue to satisfy another owned Blueprint.
- The completed Blueprint remains visible in the owner's private Civilization Tab history.
- The public manifested device remains visible for the rest of the match.
- The Antimatter Detonator cannot manifest a second time for that owner that match.

## Secrecy and Public Information

### Before Completion

Only the owner sees:

- that the Antimatter Detonator is active
- its four sockets
- matched components
- partial progress
- whether the assembly is one component away from manifestation

Opponents see only the owner's normally public civilization state. They may infer the project from forged Artifacts, but receive no Blueprint confirmation or progress indicator.

### On Manifestation

The public event shows:

```text
[Civilization] manifested the Antimatter Detonator.
Device status: ARMED.
```

The cinematic reveals the completed device. Afterward, every player can inspect its public trigger rule, Tier II eligibility, and Armed state. The public event does not reveal the owner's prior progress, requirement pattern, socket-to-Artifact mapping, or charged Artifact.

The owner privately sees which Tier II Artifact carries the charge. Opponents receive no target marker.

### On Detonation

```text
[Artifact] triggered [Civilization]'s Antimatter Detonator.
[Artifact] was Annihilated.
[Civilization] gained +2 Eminence.
Device status: SPENT.
```

## Mode Behavior

### Competitive

- Uses the exact canonical rule above.
- The Blueprint can appear only while included in the curated seasonal legal pool.
- Every cleared player in that queue has equal access regardless of account ownership.
- It is dealt or selected privately according to the competitive assignment rule eventually locked for the season.
- Its identity and progress remain owner-only until manifestation.
- Once manifested, the Armed or Spent device, Tier II target eligibility, and trigger rule remain public; the charged Artifact remains owner-only until detonation.
- No action submitted before manifestation can trigger the charge.
- A claimant never loses Affinities or receives the charged Artifact's rewards.
- No competitive variant may attach the charge to another player's forged or reserved Artifact.

Competitive legality remains provisional until simulation and live playtests confirm the hidden charge does not create excessive Forge avoidance, first-player advantage, or seat-order bias.

### Campaign

The Antimatter Detonator is the recommended Blueprint granted by First Clearance. Its device manifests before the campaign asks what the player will do with it.

Its first campaign manifestation should present an explicit story choice:

**Fire the charge**

- resolves the mission's destructive objective
- opens the Fired Sun branch
- attracts or awakens The Iron Harbinger
- records a detonation in the player's Chronicle

**Seal the charge**

- preserves the target or refuses the destructive objective
- opens the Unfired Sun branch
- points toward the Causality Audit Court or Worldshield Covenant
- records restraint in the player's Chronicle

The first choice may define that campaign run's canon, but replaying the mission must allow the other branch. Neither branch may permanently withhold competitive power. Branch rewards should be lore, cosmetics, titles, campaign scenarios, or alternate Blueprint art.

Campaign missions may replace the normal secret Tier II target with a named mission target, boss shield, structure, or narrative object. The competitive rule remains unchanged.

Campaign may also permit **full-yield deployment** against a Type I civilization. At that scale, the consequence must feel civilizational rather than surgical: it may Annihilate an entire planetary Artifact row, erase a planetary defense or infrastructure network, or determine whether that civilization survives the mission. Full-yield deployment is campaign-only and creates no precedent for expanding the competitive effect beyond one charged Tier II Artifact.

Campaign may add a third public device state, `sealed`, after the player explicitly refuses detonation. Sealed is a narrative terminal state and cannot later detonate during that mission.

### Private / Custom / Casual

- Available when the mode permits the player's owned collection, all Blueprints, or a host-selected set containing it.
- Uses the canonical competitive rule unless the host selects a clearly labeled campaign or Chronicle modifier.
- Custom modifiers may disable the secret charge while preserving automatic manifestation and its public device reveal.

### Practice

- Available after First Clearance when the selected practice pool contains it.
- The player may inspect socket matching, manifestation, private target presentation, and public detonation without risking rank.

## First Clearance Presentation

Before First Clearance, neither its name nor its silhouette appears. It is covered by the account-wide Top Secret concealment rule.

The third victory reveals only the clearance challenge:

```text
CLEARANCE THRESHOLD MET
AUTHORIZED VAULT CHALLENGE AVAILABLE
```

After defeating Lumii:

- the Blueprint Vault opens
- Antimatter Detonator becomes owned
- its full lore entry becomes readable
- it is assigned to the player's first collection loadout
- its first campaign node becomes available

Automatic assignment should not override a later player-edited loadout.

## Blueprint Vault Tracking

Track at account level:

- owned/unlocked state and unlock timestamp
- assigned loadouts
- total match completions
- total device manifestations
- competitive completions
- campaign completions
- charges detonated
- campaign charges sealed
- matches ended while the device remained Armed
- charged Tier II target IDs
- detonation claim types and whether the owner triggered them
- pre-detonation retarget count
- first campaign branch choice
- mastery rewards earned

Do not track socket progress between matches. Assembly always begins from the current match's civilization.

## Mastery Objectives

All mastery rewards are cosmetic, narrative, or status-only.

### Controlled Annihilation

Manifest the Antimatter Detonator for the first time.

Reward direction: Blueprint seal or Vault frame.

### The Unfired Sun

End a match with the manifested device still Armed, or explicitly Seal it in campaign.

Reward direction: title and restrained white-gold art variant.

### Event Horizon Scar

Have another civilization trigger the charged Artifact.

Reward direction: detonation trail or manifestation cinematic variant.

### Four Keys

Manifest it using Flare, Continuum, Abyss, and Radiance components across its four sockets.

Reward direction: prismatic socket treatment or Chronicle entry.

## Presentation Direction

### Blueprint Art

Show a civilization-scale containment installation, not a handheld bomb:

- two counter-rotating reaction chambers separated by a narrow black interval
- a white-gold Radiance containment cage
- red-orange Flare energy held under extreme compression
- an Abyss boundary rendered as missing light, not dominant purple fog
- a small governed-trigger geometry visibly separated from the charge
- no planet-destroying explosion in the static owner view
- no baked-in title, rules text, icons, or UI

### Manifestation Cinematic

The visible outcome should be precise rather than noisy:

1. The four owner sockets lock in sequence.
2. Twin fields counter-rotate around a dark central interval.
3. The fields touch in a brief white point.
4. The complete device resolves around that point as the private Blueprint panel gives way to its public form.
5. The Antimatter Detonator appears on the owner's civilization display with an `ARMED` state.

Opponents see the manifestation cinematic and the completed device, but never the pre-completion owner panel, requirements, or progress.

### Detonation Event

Detonation uses a shorter public sequence:

1. The visible Armed device opens its containment geometry.
2. The charged Tier II Artifact is revealed and folds inward to a white point before the claim can resolve.
3. Its empty Forge position refills as the Artifact is recorded in the Annihilated zone.
4. The device closes into a visibly inert `SPENT` state.

The detonation sequence must not replay the full manifestation cinematic.

### Audio Direction

- controlled containment hum during lock-in
- sudden removal of low frequencies immediately before contact
- one short, dry resolve for manifestation rather than a long explosion
- a sharper collapse impact for later detonation
- a narrow residual tone for a campaign-sealed outcome

## Suggested Data Definition

```ts
const ANTIMATTER_DETONATOR: BlueprintDef = {
  id: "bp_antimatter_detonator",
  name: "Antimatter Detonator",
  family: "catastrophe_engine",
  affinities: ["flare", "abyss", "radiance"],
  tierBand: "stellar",
  unlockTier: "core",
  competitiveLegal: true,
  requirements: [
    { type: "artifact", id: "t1r01", socket: "reaction_core" },
    { type: "artifact", id: "t1p04", socket: "containment_cage" },
    { type: "artifact", id: "t1r04", socket: "governed_trigger" },
    { type: "artifact", id: "t2o01", socket: "annihilation_sink" },
  ],
  device: {
    visibility: "public_on_manifestation",
    initialState: "armed",
    persistentStates: ["armed", "spent"],
    privateTarget: {
      zone: "forge",
      tiers: [2],
      selection: "random_face_up",
      visibility: "owner_only",
      retargetWhenUnavailable: true,
    },
    trigger: {
      timing: "before_legal_claim_resolves",
      claimActions: ["forge_artifact", "encrypt_artifact"],
      submittedBeforeManifestationIsSafe: true,
      claimantPayment: "cancel_before_payment",
      claimantAction: "consumed",
      effect: "annihilate_and_refill",
      ownerEminence: 2,
      brokenCovenant: {
        visibility: "hidden_until_declared",
        randomForgerTierOneAnnihilations: 2,
      },
      nextState: "spent",
    },
  },
  campaignUnlock: "campaign_antimatter_first_signal",
};
```

The production schema may differ, but it must preserve private Blueprint projection before completion and public device projection after manifestation.

## Edge Cases

1. **Several Blueprints complete together:** manifest each device in assigned slot order; do not overlap cinematics.
2. **No face-up Tier II target exists:** manifestation remains legal; attach when the next eligible target enters the Forge.
3. **An action was submitted before manifestation:** it resolves without triggering the new charge; choose or re-evaluate the target afterward.
4. **Several players claim the target:** the first legal resolved claim detonates it; later claims use normal missing-target recovery.
5. **The target leaves through a non-claiming effect:** finish that effect and refill, then secretly retarget the same unused charge.
6. **Phoenix Paradox or Catalyst Bloom is active:** Annihilation neither returns through Eternal Recurrence nor creates a Burn payout.
7. **The target has a Forge marker:** remove the marker permanently with the Annihilated Artifact; no marker effect transfers to the claimant.
8. **Components change during an action:** evaluate only after the supplying action or effect settles; never begin a partial manifestation.
9. **Manifestation or detonation reaches the victory threshold:** complete the corresponding cinematic before victory presentation.
10. **Two active Blueprints use the same Artifact:** allowed; socket exclusivity applies within each Blueprint, not across the owner's entire loadout.

## Balance Targets

Initial playtest hypotheses:

- equipped-match completion rate: 25-40 percent
- typical manifestation window: 7-12 Eminence
- competitive win-rate delta versus the legal-pool average: no more than 2 percentage points
- detonation rate: 50-80 percent of manifestations
- owner-triggered share: below 65 percent of detonations
- claim avoidance after manifestation: measurable but not sufficient to freeze Tier II play
- no meaningful seat-order advantage attributable to the hidden charge

A read-only baseline of 200 four-player Hard-AI games produced 13.49 forged Artifacts per player at match end on average, with winning players averaging 16.65. That confirms four distinct sockets are structurally plausible, but it does not replace a Blueprint-aware simulation in which players intentionally pursue these requirements.

Adjustment order if too difficult:

1. Improve assigned-pool and campaign availability for the four exact Artifacts.
2. Give the owner one public component lead rather than broadening the recipe.
3. Preserve the four technologies; do not reduce the first Blueprint to a raw Artifact count.

Adjustment order if too strong:

1. Reduce the detonation reward from 2 Eminence to 1 Eminence.
2. Delay target eligibility until the owner's next turn or planning window.
3. Require two selected components to be Tier II or higher.

Do not balance it by taking the claimant's Affinities, consuming forged components, adding repeated competitive charges, or permitting attacks on another player's tableau. Those changes would make the hidden objective punitive and substantially harder to understand.

## Acceptance Criteria for Lock

The design is ready to lock when these statements are accepted:

```text
Antimatter Detonator is the First Clearance Blueprint.
It uses four distinct owner-visible assembly sockets.
Its canonical affinities are Flare, Abyss, and Radiance.
Obtaining the final component manifests it automatically without an immediate Eminence reward.
Its manifestation always plays a cinematic and leaves an Armed public device in play.
The owner alone sees one randomly charged face-up Tier II Artifact.
A legal Forge or Encrypt claim detonates before payment, Annihilates the target, grants the owner +2 Eminence, and leaves the device Spent.
The claimant spends the action but loses no Affinities and gains no Artifact rewards.
The Detonator carries one charge per player per match and never attacks an already forged or reserved Artifact.
When Broken Covenant is declared, detonation also Annihilates 2 random Tier I Artifacts belonging to the Forger.
Campaign may branch on firing or sealing the charge.
The Iron Harbinger is its first boss consequence.
```
