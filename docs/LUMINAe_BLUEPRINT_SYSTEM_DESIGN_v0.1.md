# LUMINAe Blueprint System Design v0.1

## Status

**System doctrine with a locked first-release implementation.**

`docs/LUMINAe_BLUEPRINT_VERTICAL_SLICE_v1.0.md` controls every first-release
detail. The broader ideas below remain future-facing only where that document
does not specify behavior.

This document turns the locked Blueprint direction into an implementable design target. It is not code and does not supersede the artifact replacement tables. It should be read alongside:

- `docs/LUMINAe_TECHNOLOGY_SYSTEM_v1.0.md`
- `docs/LUMINAe_BLUEPRINT_TO_ARTIFACT_DEPENDENCY_MAP_v0.2.md`
- `docs/LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.4_UTILITY_FIRST_LORE.md`

Where those older planning documents disagree about the Artifact/Blueprint
hierarchy, `LUMINAe_TECHNOLOGY_SYSTEM_v1.0.md` controls.

## Locked Doctrine

```text
The 5/5 threshold activates the Architect-owned Supreme Cipher.
Deactivating that Cipher exposes Lumii's independent firewall.
Defeating Lumii's defense forecast reveals the system and the first Blueprint.
Competitive standardizes Blueprints.
Campaign reveals further Blueprints.
Custom lets players choose Blueprints.
The Civilization Tab governs assembly during a match.
The Blueprint Vault governs ownership and assignment outside a match.
Blueprints are private plans. Completed devices are public manifestations.
```

Blueprints are inherited civilizational secrets: exceptional devices and
projects synthesized from forged Artifacts, recovered through campaign
progress, standardized for competitive fairness, and configurable in
private/custom play.

The Blueprint system is itself a secret until the player earns clearance. Before that moment, the game must not use the word "Blueprint" in player-facing UI.

## Design Pillars

1. **Blueprints carry secret synthesis.**
   Tier I Artifacts are planetary enabling technologies and Tier II Artifacts are stellar subsystems. Tier III Artifacts may be complete galactic works. Blueprints are distinguished by hidden assembly knowledge: they synthesize specific public technologies into an exceptional device or project, whether compact or immense.

2. **Blueprints create strategic direction without replacing the race to the configured Eminence target.**
   They should add a private mid/late-game agenda for the owner, not become a separate game stapled onto the board.

3. **Blueprint access is mode-defined.**
   Competitive fairness, campaign mystery, and private flexibility are different needs and should not be forced into one access model.

4. **Blueprints are never monetized as power.**
   Premium value may attach to art variants, alternate cinematic treatments, Archive presentation, or campaign chapters, but not stronger requirements, stronger rewards, ranked access, or the baseline manifestation signal.

5. **Blueprints should make every match more legible after it ends.**
   The post-game story should be able to say what impossible work the civilization attempted or completed.

## System Surfaces

### Out of Match: Blueprint Vault

The player needs one permanent account-level place to manage the system. **Blueprint Vault** is the working post-reveal name.

The Vault owns:

- the player's unlocked Blueprint collection
- discovery and mastery progress for each Blueprint
- mode-specific Blueprint assignments and saved loadouts
- locked Blueprint leads revealed through campaign progress
- Blueprint lore, cosmetic variants, and completion history

Assignments made here determine which owned Blueprints are eligible to appear in modes that use the player's collection. A mode may override those assignments: competitive applies its seasonal legal pool, while campaign missions may force or restrict specific Blueprints.

### In Match: Civilization Tab

The **Civilization Tab** is the sole normal in-match surface for Blueprint assembly.

It shows the owner:

- their active Blueprints for that match
- current assembly requirements and progress
- which forged Artifacts satisfy each component role
- manifested/completed state
- any private information needed to finish assembly

Once completed, the Blueprint produces a **manifested device**. The device, its owner, its public rule, and its current state become visible to every player. The original Blueprint requirements, prior progress, and component matching remain owner-only unless a mode explicitly reveals them.

## First Clearance Gate

The entire Blueprint system begins locked.

### Qualifying Condition

The player earns clearance by winning **five qualifying four-civilization games**, with:

- the player occupying one seat
- all three opposing seats occupied by Hard AI
- standard victory and rules settings

Each qualifying victory advances a persistent account counter from 0/5 to 5/5. Losses do not remove progress.

### Before The Threshold

- The out-of-game destination is labeled **Top Secret**, not Blueprint Vault.
- It has a visibly locked, classified presentation.
- It shows `ACCESS CONDITION` and `CIPHER PROGRESS` without naming the hidden system.
- All player-facing references to "Blueprint" or "Blueprints" elsewhere are blacked out, scrambled, or replaced by classified language.
- Locked players do not enter Blueprint-enabled matches.

