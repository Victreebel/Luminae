# LUMINAe Blueprint First-Pool Expansion Spec v0.1

> **Superseded historical design.** Blueprint First Pool v2.0 is authoritative;
> this file remains only as first-pool provenance.

## Status

**Historical proposal. Superseded by
`LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v0.2.md`.**

> Historical design record. The recipes and effects in this file are superseded
> by `LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v0.2.md` and
> `LUMINAe_BLUEPRINT_VERTICAL_SLICE_v1.0.md`.

This document proposed two Blueprints to sit beside Antimatter Detonator in the first competitive and campaign family:

- Mantle-to-Orbit Foundry
- Worldshield Covenant

The three projects deliberately arise from overlapping technology. A civilization assembling their shared components should plausibly be preparing to erase a stellar work, industrialize its ascent into orbit, or defend its system. The final arrangement, not the raw material, determines what the civilization becomes.

## Three-Blueprint Identity

| Blueprint | Civilizational Verb | Competitive Role | Campaign Question |
|---|---|---|---|
| Antimatter Detonator | Erase | Hidden interdiction and delayed Eminence | What deserves to be removed from history? |
| Mantle-to-Orbit Foundry | Elevate | Reliable Forge acceleration | What will the civilization lift, and what will it leave below? |
| Worldshield Covenant | Preserve | Public protection and hostile-device counterplay | What must survive, and who is allowed behind the shield? |

## Shared Material Lattice

One current seven-Artifact industrial base supports all three designs without creating a universal component:

| Artifact | Form | Antimatter | Mantle-to-Orbit | Worldshield |
|---|---|---:|---:|---:|
| Ignition Kernel | Power Component / Control Instrument | Reaction Core | Furnace Heart | - |
| Magnetic Bottle | Containment / Power Component | Containment Cage | - | Covenant Shell |
| Causal Spark Coil | Control Instrument / Protocol Object | Governed Trigger | Launch Sequence | - |
| Horizon Extractor | Sensor / Containment | Annihilation Sink | - | Horizon Watch |
| String-Scar Loom | Fabrication Tool / Material | - | Orbital Loom | Shield Lattice |
| Starlift Nozzle | Control Instrument / Containment | - | Starlift Throat | - |
| Silent Recursion Rule | Protocol / Archive | - | - | Ratification Logic |

This produces intentional pairwise overlap:

- Antimatter and Mantle-to-Orbit share Ignition Kernel and Causal Spark Coil.
- Antimatter and Worldshield share Magnetic Bottle and Horizon Extractor.
- Mantle-to-Orbit and Worldshield share String-Scar Loom.
- No Artifact may appear in all three first-pool assemblies.

These are canonical showcase assemblies, not the only legal recipes. The matcher uses forms, affinities, tiers, and constraints exactly as it does for Antimatter Detonator, plus a first-pool eligibility cap: no Artifact may match more than two of these three Blueprint definitions.

Because the locked doctrine currently allows one Artifact to support several active Blueprints, all three should not be assigned to one player in the first competitive test. The recommended first-pool deal is **two owner-visible Blueprints selected from these three**. That preserves ambiguity and overlap without making a seven-Artifact triple manifestation the normal optimal line.

---

# Mantle-to-Orbit Foundry

## Identity

```text
Name: Mantle-to-Orbit Foundry
ID: bp_mantle_to_orbit_foundry
Family: Ascension Industry
Scale: Planetary-to-Orbital
Affinities: Flare / Continuum / Abyss
Competitive role: Reliable Forge acceleration
Campaign civilization: Mantle Choir
```

The Foundry converts the same dangerous heat, containment, and governed sequencing used by the Detonator into a permanent industrial route from a planet's deep energy to orbital manufacture. It is not a single factory. It is the civilizational agreement that the ground and sky now belong to one supply chain.

> A civilization did not escape gravity. It gave gravity a production quota.

## Assembly

The Foundry requires four different eligible Artifacts:

1. **Furnace Heart:** one Flare `Power Component`.
2. **Starlift Throat:** one `Containment` Artifact.
3. **Orbital Loom:** one `Fabrication Tool` or `Material`.
4. **Launch Sequence:** one `Control Instrument` or `Protocol`.

The selected assignment must also include:

- at least one Continuum Artifact
- at least one Tier II or Tier III Artifact

One legal current-roster assembly is:

```text
Furnace Heart: Ignition Kernel (Tier I, Flare, Power Component)
Starlift Throat: Starlift Nozzle (Tier II, Flare, Control Instrument / Containment)
Orbital Loom: String-Scar Loom (Tier I, Continuum, Fabrication Tool / Material)
Launch Sequence: Causal Spark Coil (Tier I, Flare, Control Instrument / Protocol)
```

## Canonical Competitive Rule

```text
MANTLE-TO-ORBIT FOUNDRY
Ascension Industry | Planetary-to-Orbital Blueprint

When assembly is complete, this device manifests automatically.
Gain 1 Eminence. Place it in your public civilization as Ready.

On your next Tier II or Tier III Forge, this Foundry automatically pays up to
2 standard Affinity toward its cost. You must still pay at least 1 Affinity.
Resolve the Forge normally.
Then this device becomes Spent.
```

### Resolution Notes

- Permanent Artifact bonuses apply before the Foundry reduction.
- The reduced cost is used when checking whether the Forge is legal.
- The reduction cannot pay Singularity and cannot reduce the final token payment below 1.
- The Foundry does not apply to Tier I, Encrypt, Assimilate, or non-Forge claims.
- The Foundry engages automatically on the owner's next eligible Forge and creates no reaction prompt.
- If several standard Affinity requirements remain, the payment resolver allocates the Foundry contribution automatically; the owner never chooses an Affinity.
- The normal Artifact Eminence and permanent Affinity bonus are unchanged.
- The Foundry can manifest only once for that owner per match.

The Foundry is intentionally more reliable and less explosive than Antimatter Detonator. Its full competitive value is the guaranteed +1 Eminence and one visible two-token acceleration, not another hidden reward.

## Public States

- `ready`: public, unused, and available for one eligible Forge
- `spent`: public, already used, and permanently visible

## Campaign Role

The Foundry opens the Mantle Choir campaign branch. Its central choice is not whether it works, but what the civilization is willing to industrialize:

- **Lift the cities:** build orbital habitats and evacuation capacity, preserving the planetary biosphere.
- **Strip the mantle:** accelerate stellar expansion at the cost of planetary stability and displaced populations.

Campaign variants may let the Foundry lift an entire Tier I planetary row into a protected orbital state, manufacture mission-specific structures, or supply a later Stellar Blueprint. Those effects do not alter its competitive discount.

## Presentation Direction

The manifestation should visually reuse recognizable component logic without resembling the Detonator:

1. A controlled furnace heart opens below the frame.
2. A containment throat draws a narrow column upward rather than inward.
3. The String-Scar Loom braids the rising material into an orbital track.
4. The Causal Spark Coil authorizes the first payload.
5. A bright industrial ring locks into orbit and remains as the public Ready device.

The audio should climb in pitch and physical height: furnace doors, tensioning cable, heavy elevator catches, then one distant orbital lock. It should feel constructive, dangerous, and immense rather than triumphant or explosive.

---

# Worldshield Covenant

## Identity

```text
Name: Worldshield Covenant
ID: bp_worldshield_covenant
Family: Defensive Accord
Scale: Planetary-to-Stellar
Affinities: Radiance / Abyss / Continuum
Competitive role: Public protection and hostile-device counterplay
Campaign civilization: Covenant Remnant / Null Court
```

The Worldshield is not simply a barrier. Its sensors must recognize a threat, its containment geometry must survive contact, and its protocol must establish who is protected before the emergency begins. The shield works because a civilization made protection into public law.

> The barrier held because everyone had agreed where the world ended.

## Assembly

The Covenant requires four different eligible Artifacts:

1. **Covenant Shell:** one `Containment` Artifact.
2. **Horizon Watch:** one Abyss `Sensor` or `Observatory` Artifact.
3. **Ratification Logic:** one `Control Instrument` or `Protocol`.
4. **Shield Lattice:** one `Material`, `Stabilization`, or Radiance `Civic Signal Object`.

The selected assignment must also include:

- at least one Radiance Artifact
- at least one Tier II or Tier III Artifact

One legal current-roster assembly is:

```text
Covenant Shell: Magnetic Bottle (Tier I, Radiance, Containment)
Horizon Watch: Horizon Extractor (Tier II, Abyss, Sensor)
Ratification Logic: Silent Recursion Rule (Tier I, Continuum, Protocol / Archive)
Shield Lattice: String-Scar Loom (Tier I, Continuum, Material)
```

