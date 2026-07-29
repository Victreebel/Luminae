# LUMINAe Blueprint System Design v0.1

## Status

**Product and mechanics design draft.**

This document turns the locked Blueprint direction into an implementable design target. It is not code and does not supersede the artifact replacement tables. It should be read alongside:

- `docs/LUMINAe_BLUEPRINT_TO_ARTIFACT_DEPENDENCY_MAP_v0.2.md`
- `docs/LUMINAe_ARTIFACT_REPLACEMENT_TABLE_v0.4_UTILITY_FIRST_LORE.md`

## Locked Doctrine

```text
Competitive standardizes Blueprints.
Campaign reveals Blueprints.
Custom lets players choose Blueprints.
```

Blueprints are inherited civilizational secrets: large-scale works assembled from forged Artifacts, recovered through campaign progress, standardized for competitive fairness, and configurable in private/custom play.

## Design Pillars

1. **Blueprints carry the megastructure fantasy.**
   Artifacts remain components, instruments, protocols, materials, and interfaces. Blueprints are the assembled civilizational projects those components make possible.

2. **Blueprints create strategic direction without replacing the race to 15 Eminence.**
   They should add a visible mid/late-game objective, not become a separate game stapled onto the board.

3. **Blueprint access is mode-defined.**
   Competitive fairness, campaign mystery, and private flexibility are different needs and should not be forced into one access model.

4. **Blueprints are never monetized as power.**
   Premium value may attach to art variants, completion cinematics, Archive presentation, or campaign chapters, but not stronger requirements, stronger rewards, or ranked access.

5. **Blueprints should make every match more legible after it ends.**
   The post-game story should be able to say what impossible work the civilization attempted or completed.

## Mode Access Rules

### Competitive

- Uses a curated seasonal Blueprint pool.
- Every player in the queue has equal access to that pool, regardless of campaign progress or account unlocks.
- Ranked measures match decisions, not account collection depth.
- Tournament formats may use stricter pools: no Blueprints, fixed public Blueprints, draft Blueprints, or mirrored seasonal pools.

### Campaign

- Blueprints are secrets recovered through story, civilizations, species, mastery conditions, and Luminary boss arcs.
- Locked Blueprints appear as corrupted Archive entries, silhouettes, affinity traces, or partial component maps.
- Campaign missions may restrict Blueprint use for teaching or story reasons.
- Unlocking a Blueprint can reveal new campaign branches, characters, species, civilizations, hard-mode objectives, and boss Luminary encounters.

### Private / Custom / Casual

Hosts or mode presets can choose Blueprint rules:

- ranked seasonal pool
- own unlocked Blueprints
- all Blueprints
- no Blueprints
- random public Blueprints
- themed pool by affinity or Blueprint family
- host-selected set
- campaign/challenge-specific pool

Casual matchmaking can start with the ranked seasonal pool for clarity, then later split into Standard Casual and Collection Casual if the player base supports it.

### Practice

Practice should expose the ranked seasonal pool so players can learn competitive Blueprints without risking rank.

Optional practice presets:

- ranked pool
- own unlocked collection
- all Blueprints
- no Blueprints

## Core Match Rules: v1 Recommendation

### Blueprint Slots

- Each match has **3 public Blueprint slots**.
- All players see the same active Blueprints.
- Competitive pools decide which Blueprints can appear.
- Campaign/custom rules may force, hide, lock, or randomize slots.

### Blueprint Progress

Blueprints are completed from a player's forged Artifact tableau.

Progress should auto-track:

- required affinities
- required Artifact tiers
- required Artifact forms
- required Blueprint component roles
- optional special constraints

The player should never need to manually assign normal Artifacts to a Blueprint in v1. The system reads what they have forged and tells them what they are close to completing.

### Claiming / Completion

Recommended v1 rule:

- When a player satisfies a Blueprint, it becomes claimable.
- Claiming a Blueprint is a normal turn action.
- A claimed Blueprint remains listed as completed by that player.
- Other players may still complete the same Blueprint later for a reduced reward unless the specific mode says "first completion only."

Why this shape:

- It creates a real timing decision.
- It avoids hidden automatic Eminence jumps.
- It allows opponents one more chance to react.
- It keeps the system readable.

Optional future variants:

- automatic end-of-turn completion
- first-player-only race Blueprints
- shared construction race
- drafted personal Blueprints
- secret campaign Blueprints