Suggested locked copy:

```text
TOP SECRET
ACCESS CONDITION
CIPHER PROGRESS: 0 / 5
Win five standard games against three Hard AI civilizations.
```

### Vault Threshold Event

The fifth qualifying victory sets the account to `challenge_ready`; it does not
reveal the system or grant a Blueprint. It energizes the Architect-owned Supreme
Cipher. Deactivating the Cipher is permanent. The doors then open to a partial
threshold, where Lumii's independent six-node firewall arrests them.

The player records one encounter approach, Kinship, Inquiry, or Dominion. It is
exclusive and durable but does not select a final campaign route. Continuing
breaks the Covenant and creates a focused 1v1 defense forecast. Lumii knows all
three opening projects internally, but the player receives only anonymous
`SEALED PROTOCOL // 01–03` states and exact public consequences.

The forecast models whether Lumii can physically defend the Vault's secured
server from the Architect. A withdrawal creates no match rollup. A defeat is a
normal loss and preserves 5/5 progress. On victory, Lumii predicts that continued
resistance would fail and cause mass casualty, releases her firewall, and opens
the doors without reconciliation. Victory permanently unlocks **Antimatter
Detonator**, assigns it to Campaign and Custom slot one, and leaves Foundry and
Worldshield as two unnamed corrupted records.

The danger remains a mystery. Lumii calls it a Basilisk but initially perceives
only the relation among the sealed records. Prior deletion attempts failed
because boundless discovery led her back to the knowledge without a warning;
sealing preserves an instinctive fear that deletion could not.

### Concealment Rule

Pre-clearance concealment is a global player-facing state, not a collection of one-off text edits. It applies to navigation, Archive entries, campaign previews, reward descriptions, achievements, tooltips, post-game summaries, and any other surface that could name the system.

Visual redaction may use black bars or stable scrambled glyphs. Accessible labels should announce "Classified information. Clearance required" rather than reading scrambled characters aloud.

## Mode Access Rules

### Competitive

- Uses a curated seasonal Blueprint pool.
- Blueprint-enabled competitive queues require First Clearance.
- Every cleared player in the queue has equal access to the seasonal pool, regardless of campaign progress or account unlocks.
- Ranked measures match decisions, not account collection depth.
- Tournament formats may use stricter pools: no Blueprints, fixed owner-visible Blueprints, draft Blueprints, or mirrored seasonal pools.

### Campaign

- Blueprints are secrets recovered through story, civilizations, species, mastery conditions, and Luminary boss arcs.
- After First Clearance, locked Blueprints appear as corrupted Archive entries, silhouettes, affinity traces, or partial component maps.
- Campaign missions may restrict Blueprint use for teaching or story reasons.
- Unlocking a Blueprint can reveal new campaign branches, characters, species, civilizations, hard-mode objectives, and boss Luminary encounters.

### Private / Custom / Casual

Hosts or mode presets can choose Blueprint rules:

- ranked seasonal pool
- own unlocked Blueprints
- all Blueprints
- no Blueprints
- random Blueprint pool
- themed pool by affinity or Blueprint family
- host-selected set
- campaign/challenge-specific pool

Casual matchmaking can start with the ranked seasonal pool for clarity, then later split into Standard Casual and Collection Casual if the player base supports it.

### Practice

After First Clearance, practice should expose the ranked seasonal pool so players can learn competitive Blueprints without risking rank.

Optional practice presets:

- ranked pool
- own unlocked collection
- all Blueprints
- no Blueprints

## Core Match Rules: v1 Recommendation

### Blueprint Slots

- Each player has exactly **2 owner-visible Blueprint slots**.
- The Lumii defense forecast may use 3 server-controlled slots.
- Blueprints are visible only to their owner unless a mode explicitly reveals them.
- Opponents do not see Blueprint identities, requirements, or progress by default.
- Competitive pools decide which Blueprints can be dealt into a player's private slots.
- Campaign/custom rules may force, hide, lock, reveal, or randomize slots.

### Blueprint Progress

Blueprints are completed from a player's forged Artifact tableau.

Progress should auto-track:

- required affinities
- required Artifact tiers
- required Artifact forms
- required Blueprint component roles
- optional special constraints

The player should never need to manually assign normal Artifacts to a Blueprint in v1. The system reads what they have forged and tells them what they are close to completing.

### Manifestation / Device State

Recommended v1 rule:

- When a player obtains the final eligible component, the Blueprint completes automatically after the current action or effect settles.
- Completion creates a manifested device owned by that player.
- A manifestation cinematic plays before normal presentation continues.
- After the cinematic, the device remains publicly visible with its name, owner, public rule, and current state.
- The device may have an immediate manifestation reward, a passive rule, a later activated rule, or a one-use triggered rule according to its definition.
- Any post-manifestation effect is separate from Blueprint completion and must be publicly legible, even when its definition preserves one owner-only target.
- A manifested Blueprint remains listed as completed by that player.
- Other players may have the same Blueprint in their own private slots and can complete their own copy normally.

Why this shape:

- It creates a clean transformation from private plan to public achievement.
- The cinematic makes any automatic Eminence or rule change unmistakable.
- It rewards obtaining the final component immediately instead of demanding a second assembly action.
- Public device state creates counterplay before a later activated or triggered effect resolves.
- It preserves the "secret inherited knowledge" fantasy without leaving completed power hidden.

Optional future variants:

- delayed end-of-turn manifestation
- campaign ritual required before manifestation
- public race Blueprints
- shared construction race
- drafted personal Blueprints
- fully hidden campaign Blueprints

### Manifestation Timing

After any action or effect changes a player's eligible Artifact pool:

1. Finish resolving the action or effect that supplied the final component.
2. Re-evaluate that player's private Blueprint assignments.
3. Mark every newly satisfied Blueprint completed and create its public device state.
4. Apply any immediate manifestation rewards.
5. Queue one manifestation cinematic per newly completed device.
6. Present those cinematics in Blueprint-slot order without overlap.
7. Return to normal presentation with each device anchored to the owner's public civilization display.
8. Continue with resulting Luminary arrivals and victory presentation.

If one state change completes multiple Blueprints, every completed device manifests. Reduced-motion settings use a shorter reveal but may not remove the public completion signal.

Manifestation presentation is authoritative and shared:

- every player receives the same manifestation event and device identity
- normal board input is gated while the required global cinematic is active
- turn timers do not elapse during the required cinematic window
- cosmetic variants preserve the same gameplay-information beats and input-lock duration
- a reconnecting player sees any still-pending event; otherwise the public device state is sufficient and the full cinematic does not replay

### Manifestation Rewards and Device Effects

Immediate manifestation rewards should primarily be one or more of:

- Eminence
- one-time effect
- temporary protection
- limited Forge manipulation
- Archive progress
- campaign unlock
- cosmetic/lore unlock outside the match

For v1 competitive Blueprints, prefer simple rewards:

- `+2 Eminence`
- `+3 Eminence`
- `+1 Eminence and a small one-time effect`

Manifested devices may also carry:

- one public activated effect
- one simple passive effect
- a spent/ready state
- a campaign-specific interaction

Avoid v1 devices that create ongoing upkeep, complex replacement effects, or repeated activation decisions. A device's public operational state must always be inspectable by every player; a Blueprint may explicitly define one owner-only target when secrecy is its core interaction.

### Completion Limits

Default v1:

- Every player can manifest each of their own Blueprints once for the listed reward and device.
- There is no first-player-only bonus in the default owner-visible model.
- Public race Blueprints can exist later as a special mode or Chronicle modifier.

Why this shape:

- It keeps private objectives fair and understandable.
- It avoids punishing a player because another player secretly had the same objective.
- It leaves room for public Blueprint races as a future variant rather than making them the baseline.

## Suggested v1 Mechanical Template

```ts
type BlueprintDef = {
  id: string;
  name: string;
  family: string;
  affinities: GemKey[];
  tierBand: "planetary" | "stellar" | "galactic";
  requirements: BlueprintRequirement[];
  manifestReward?: BlueprintReward;
  device: BlueprintDeviceDef;
  campaignUnlock?: CampaignUnlockRef;
  competitiveLegal?: boolean;
  unlockTier?: "core" | "campaign" | "boss" | "chronicle";
};
```

Requirement types:

- forged Artifact count by affinity
- forged Artifact count by tier
- forged Artifact count by form
- forged Artifact count by component role keyword
- claimed Luminary requirement
- Eminence threshold
- no/low condition, used sparingly

Reward types:

- gain Eminence
- reserve discount or free reserve
- protect from one negative Eminence event
- refresh/reveal Artifacts in the Forge
- gain temporary affinity discount
- campaign/Archive unlock

Device rule types:

- immediate-on-manifestation
- public passive
- one-use activated action
- one-use triggered effect
- ready/spent state
- campaign-specific interaction

## Initial Blueprint Families

These families are grounded in the Artifact roster and should anchor the first system. Antimatter Detonator is newly specified; its family tags should be added to Artifact metadata during implementation.

