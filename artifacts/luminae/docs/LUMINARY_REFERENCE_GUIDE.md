# Luminary Reference Guide — Canonical v1.0

> **Scope:** This document captures the exact mechanical effects, animation specs, visual identity, and engine logic for every Luminary in the current Luminae build. Sources: `gameEngine.ts` (server), `luminaryAssets.tsx` (frontend visuals), `luminaryAnimationConfig.ts` (animation metadata), `game-luminary-effects.tsx` (marker/badge system), and `LuminaryActivationCinematic.tsx` (cinematic overlay).

---

## Table of Contents

1. [Active Pool & Tier Structure](#active-pool--tier-structure)
2. [Luminary Profiles (15 Active)](#luminary-profiles)
3. [Deferred / Inactive Luminaries](#deferred--inactive-luminaries)
4. [Animation System Overview](#animation-system-overview)
5. [Living Luminary Mechanics](#living-luminary-mechanics)
6. [Claim & Arrival Resolution](#claim--arrival-resolution)
7. [Card Marker System](#card-marker-system)
8. [Visual Identity & Art Lock Status](#visual-identity--art-lock-status)

---

## Active Pool & Tier Structure

The active Luminary pool is `AVAILABLE_LUMINARIES` (15 Luminaries). Each game draws `playerCount + 1` from this pool. The pool is divided by permanent-Affinity requirements:

| Tier | Requirement | Native Eminence | Count | Luminaries |
|------|------|----------|-------|------------|
| **Mono** (Tier 1) | 5–6 of one affinity | 1–3 | 5 | Red Moth, Tide Architect, Verdant Oracle, Void Warden, Concordance Mandala |
| **Dual** (Tier 2) | 4+4 of two affinities | 1–3 | 7 | Phoenix Paradox, Catalyst Bloom, Iron Harbinger, ??? (The Forgotten Hour), Seed Beyond Seasons, Glass Orchard, Pale Merchant |
| **Triple** (Tier 3) | 3+3+3, or 4+4+4 for Null Sovereign | 0–3 | 3 | Ember Sovereign, Final Hunger, Null Sovereign |

Native arrival rewards are capped at **3 Eminence**, as defined by `LUMINARY_NATIVE_EMINENCE` in `lib/game-types/src/index.ts` (updated 2026-09-30). The 3-point rewards compensate for modest, shared, or unreliable effects relative to their requirements. Ability-generated Eminence is separate and unchanged; previously earned scores are preserved.

> **Note:** Art-lock status does not determine pool membership. The active pool includes Red Moth, Seed Beyond Seasons, Glass Orchard, and Final Hunger; Cosmic Oracle and Celestial Scholar remain deferred.

---

## Luminary Profiles

### Mono-Color Luminaries

---

#### 1. Red Moth — *Rupture of the Still*
| Field | Value |
|-------|-------|
| **ID** | `lum_moth` |
| **Domain** | Rupture |
| **Affinity** | Flare (ruby) |
| **Cost** | 6 Flare |
| **Native Eminence** | 3 |
| **Effect** | On arrival, burns all Tier III Artifacts whose **Flare cost is 4 or less**. Those slots immediately redraw. |
| **Flavor** | *"Where it passes, the universe is divided into before and after."* |
| **Animation Archetype** | `burn` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` (keyword: burn) → `keywordEvents` (burn) → `forgeRefill` |
| **Residue** | None (burn is immediate) |
| **Colors** | Primary `#ef4444`, Secondary `#7f1d1d`, Aura `fire` |
| **Art Status** | Panel + entity on disk; no aura (falls back gracefully) |

---

#### 2. Tide Architect — *The Observer Effect*
| Field | Value |
|-------|-------|
| **ID** | `lum_tide` |
| **Domain** | Tides |
| **Affinity** | Continuum (continuum) |
| **Cost** | 6 Continuum |
| **Native Eminence** | 2 |
| **Effect** | The allied player may view the top Artifact of each Archive. Once, the allied player may Forge an Artifact on the top of an Archive. |
| **Flavor** | *"Possibility collapses to its bias."* |
| **Animation Archetype** | `scry` |
| **Procedure Steps** | `luminaryPulse` → `deckScry` (tier1, tier2, tier3; reveal only) |
| **Residue** | Private Archive-top visibility; one-use Archive Forge |
| **Colors** | Primary `#60a5fa`, Secondary `#e2e8f0`, Aura `tide` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 3. Verdant Oracle — *Early Bloom*
| Field | Value |
|-------|-------|
| **ID** | `lum_verdant` |
| **Domain** | Verdance |
| **Affinity** | Verdance (emerald) |
| **Cost** | 5 Verdance |
| **Native Eminence** | 3 |
| **Effect** | On arrival, gain 1 Verdance token from the Affinity Well. Like every manifested Luminary, its active-Affinity Forge bonus begins on the following turn. |
| **Flavor** | *"It answers only after the question has taken root."* |
| **Animation Archetype** | `resourceTransfer` |
| **Procedure Steps** | `luminaryPulse` → `affinityGain` (1 Verdance, Well to owner) |
| **Residue** | None |
| **Colors** | Primary `#4ade80`, Secondary `#166534`, Aura `verdant` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 4. Void Warden — *Oblivion*
| Field | Value |
|-------|-------|
| **ID** | `lum_void` |
| **Domain** | Void |
| **Affinity** | Abyss (onyx) |
| **Cost** | 6 Abyss |
| **Native Eminence** | 2 |
| **Oblivion** | +8 shared victory requirement |
| **Effect** | On arrival, raise the shared victory requirement by 8. |
| **Flavor** | *"In the space between stars, something watches without eyes."* |
| **Animation Archetype** | `globalDisruption` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → shared victory requirement +8 |
| **Residue** | None |
| **Colors** | Primary `#4c1d95`, Secondary `#0a0a14`, Aura `void` |
| **Art Status** | Illustrated panel + entity locked; aura: purple radial |

---

#### 5. Concordance Mandala — *Perfect Coherence*
| Field | Value |
|-------|-------|
| **ID** | `lum_radiant` |
| **Domain** | Coherence |
| **Affinity** | Radiance (pearl) |
| **Cost** | 6 Radiance |
| **Native Eminence** | 1 |
| **Effect** | Once, when you end your turn with at least 8 Radiance Artifacts, gain +2 Eminence. Once, when you end your turn with at least 10 Radiance Artifacts, gain +2 Eminence. |
| **Flavor** | *"Truth is not revealed. It is aligned."* |
| **Animation Archetype** | `thresholdPayoff` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `eminenceChange` (+2) |
| **Residue** | None |
| **Colors** | Primary `#fef9c3`, Secondary `#2ecc71`, Aura `radiant` |
| **Art Status** | Illustrated panel + entity locked |

---

### Dual-Color Luminaries (1–3 Native Eminence)

---

#### 6. Phoenix Paradox — *Eternal Recurrence*
| Field | Value |
|-------|-------|
| **ID** | `lum_astral` |
| **Domain** | Recurrence |
| **Affinities** | Flare, Continuum |
| **Cost** | 4 Flare + 4 Continuum |
| **Native Eminence** | 3 |
| **Effect** | While Phoenix Paradox is manifested, future Burned Artifacts return to the bottom of their corresponding Archives instead of remaining in the Burn Pile. At the beginning of the owner's next turn, every Artifact already in the Burn Pile returns to the bottom of its corresponding Archive; any empty Forge positions then refill. |
| **Flavor** | *"Every ending becomes fuel. Every return comes back less innocent."* |
| **Animation Archetype** | `recurrence` |
| **Procedure Steps** | Manifestation: `luminaryPulse`. Beginning of next owner turn: `luminaryPulse` → `archiveReturn` → `forgeRefill` |
| **Residue** | None |
| **Colors** | Primary `#f43f5e`, Secondary `#3d6bff`, Aura `astral` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 7. Catalyst Bloom — *Aftergrowth*
| Field | Value |
|-------|-------|
| **ID** | `lum_bloom` |
| **Domain** | Aftergrowth |
| **Affinities** | Flare, Verdance |
| **Cost** | 4 Flare + 4 Verdance |
| **Native Eminence** | 1 |
| **Effect** | At the end of each of your turns, gain +1 Eminence for every burn effect that occurred since your last turn (from any source). |
| **Flavor** | *"It waits for the nova to wound the world, then flowers in the scar."* |
| **Animation Archetype** | `thresholdPayoff` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `eminenceChange` (dynamic amount = burn count) |
| **Residue** | None |
| **Colors** | Primary `#86efac`, Secondary `#7f1d1d`, Aura `bloom` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 8. Iron Harbinger — *Impact Extinction*
| Field | Value |
|-------|-------|
| **ID** | `lum_forge` |
| **Domain** | Ruin |
| **Affinities** | Flare, Abyss |
| **Cost** | 4 Flare + 4 Abyss |
| **Native Eminence** | 3 |
| **Effect** | On arrival, return every face-up Forge Artifact to its corresponding Archive, randomize each Archive, then refill every Forge row. This is not a Burn effect. |
| **Flavor** | *"The hammer falls only after the future has already broken."* |
| **Animation Archetype** | `forgeReset` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `archiveReturn` → `deckScry` → `forgeRefill` |
| **Residue** | None |
| **Colors** | Primary `#f97316`, Secondary `#1c1917`, Aura `storm` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 9. ??? — *The Forgotten Hour*
| Field | Value |
|-------|-------|
| **ID** | `lum_compass` |
| **Domain** | Erasure |
| **Affinities** | Continuum, Abyss |
| **Cost** | 4 Continuum + 4 Abyss |
| **Native Eminence** | 1 |
| **Effect** | On arrival, raise the shared victory requirement by 1 and mark every face-up Forge Artifact as **Forgotten**. Until the ally's next end of turn, only the ally may Encrypt. Artifacts forged while Forgotten award 0 Eminence and cannot be used for Blueprints. After the marks expire, wait 12 of the ally's turns, then mark the face-up Forge Artifacts as Forgotten again without raising the victory requirement. |
| **Flavor** | *"Everyone remembered something happened, but no one can recall what was lost."* |
| **Animation Archetype** | `suppression` |
| **Procedure Steps** | `luminaryPulse` → `deckScry` (all tiers) → `targetClaim` → `residue` (forgotten) |
| **Residue** | `forgotten` |
| **Colors** | Primary `#38bdf8`, Secondary `#0a0a14`, Aura `distorted` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 10. Seed Beyond Seasons — *Avatar Seeds*
| Field | Value |
|-------|-------|
| **ID** | `lum_seed` |
| **Domain** | Propagation |
| **Affinities** | Continuum, Verdance |
| **Cost** | 4 Continuum + 4 Verdance |
| **Native Eminence** | 2 |
| **Effect** | On arrival, permanently mark one random mold in each tier with an **Avatar Seed**. At the end of every turn, each unseeded Artifact occupying one of those molds becomes **Seeded**. When an opponent forges a Seeded Artifact, the allied player gains 1 permanent Affinity matching that Artifact's bonus Affinity. |
| **Flavor** | *"It leaves its avatars where tomorrow has already begun to remember."* |
| **Animation Archetype** | `seeded` |
| **Procedure Steps** | Arrival: `luminaryPulse` → three mold inscriptions. End of turn: `targetClaim` → `seeded` branding strike. Opponent forge: Avatar Seed transforms into the matching Affinity and imbues the allied player. |
| **Residue** | `seeded` |
| **Colors** | Primary `#38bdf8`, Secondary `#4ade80`, Aura `compass` |
| **Art Status** | Uses `BloomEntity` as fallback (screen blend mode) |

---

#### 11. Glass Orchard — *Perfect Replication*
| Field | Value |
|-------|-------|
| **ID** | `lum_orchard` |
| **Domain** | Replication |
| **Affinities** | Verdance, Radiance |
| **Cost** | 4 Verdance + 4 Radiance |
| **Native Eminence** | 3 |
| **Effect** | Once per game, when you first forge an Artifact whose cost includes Verdance or Radiance, gain a second permanent bonus Affinity matching that Artifact. |
| **Flavor** | *"It learned to copy itself perfectly, and called the absence of error peace."* |
| **Animation Archetype** | `replication` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` |
| **Residue** | None |
| **Colors** | Primary `#4ade80`, Secondary `#fef9c3`, Aura `verdant` |
| **Art Status** | Uses `BloomEntity` as fallback (screen blend mode) |

---

#### 12. Pale Merchant — *Balance Due*
| Field | Value |
|-------|-------|
| **ID** | `lum_pale` |
| **Domain** | Balance |
| **Affinities** | Abyss, Radiance |
| **Cost** | 4 Abyss + 4 Radiance |
| **Native Eminence** | 3 |
| **Effect** | On arrival, each player returns 2 tokens of every Affinity, including Singularity, that they hold at half or more of its starting supply (rounded up). |
| **Flavor** | *"Every bargain reveals one truth and buries another."* |
| **Animation Archetype** | `affinityReturn` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `affinityReturn` (all affected players) |
| **Residue** | None |
| **Colors** | Primary `#cbd5e1`, Secondary `#0a0a14`, Aura `pale` |
| **Art Status** | Illustrated panel + entity locked |

---

### Triple-Color Luminaries (0–3 Native Eminence)

---

#### 13. Ember Sovereign — *Cinder Mandate*
| Field | Value |
|-------|-------|
| **ID** | `lum_ember` |
| **Domain** | Flame |
| **Affinities** | Flare, Abyss, Radiance |
| **Cost** | 3 Flare + 3 Abyss + 3 Radiance |
| **Native Eminence** | 3 |
| **Effect** | **Cinder Mandate:** On arrival, mark each face-up Forge Artifact as Condemned unless its cost includes at least 3 of Flare, Abyss, or Radiance. At the end of your next turn, burn each remaining Condemned Artifact and refill its Forge position. |
| **Flavor** | *"What cannot survive the fire is granted the mercy of disappearance."* |
| **Animation Archetype** | `condemned` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` (keyword: condemned) → `residue` (condemned) |
| **Residue** | `condemned` |
| **Colors** | Primary `#ff5a3c`, Secondary `#7b1fa2`, Aura `fire` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 14. Final Hunger — *Assimilation*
| Field | Value |
|-------|-------|
| **ID** | `lum_hunger` |
| **Domain** | Assimilation |
| **Affinities** | Flare, Verdance, Radiance |
| **Cost** | 3 Flare + 3 Verdance + 3 Radiance |
| **Native Eminence** | 2 |
| **Effect** | Once after arrival, you may replace your Forge action with **Assimilation**. Assimilate any face-up Artifact for free: gain its permanent bonus Affinity and no Eminence. The Artifact counts as owned only for Blueprints. |
| **Flavor** | *"Its first act is consumption. Its second is perfect repetition."* |
| **Animation Archetype** | `assimilate` |
| **Procedure Steps** | Arrival grants the action silently. On use: `luminaryPulse` → `targetClaim` → top-down dissolve → `affinityGain` → Archive refill. |
| **Residue** | None |
| **Colors** | Primary `#fbbf24`, Secondary `#4ade80`, Aura `oracle` |
| **Art Status** | Uses `HungerEntity` (custom) |

---

#### 15. Null Sovereign — *Black Domain*
| Field | Value |
|-------|-------|
| **ID** | `lum_null` |
| **Domain** | Transcendence |
| **Affinities** | Continuum, Abyss, Radiance |
| **Cost** | 4 Continuum + 4 Abyss + 4 Radiance |
| **Native Eminence** | 0 (awards none) |
| **Effect** | On arrival, marks all face-up Tier III Artifacts that do not require all three of Continuum, Abyss, and Radiance as **Nullified**. Nullified Artifacts award 0 Eminence, cannot be used for Blueprints, and cannot be Encrypted. If the first Nullified Artifact forged this game is forged by the allied player, it is unaffected by Nullified. |
| **Flavor** | *"Past the last observable star, entire futures fall silent without being destroyed."* |
| **Animation Archetype** | `suppression` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `residue` (nullified) |
| **Residue** | `nullified` |
| **Colors** | Primary `#ffffff`, Secondary `#0a0a14`, Aura `null` |
| **Art Status** | Illustrated panel + entity locked |

---

## Deferred / Inactive Luminaries

These Luminaries are defined in the engine but are **not** in the `AVAILABLE_LUMINARIES` pool. They do not appear in games.

| ID | Name | Domain | Cost | Native Eminence | Note |
|----|------|--------|------|----------|------|
| `lum_oracle` | The Cosmic Oracle | Prophecy | 3+3+3 (F/C/V) | 3 | Deferred — no effectName/effectDescription in current build |
| `lum_scholar` | The Celestial Scholar | Erasure | 4 Continuum + 4 Radiance | 2 | v0.9 addition; deferred from active rotation. Effect: draws two cards, keeps one. |

---

## Animation System Overview

### Activation Cinematic Pipeline

When a Luminary's effect fires (summon, end-of-turn, start-of-turn hook), the engine emits a `PendingLuminaryActivationEvent`. The client plays a 4-second cinematic overlay:

1. **Anticipate** (0ms): Dark overlay fades in, Luminary entity + panel appear
2. **Reveal** (400ms): Flash-haze bloom expands from aura focal point
3. **Hold** (900ms): Entity holds, `ProcedureStrip` shows step pills, effect beats fire
4. **Pan Out** (1600ms): Camera pulls back, panel fades
5. **Done** (1860ms): Overlay removed, `onComplete` callback fires

### Abridged Mode
- `abridgedAnims` setting or `prefers-reduced-motion`: 380ms compact overlay
- No beam animations, no source pulse — just crisp border flash + brand glyph

### Procedure Step Types

| Step Type | Visual | Used By |
|-----------|--------|---------|
| `luminaryPulse` | Aura flash + entity pulse | All Luminaries |
| `targetClaim` | Target badge (⬡) + optional keyword pre-label | Burn, suppression, replication |
| `keywordEvent` | Single keyword fires (🔥 BURN, ◎ FORGOTTEN) | Iron Harbinger |
| `keywordEvents` | Batch keyword fires | Red Moth |
| `deckScry` | Deck-top shimmer + reorder preview | Tide Architect, Compass, Seed |
| `eminenceChange` | `+N EMN` or `-N EMN` flash | Void Warden, Radiant, Bloom, Pale |
| `affinityReturn` | `◇ RETURN` flash + Affinity return animation | Pale Merchant |
| `affinityGain` | Permanent Affinity absorption at the Civilization destination | Final Hunger |
| `residue` | Persistent marker badge placed on card | Compass (forgotten), Ember (condemned), Null (nullified), Seed (seeded) |
| `forgeRefill` | Slot refresh animation | Burn-family Luminaries |
| `archiveReturn` | Identifiable Burned Artifacts travel to their matching Archive spires | Phoenix Paradox |
| `reveal` | Card flip reveal from deck | Reveal-family effects |
| `pendingAction` | Compatibility step for older queued action presentations | Legacy sequences |

### ArrivalBrandStrike System

When a Luminary places a **persistent marker** (Forgotten, Condemned, Nullified, Avatar Seed) on Artifacts in the Forge, the `ArrivalBrandStrike` overlay fires:

1. **Source pulse** (if source Luminary provided): Expanding ring from portal in Luminary colors
2. **Lightning beam** (300ms delay): Sharp gradient beam from viewport top to card center
3. **Impact flash**: Crisp border flash on card (2px, no blur)
4. **Large brand glyph**: Marker icon (◎, ⚑, ⊘, ⁕) covers card face, pulses, fades
5. **ArtifactMarkerBadge**: Springs in after brand delay (spring physics, stiffness 420)

**Marker-to-Source Mapping:**
| Marker | Source Luminary |
|--------|-----------------|
| Forgotten | Hourless Compass (`lum_compass`) |
| Condemned | Ember Sovereign (`lum_ember`) |
| Nullified | Null Sovereign (`lum_null`) |
| Avatar Seed | Seed Beyond Seasons (`lum_seed`) |

**Hover tooltip on badge:**
- Keyword name + meaning + duration + source Luminary name
- `onTraceSource` callback triggers box-shadow glow on originating portal

---

## Living Luminary Mechanics

### `effectiveBonuses()` (Engine)

When a Luminary is claimed, the engine randomly chooses one of its required affinity types as its active affinity. The result is stored in `GameState.luminaryAffinities` as a `LuminaryActiveState` array.

Starting the **next turn** after summoning, the owner gains **+1 bonus toward that active affinity** on every Artifact they forge.

The `effectiveAffinityBonuses()` function merges:
- Base `player.bonuses` (from forged Artifact cards)
- Living Luminary bonuses (from all claimed Luminaries the player owns)

This merged result drives `effectiveCost()` and `payForgeCost()` — the discount is applied automatically when the Artifact is forged.

The arrival choice cannot normally be decided or changed by the owner. Mono-affinity Luminaries always receive their sole required type; multi-affinity Luminaries retain the randomly selected type for the rest of the game.

`turnCount` gates activation, so the bonus applies only after the summoning turn.

---

## Claim & Arrival Resolution

### Claim Order
When a single action qualifies a player for multiple Luminaries, the canonical order is:
1. Highest `eminence` value first
2. If tied, order in `LUMINARIES` array (stable deterministic order)

### Oblivion vs. Eminence
- **Oblivion**: Set via `oblivion: N` on the LuminaryDef. On claim, the shared victory requirement rises by N, separately from the listed native reward. Void Warden grants 2 native Eminence and raises the target by 8.
- **Eminence**: Stored as `eminence: N`. Claimer gains N Eminence immediately.

### Win Attribution
- `winTriggerLuminaryId` is set to the Luminary that pushed the player to the configured victory requirement
- If a player wins via Luminary claim, the win cinematic names the triggering Luminary

---

## Card Marker System

### Marker Types

| Marker | Label | Color | Meaning | Duration |
|--------|-------|-------|---------|----------|
| **Forgotten** | ◎ | Blue-purple `#9988ee` | Awards 0 Eminence when forged; cannot support blueprints; Encrypt unavailable while active | Source player's next end of turn |
| **Condemned** | ⚑ | Red `#e05050` | Will Burn at start of source player's next turn | Resolves at start of next turn |
| **Nullified** | ⊘ | Blue-gray `#7090b8` | Awards 0 Eminence, cannot be used for Blueprints, and cannot be Encrypted; the allied player ignores Nullified on the first Nullified Artifact forged this game | Persists until the card leaves play |
| **Avatar Seed** | Faceted seed sigil | Green-gold `#67e8a2` / `#d5b96c` | Opponent forge → allied player gains matching permanent Affinity | Mold persists for the game; Artifact brand persists until forged or removed |
| **Burned** | ✕ | Orange `#ff7040` | Transient label during burn animation | ~300ms, fades as BurnFlash ramps |

### Marker Expiration Rules
- **Forgotten**: expires at the source player's next end of turn; repeat cycle returns after 12 owner-turn cooldowns
- **Condemned**: Burns at `start_of_turn` hook on the source player's next turn
- **Nullified**: Persists until the Artifact leaves play; other brands can coexist with it
- **Avatar Seed**: Persists until an opponent forges the card; payout at end of source player's next turn after forge

---

## Visual Identity & Art Lock Status

### Aura Style Variants

Each Luminary has an `auraStyle` that drives idle animation and cutscene flash behavior:

| Aura Style | Idle Behavior | Flash Origin | Flash Scale |
|------------|---------------|--------------|-------------|
| `fire` | Irregular upward flicker | 50% 62% | 1.80 |
| `storm` | Electric rapid flicker | 50% 42% | 1.68 |
| `tide` | Slow rolling wave | 50% 50% | 1.88 |
| `void` | Imploding dark pulse | 50% 50% | 1.55 |
| `radiant` | Slow rotating pulse | 50% 50% | 1.72 |
| `verdant` | Organic breathing pulse | 50% 58% | 1.82 |
| `bloom` | Bursting outward | 50% 50% | 1.92 |
| `astral` | Cosmic shimmer | 50% 50% | 1.75 |
| `pale` | Pale balanced pulse | 50% 50% | 1.68 |
| `distorted` | Glitchy static | 50% 50% | 1.70 |
| `compass` | Directional needle | 50% 50% | 1.72 |
| `oracle` | Prophetic shimmer | 50% 50% | 1.78 |
| `null` | Silent void | 50% 50% | 1.60 |

### Art Lock Status (All 12 Illustrated Panels + Entities)

Per `replit.md` canonical brief:

| ID | Panel | Entity | Aura | Notes |
|----|-------|--------|------|-------|
| `lum_ember` | ✅ Locked | ✅ Locked | — | Ember Sovereign; gold standard reference |
| `lum_forge` | ✅ Locked | ✅ Locked | — | Iron Harbinger; gold standard reference |
| `lum_verdant` | ✅ Locked | ✅ Locked | — | Verdant Oracle; gold standard reference |
| `lum_void` | ✅ Locked | ✅ Locked | ✅ Purple radial | — |
| `lum_radiant` | ✅ Locked | ✅ Locked | — | — |
| `lum_compass` | ✅ Locked | ✅ Locked | — | — |
| `lum_oracle` | ✅ Locked | ✅ Locked | — | Deferred (inactive) |
| `lum_bloom` | ✅ Locked | ✅ Locked | — | — |
| `lum_tide` | ✅ Locked | ✅ Locked | — | — |
| `lum_pale` | ✅ Locked | ✅ Locked | ✅ Silver/pearl starburst | — |
| `lum_astral` | ✅ Locked | ✅ Locked | — | — |
| `lum_null` | ✅ Locked | ✅ Locked | — | — |

**Fallbacks:** `lum_moth`, `lum_seed`, `lum_orchard`, `lum_hunger`, `lum_scholar` use procedural SVG fallbacks or shared entities (`BloomEntity`, `HungerEntity`). All illustrated assets use PNG panels + entities; no Luminary falls back to SVG in the displayed game.

---

*Document generated from canonical sources: `gameEngine.ts`, `luminaryAssets.tsx`, `luminaryAnimationConfig.ts`, `game-luminary-effects.tsx`, `LuminaryActivationCinematic.tsx`.*