## Canonical Competitive Rule

```text
WORLDSHIELD COVENANT
Defensive Accord | Planetary-to-Stellar Blueprint

When assembly is complete, this device manifests automatically.
Gain 1 Eminence. Place it in your public civilization as Vigilant.

The first time another civilization's effect would Burn, Annihilate, Nullify,
or cancel your legal claim of one Artifact, this Covenant intercepts it.
Prevent that effect for the protected Artifact and resume the claim normally.
Any hostile one-use source is still expended, but gains no reward that required
the Artifact to be removed. Then this device becomes Spent.
```

### Resolution Notes

- The interception is automatic on the first qualifying event. It creates no reaction prompt or hidden choice.
- The legal claim is checked before the hostile effect and remains the same action after interception.
- The claimant pays the normal cost and receives the Artifact's normal rewards after the interception.
- If the hostile effect affects several Artifacts, the Covenant protects only the owner's claimed or owned Artifact; the rest of the effect resolves normally.
- A hostile device or one-use effect still becomes Spent even though the protected Artifact survives.
- Rewards explicitly contingent on Burn, Annihilation, Nullification, or canceled acquisition are not granted.
- The Covenant does not prevent ordinary cost payment, an illegal claim, an opponent claiming first, or a global victory-requirement change.
- The Covenant can manifest only once for that owner per match.

## Antimatter Detonator Interaction

If the Worldshield owner legally claims the Artifact carrying an Antimatter charge:

1. Reveal the charged target and the attempted detonation.
2. Mark Antimatter Detonator Spent.
3. Mark Worldshield Covenant Spent.
4. Prevent Annihilation and leave the Artifact in its Forge position for the interrupted claim.
5. Resume the claim, including normal payment and rewards.
6. Grant no +3 Eminence to the Detonator owner because no Annihilation occurred.

This gives the first competitive pool one public answer to the Detonator without revealing its private target or making the weapon harmless against unshielded civilizations.

## Public States

- `vigilant`: public, unused, and known to every player
- `spent`: public, interception used, and permanently visible

## Campaign Role

The Covenant opens a campaign branch about the boundary of protection:

- **Open the shield:** protect allied refugees and fragile civilizations, accepting infiltration and resource strain.
- **Seal the world:** guarantee survival for those already recognized by the Covenant, abandoning everyone outside it.

In full-yield campaign scenarios, Worldshield Covenant may protect a Type I civilization or planetary Artifact row from Antimatter Detonator. That confrontation should be a major story resolution, not a normal competitive interaction. A damaged shield may preserve the civilization while permanently changing its world, population, or future campaign state.

## Presentation Direction

The manifestation should answer the Detonator's inward collapse with outward order:

1. Horizon Watch draws a thin black boundary around the threatened world.
2. The Magnetic Bottle unfolds that boundary into a white-gold containment shell.
3. The String-Scar Loom stitches visible weak points into a continuous lattice.
4. The Silent Recursion Rule closes every unratified exception in the protected region.
5. The complete shield remains as a quiet public Vigilant device.

The audio should use distant structural locks, tensioned metal, and a low pressure displacement. It should feel immovable, not angelic, magical, or celebratory.

## First-Pool Balance Shape

The initial comparison is:

| Blueprint | Guaranteed Value | Conditional Value | Counterplay |
|---|---|---|---|
| Antimatter Detonator | +1 Eminence | +3 Eminence and one Tier II Annihilation | Avoidance, retargeting variance, Worldshield |
| Mantle-to-Orbit Foundry | +1 Eminence | Two-token Tier II/III Forge reduction | Public timing; owner must still complete a Forge |
| Worldshield Covenant | +1 Eminence | Preserve one Artifact claim from a hostile effect | Public and automatic; can be baited by an earlier qualifying effect |

Initial tests should measure:

- pairwise completion rates from shared components
- frequency of two Blueprints manifesting from the same state change
- whether the Foundry reduction produces an excessive Tier III rush
- whether Worldshield is useful often enough outside Detonator matchups
- whether Worldshield suppresses Detonator's detonation rate below an acceptable level
- whether two-of-three private assignment creates readable inference without revealing ownership

The first balance adjustment should change effect value, not remove material overlap. The shared industrial ancestry is the point of this pool.