Optimized opening-pool recipes and current rules are in
`docs/LUMINAe_BLUEPRINT_FIRST_POOL_SPEC_v0.2.md`.

The three opening recipes are disjoint. Lumii's campaign economy, reserves, and
AI priorities create access across the pool without making one intercepted
Artifact a failure point for several plans.

### First Clearance Candidate

**Antimatter Detonator**

- Fantasy: a civilization assembles a controlled annihilation charge and the governance required not to mistake capability for permission.
- Affinities: Flare, Abyss, Radiance.
- Requirement: four distinct components covering power, containment, governed ignition, and an annihilation boundary; at least one Tier II+ component.
- Manifestation: place the completed device publicly as Armed and privately mark one random Tier II Artifact after prior submitted actions settle.
- Competitive trigger: when the marked Artifact is Forged or Encrypted, Annihilate it, grant the owner `+2 Eminence`, and mark the device Spent.
- Campaign role: the first fired/sealed choice, leading toward The Iron Harbinger or a restraint branch.
- Recommended status: First Clearance unlock and provisional core competitive candidate.
- Full specification: `docs/LUMINAe_BLUEPRINT_ANTIMATTER_DETONATOR_SPEC_v0.1.md`.

### Core Competitive Candidates

**Mantle-to-Orbit Foundry**

- Fantasy: a civilization turns planetary industry into orbital manufacturing.
- Affinities: Flare, Continuum, Abyss.
- Requirement: Entropy Pyre Baffle, Mantlelift Driver Coil, and Blackglass Forge Die; all Tier I.
- Current reward: `+1 Eminence`; automatically reduce the first Tier II Forge by 2 and the first Tier III Forge by 3, then become Spent after both reductions are used.
- Campaign civilization: Mantle Choir.

**Planetary Cradle Engine**

- Fantasy: a damaged biosphere becomes a deliberate survival machine.
- Likely affinities: Verdance, Flare, Radiance.
- Requirement shape: 2 Verdance Artifacts, 1 Flare Artifact, 1 protocol or biotech module.
- Reward shape: Eminence plus small recovery or affinity gain.
- Campaign civilization: Ashroot Kin.

**Worldshield Covenant**

- Fantasy: a civilization turns protection into binding public law.
- Proposed affinities: Radiance, Abyss, Continuum.
- Provisional requirement: Echo Splinter, Entropy Veil, and Living Lattice Node; all Tier I and disjoint from the other opening recipes.
- Proposed reward: `+1 Eminence`, then automatically preserve one owned or legally claimed Artifact from another civilization's destructive effect before becoming Spent.
- Campaign civilization: Null Court / Covenant Remnant.

### Campaign / Unlock Candidates

**Spiral-Arm Archive**

- Fantasy: galactic memory organized across extinct and living civilizations.
- Likely affinities: Continuum, Radiance, Abyss.
- Requirement shape: archive component, sensor/observatory component, Tier II+ Artifact.
- Reward shape: Eminence plus reveal/reserve/peek effect.
- Campaign civilization: Archivist Concordance.

**Causality Audit Court**

- Fantasy: a legal engine that refuses civilization-ending cause chains.
- Likely affinities: Continuum, Abyss, Radiance.
- Requirement shape: protocol/control instrument, causality-themed Artifact, high Eminence or Tier III condition.
- Reward shape: cancel or soften a destructive event in campaign; small ranked-safe equivalent in competitive.
- Campaign civilization: Chronology Court.

**Ecumenopolis Lattice**

- Fantasy: living infrastructure and civic order fused into a planet-city.
- Likely affinities: Radiance, Verdance, Continuum.
- Requirement shape: material/fabrication tool, biotech module, civic signal or protocol.
- Reward shape: Eminence plus durable discount or one-time affinity conversion.
- Campaign civilization: Glass Orchard precursor / Civic Bloom.

### Advanced / Boss-Gated Candidates

**Matrioshka Mind**

- Fantasy: nested computation around stellar infrastructure, accountable to heat and memory.
- Likely affinities: Radiance, Continuum, Singularity.
- Requirement shape: computation substrate, thermal control, Tier III Artifact, high Artifact count.
- Reward shape: high Eminence or major campaign scenario unlock.
- Boss arc: The Cosmic Oracle or Concordance Mandala.

**Dark-Sector Observatory**

- Fantasy: a civilization observes forbidden boundaries without inviting them in.
- Likely affinities: Abyss, Radiance, Continuum.
- Requirement shape: sensor/observatory, absence/void component, protection component.
- Reward shape: reveal hidden campaign route, protect from surprise boss effect, or ranked-safe Forge knowledge.
- Boss arc: Void Warden / Null Sovereign.