### Rewards

Blueprint rewards should primarily be one or more of:

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

Avoid v1 rewards that create ongoing upkeep, complex replacement effects, hidden state, or additional per-turn decisions.

### Completion Limits

Default v1:

- First player to complete a Blueprint receives full reward.
- Later completions receive reduced Eminence or only the non-Eminence effect.

Alternative simpler launch rule:

- Every player can complete each Blueprint once for the same reward.

The simpler launch rule is easier to balance and teach. The first-completion rule creates more table tension. Pick based on how much complexity the UI can comfortably carry.

## Suggested v1 Mechanical Template

```ts
type BlueprintDef = {
  id: string;
  name: string;
  family: string;
  affinities: GemKey[];
  tierBand: "planetary" | "stellar" | "galactic";
  requirements: BlueprintRequirement[];
  reward: BlueprintReward;
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

## Initial Blueprint Families

These families already appear in artifact metadata and should anchor the first system.

### Core Competitive Candidates

**Mantle-to-Orbit Foundry**

- Fantasy: a civilization turns planetary industry into orbital manufacturing.
- Likely affinities: Flare, Radiance, Verdance or Continuum.
- Requirement shape: forged Flare component, forged Radiance/control component, 4 total Artifacts.
- Reward shape: Eminence plus a one-time discount on next Tier II/III forge.
- Campaign civilization: Mantle Choir.

**Planetary Cradle Engine**

- Fantasy: a damaged biosphere becomes a deliberate survival machine.
- Likely affinities: Verdance, Flare, Radiance.
- Requirement shape: 2 Verdance Artifacts, 1 Flare Artifact, 1 protocol or biotech module.
- Reward shape: Eminence plus small recovery or affinity gain.
- Campaign civilization: Ashroot Kin.

**Worldshield Covenant**

- Fantasy: a civilization turns protection into binding public law.
- Likely affinities: Radiance, Abyss, Flare or Continuum.
- Requirement shape: defense/containment component, Radiance stabilizer, Abyss concealment or boundary artifact.
- Reward shape: Eminence plus one shield against Oblivion or negative Eminence.
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

1. Player completes onboarding and proves base competence.
2. The Archive reveals 2-3 corrupted Blueprint silhouettes.
3. A short First Seal Trial unlocks the player's first Blueprint.
4. Using/completing that Blueprint reveals a civilization node.
5. Beating that civilization unlocks fragments of its Archive.
6. Meeting mastery conditions unlocks its Blueprint.
7. Using recovered Blueprints reveals further civilizations.
8. Completing enough impossible works attracts or awakens a boss Luminary.
9. Surviving/defeating the boss unlocks a new campaign arc, cosmetic set, or advanced Blueprint family.

First unlock should be ceremonial and achievable. Avoid making the first Blueprint require a dry grind like "beat hard AI 10 times" unless that requirement is wrapped inside named trials.

Better first unlock gates:

- Complete 3 First Seal Trials.
- Beat hard AI 3 times.
- Win once with 15+ Eminence and complete two affinity mastery objectives.
- Complete tutorial plus one challenge victory.

## Locked / Hidden Blueprint Presentation

Locked Blueprints should show enough to create curiosity:

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
- attempted / near-completed Blueprints
- defining Artifact family
- claimed Luminaries
- dominant affinities
- earned titles or Archive entries

## Monetization Rules

Allowed:

- alternate Blueprint art
- completion cinematics
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

## Open Questions

1. Are v1 Blueprints completed as a turn action, automatically at end of turn, or immediately on satisfying requirements?
2. Can multiple players complete the same Blueprint for full rewards, reduced rewards, or first-only rewards?
3. How many Blueprints should be active in a 2-player game versus larger games?
4. Should competitive Blueprints always be public, or can a future season include drafted/personal Blueprints?
5. Which three Blueprint families form the first competitive-safe pool?
6. Which Blueprint is the first campaign unlock?
7. How much of Blueprint progress should be visible to opponents?

## Recommended Next Lock

Lock the v1 in-match model:

```text
3 public Blueprint slots.
Progress auto-tracked from forged Artifacts.
Claiming a completed Blueprint is a turn action.
Competitive uses a curated shared seasonal pool.
Campaign can hide, force, or restrict Blueprints per mission.
Custom/private can filter Blueprint access.
```
