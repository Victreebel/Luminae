# LUMINAe Blueprint First Pool v0.2

> **Superseded historical design.** Blueprint First Pool v2.0 controls current
> Project rules, including Mantle-to-Orbit Foundry Overdrive and Cipher storage.

## Status

**Optimized opening-pool canon.**

This document supersedes
`LUMINAe_BLUEPRINT_FIRST_POOL_EXPANSION_SPEC_v0.1.md`.

- Antimatter Detonator's card rule is locked.
- Mantle-to-Orbit Foundry's recipe and strengthened effect are locked.
- Worldshield Covenant's recipe and interaction are locked for campaign and
  custom play. Competitive remains disabled behind the release gate.

## Pool Structure

| Blueprint | Verb | Recipe size | Competitive identity |
|---|---|---:|---|
| Antimatter Detonator | Annihilate | 4 | Secret interdiction and delayed Eminence |
| Mantle-to-Orbit Foundry | Elevate | 3 | Automatic Tier II/III industrial acceleration |
| Worldshield Covenant | Preserve | 3 | Public protection and hostile-effect counterplay |

The three recipes are intentionally disjoint. Lumii can pursue whichever
components appear without one intercepted Artifact invalidating the whole boss
loadout. Their purchase costs still share enough common Affinity demand for a
broad boss economy to support all three lines.

## Antimatter Detonator

### Assembly

| Stage | Artifact | Tier | Function |
|---|---|---:|---|
| Reaction | Ignition Kernel | I | Starts the controlled annihilation sequence |
| Containment | Magnetic Bottle | I | Holds the matter/antimatter reaction geometry |
| Trigger | Causal Spark Coil | I | Prevents firing outside its governed consequence chain |
| Boundary | Horizon Extractor | II | Couples the contained event to the marked fabrication signature |

### Locked Competitive Rule

```text
A random Tier II Artifact becomes secretly marked.
When Forged or Encrypted, Annihilate it. Gain 2 Eminence.
```

Broken Covenant campaign text remains hidden until that state is declared:

```text
Annihilate 2 of the Forger's Tier I Artifacts as well.
```

## Mantle-to-Orbit Foundry

### Technology

The Foundry is a complete planetary-to-orbital industrial chain. The Blueprint
contains the mine geometry, ascent architecture, orbital yards, and integration
knowledge. Its Artifacts provide the three irreplaceable enabling technologies.

| Stage | Artifact | Tier | Bonus | Function |
|---|---|---:|---|---|
| Heat routing | Entropy Pyre Baffle | I | Flare | Converts mantle heat and decay into controlled industrial work |
| Material ascent | Mantlelift Driver Coil | I | Continuum | Accelerates sealed feedstock capsules from the crust into orbit |
| Vacuum manufacture | Blackglass Forge Die | I | Abyss | Shapes feedstock precisely without atmosphere or convection |

```text
heat routing -> orbital material lift -> vacuum manufacture
```

If any one component is missing, the project has an obvious failure:

- without the Baffle, the deep works destroy themselves
- without the Driver Coil, feedstock never reaches orbit economically
- without the Forge Die, orbital material cannot become reliable structures

### Locked Rule

```text
When this manifests, gain 1 Eminence.

The first Tier II Artifact you Forge costs 2 fewer standard Affinity.
The first Tier III Artifact you Forge costs 3 fewer standard Affinity.
You must always pay at least 1.

After both reductions are used, this Foundry becomes Spent.
```

Resolution rules:

- Each reduction engages automatically on the first eligible Forge of its Tier.
- Permanent Artifact bonuses are applied before the reduction.
- The reduction cannot pay Singularity.
- Unused reduction cannot move between Tiers.
- Encrypt, Assimilate, and Tier I Forge actions do not use either reduction.
- The public device displays separate Tier II and Tier III readiness indicators.

This is deliberately stronger than the earlier one-use two-token coupon. It
creates the promised industrial arc: the Foundry helps produce a stellar
subsystem and then a galactic achievement.

### Presentation

1. Entropy Pyre Baffle locks around the mantle heat exchange.
2. Mantlelift Driver Coil energizes the vertical ascent line.
3. Blackglass Forge Die seats in the orbital yard.
4. The first feedstock capsule rises and becomes a finished orbital segment.
5. The complete Foundry remains public with Tier II and Tier III readiness.

## Worldshield Covenant

### Locked Assembly

| Stage | Artifact | Tier | Bonus | Function |
|---|---|---:|---|---|
| Early warning | Echo Splinter | I | Continuum | Detects the stress echo of failure before impact |
| Concealed defense | Entropy Veil | I | Abyss | Masks and absorbs the shield's vulnerable decay signature |
| Public coordination | Living Lattice Node | I | Radiance | Lets the shield repair and coordinate under inspectable civic authority |

```text
early warning -> concealed defense -> public coordination
```

These Artifacts are disjoint from both Antimatter and Foundry.

### Locked Rule

```text
When this manifests, gain 1 Eminence. Place it as Vigilant.

The first time another civilization's effect would Burn, Annihilate, Nullify,
or cancel your legal claim of one Artifact, prevent that outcome for your
Artifact and continue the claim normally. The hostile one-use source is still
expended, but gains no reward that required the Artifact's removal.

Then this Covenant becomes Spent.
```

The interception is automatic. It creates no reaction prompt and no target
choice. Against Antimatter, both devices become Spent, the protected claim
continues normally, and Antimatter grants no Eminence or collateral damage.

## Lumii Boss Economy

The opening boss should not rely on naturally drawing all ten components.
Campaign Lumii receives a curated Artifact supply and an Affinity economy built
to demonstrate the three plans.

Boss rules:

- Lumii genuinely knows all three scenario-controlled Blueprints after the
  Supreme Cipher falls; Antimatter is the primary plan.
- The forecast projects those plans to the player only as anonymous
  `SEALED PROTOCOL // 01–03` states. Blueprint IDs, names, art, recipes,
  silhouettes, presentation variants, and identifying sounds never enter public
  state. Exact consequences become public when they manifest.
- At least two components of that plan enter Lumii's opening reserve or opening
  Forge row.
- Lumii's starting Affinity covers at least one legal component purchase from
  every plan.
- AI priorities value the primary plan first, then any component that advances
  a second plan without delaying an immediate primary purchase.
- Catching one component never blocks another plan because recipes are disjoint.
- Campaign-only assistance is disclosed in the boss briefing; competitive AI
  does not receive these reserves or Affinity grants.

The defense forecast tests whether Lumii can physically preserve the Vault from
the Architect. It does not make her a separate Basilisk intelligence. Victory
causes her to yield because further resistance would fail and create mass
casualty, not because she has reconciled with the Architect.

Antimatter remains the only current reward. Route-weighted future rewards are
deferred: Antimatter favors Dominion then Inquiry; Worldshield favors Kinship
then Inquiry; Mantle-to-Orbit favors Inquiry then Kinship.

## Competitive Release Gate

The pool remains disabled in competitive play until 1,000 Blueprint-aware
simulations and 50 completed human playtest matches meet the secrecy, stability,
completion, detonation, and no-greater-than-two-point win-rate-delta targets.

## Balance Targets

- Antimatter should have the greatest swing and the least guaranteed value.
- Foundry should have the highest reliable long-term value but require later
  Forge actions to realize it.
- Worldshield should be the safest manifestation reward and the easiest for
  opponents to play around once public.
- Completion rates should be measured by simulated availability and purchase
  cost, not merely by counting shared Affinity colors.
- Recipe identities remain exact and owner-visible; broader role matching is
  not part of the opening competitive implementation.