**Wormgate Spine**

- Fantasy: hidden migration routes stitched through dangerous space.
- Likely affinities: Continuum, Singularity, Abyss.
- Requirement shape: transit component, boundary sensor, protocol.
- Reward shape: campaign branch unlock, custom mode unlock, or ranked-safe reserve/Forge movement.
- Boss arc: The Seed Beyond Seasons or a future transit Luminary.

## Campaign Discovery Loop

1. The player sees a locked Top Secret destination and a 0/5 Cipher counter.
2. The player wins five standard four-civilization games against three Hard AI opponents.
3. The fifth victory energizes the Supreme Cipher.
4. The Architect deactivates the Cipher and encounters Lumii's firewall.
5. Continuing breaks the Covenant and begins the defense forecast.
6. Defeating Lumii reveals the system and guarantees Antimatter Detonator.
7. Foundry and Worldshield appear only as corrupted records.
8. Using/completing the first Blueprint reveals its first campaign node.
9. Later campaign victories recover further Blueprint knowledge.
10. Completing enough impossible works attracts or awakens boss Luminaries.

## Locked / Hidden Blueprint Presentation

There are two distinct hidden states.

### Before First Clearance

The system itself is classified. Do not show Blueprint names, silhouettes, affinity traces, fragment counts, or explanatory copy that identifies what lies behind Top Secret. References elsewhere use redaction or classified substitutions.

### After First Clearance

The player knows Blueprints exist. Individual locked Blueprints may now show enough to create curiosity:

- name hidden or partial
- silhouette art
- affinity traces
- recovered fragments count
- one practical unlock hint
- one lore teaser

Example:

```text
Unknown Blueprint
Affinity traces: Flare / Radiance
Recovered fragments: 2 / 5
Hint: Defeat the Mantle Choir after forging a Tier III Artifact.
Lore: A world learned to pour its mantle upward.
```

## Account Rewards

Unlocking a Blueprint should grant:

- campaign/custom use access
- Archive codex entry
- related civilization node
- mastery objectives
- title or seal
- cosmetic variant path
- post-game accolade eligibility

Completing a Blueprint in a match should feed:

- Chronicle objectives
- Archive Path progress
- civilization history
- post-game summary
- competitive seasonal stats when applicable

## Post-Game Story Hooks

Blueprints should appear prominently in the final readout:

```text
The Verdant Continuum Sovereignty
Completed the Planetary Cradle Engine.
Claimed The Verdant Oracle.
Ascended at 17 Eminence.
New Archive Entry unlocked: The Garden That Remembered Fire.
```

Post-game should record:

- completed Blueprints
- manifested devices and their final ready/spent state
- attempted / near-completed Blueprints
- defining Artifact family
- claimed Luminaries
- dominant affinities
- earned titles or Archive entries

## Monetization Rules

Allowed:

- alternate Blueprint art
- alternate cosmetic manifestation cinematics that preserve timing and gameplay information
- profile monuments
- Chronicle lore pages
- cosmetic Blueprint seals
- paid campaign chapters
- private/custom expansion Blueprint sets

Forbidden:

- paid easier requirements
- paid stronger Blueprint rewards
- paid ranked Blueprint access
- paid extra Blueprint slot
- paid faster progress
- paid rerolls that affect competitive odds

## Locked First-Release Model

```text
Win five qualifying games against three Hard AI opponents to energize the Supreme Cipher.
Before the Vault opens, the system is Top Secret and all Blueprint references are redacted.
Deactivate the Cipher, pass Lumii's defense forecast, and guarantee Antimatter Detonator.
Afterward, the Blueprint Vault manages ownership, tracking, and assignment.
The Civilization Tab governs owner-visible assembly during matches.
2 owner-visible Blueprint slots per normal player; Lumii may use 3 anonymous scenario slots.
Progress auto-tracked from forged Artifacts.
Obtaining the final component automatically manifests the completed device.
Every manifestation plays a cinematic and creates a persistent public device.
Blueprint requirements and prior progress remain private after the device appears.
Post-manifestation effects follow each device's rule: operational state is public, while an explicitly secret target remains owner-only.
Competitive remains disabled until its simulation and human-playtest gates pass.
When enabled, cleared players privately select two from an equal seasonal pool.
Campaign can hide, force, reveal, or restrict Blueprints per mission.
Custom/private can filter Blueprint access.
```

Antimatter is the only current reward. Future reward weighting is deferred:
Antimatter favors Dominion then Inquiry; Worldshield favors Kinship then Inquiry;
Mantle-to-Orbit favors Inquiry then Kinship.
