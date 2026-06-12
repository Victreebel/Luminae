# Luminary Reference Guide — Canonical v1.0

> **Scope:** This document captures the exact mechanical effects, animation specs, visual identity, and engine logic for every Luminary in the current Luminae build. Sources: `gameEngine.ts` (server), `luminaryAssets.tsx` (frontend visuals), `luminaryAnimationConfig.ts` (animation metadata), `game-luminary-effects.tsx` (marker/badge system), and `LuminaryActivationCinematic.tsx` (cinematic overlay).

---

## Table of Contents

1. [Active Pool & Tier Structure](#active-pool--tier-structure)
2. [Luminary Profiles (12 Active)](#luminary-profiles)
3. [Deferred / Inactive Luminaries](#deferred--inactive-luminaries)
4. [Animation System Overview](#animation-system-overview)
5. [Living Luminary Mechanics](#living-luminary-mechanics)
6. [Claim & Arrival Resolution](#claim--arrival-resolution)
7. [Card Marker System](#card-marker-system)
8. [Visual Identity & Art Lock Status](#visual-identity--art-lock-status)

---

## Active Pool & Tier Structure

The active Luminary pool is `AVAILABLE_LUMINARIES` (12 illustrated Luminaries). Each game draws `playerCount + 1` from this pool. The pool is divided by summoning cost tier:

| Tier | Cost | Eminence | Count | Luminaries |
|------|------|----------|-------|------------|
| **Mono** (Tier 1) | 5–6 of one affinity | 2 | 5 | Red Moth, Tide Architect, Verdant Oracle, Void Warden, Concordance Mandala |
| **Dual** (Tier 2) | 4+4 of two affinities | 3 | 5 | Phoenix Paradox, Catalyst Bloom, Iron Harbinger, Hourless Compass, Seed Beyond Seasons, Glass Orchard, Pale Merchant |
| **Triple** (Tier 3) | 3+3+3 of three affinities | 2–4 | 3 | Ember Sovereign, First Hunger, Null Sovereign |

> **Note:** The 12 "locked" illustrated assets per `replit.md` are: lum_ember, lum_forge, lum_verdant, lum_void, lum_radiant, lum_compass, lum_oracle, lum_bloom, lum_tide, lum_pale, lum_astral, lum_null. The `AVAILABLE_LUMINARIES` list includes these plus some extras (moth, seed, orchard, hunger) — see the full engine list below.

---

## Luminary Profiles

### Mono-Color Luminaries (2 Eminence)

---

#### 1. Red Moth — *Rupture of the Still*
| Field | Value |
|-------|-------|
| **ID** | `lum_moth` |
| **Domain** | Rupture |
| **Affinity** | Flare (ruby) |
| **Cost** | 6 Flare |
| **Eminence** | 2 |
| **Effect** | On arrival, burns the lowest-cost Tier III and Tier II Artifact **without Flare affinity** from the market. Those slots immediately redraw. |
| **Flavor** | *"Where it passes, the universe is divided into before and after."* |
| **Animation Archetype** | `burn` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` (keyword: burn) → `keywordEvents` (burn) → `marketRedraw` |
| **Residue** | None (burn is immediate) |
| **Colors** | Primary `#ef4444`, Secondary `#7f1d1d`, Aura `fire` |
| **Art Status** | Panel + entity on disk; no aura (falls back gracefully) |

---

#### 2. Tide Architect — *The Observer Effect*
| Field | Value |
|-------|-------|
| **ID** | `lum_tide` |
| **Domain** | Tides |
| **Affinity** | Continuum (sapphire) |
| **Cost** | 6 Continuum |
| **Eminence** | 2 |
| **Effect** | On arrival, scries the top cards of the Tier II and Tier III decks and reorders them so Continuum Artifacts surface first. |
| **Flavor** | *"Possibility collapses to its bias."* |
| **Animation Archetype** | `scry` |
| **Procedure Steps** | `luminaryPulse` → `deckScry` (tier2, tier3, bias: sapphire) → `marketRedraw` |
| **Residue** | None |
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
| **Eminence** | 2 |
| **Effect** | **Living Luminary bonus.** Starting the turn after this Luminary arrives, you gain +1 Verdance toward every card purchase while you own it. |
| **Flavor** | *"It answers only after the question has taken root."* |
| **Animation Archetype** | `passiveBoon` |
| **Procedure Steps** | `luminaryPulse` only |
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
| **Eminence** | 0 (awards none) |
| **Oblivion** | 4 |
| **Effect** | On arrival, **ALL players** (including you) immediately lose 4 Eminence. |
| **Flavor** | *"In the space between stars, something watches without eyes."* |
| **Animation Archetype** | `globalDisruption` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `scoreChange` (all players, -4) |
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
| **Eminence** | 2 |
| **Effect** | Once per game, when you end a turn with 8 or more Radiance Artifacts forged, you immediately gain +2 Eminence. |
| **Flavor** | *"Truth is not revealed. It is aligned."* |
| **Animation Archetype** | `thresholdPayoff` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `scoreChange` (+2) |
| **Residue** | None |
| **Colors** | Primary `#fef9c3`, Secondary `#2ecc71`, Aura `radiant` |
| **Art Status** | Illustrated panel + entity locked |

---

### Dual-Color Luminaries (3 Eminence)

---

#### 6. Phoenix Paradox — *Ash-Seeking Recurrence*
| Field | Value |
|-------|-------|
| **ID** | `lum_astral` |
| **Domain** | Recurrence |
| **Affinities** | Flare, Continuum |
| **Cost** | 4 Flare + 4 Continuum |
| **Eminence** | 3 |
| **Effect** | On arrival, burns face-up Tier III then Tier II Artifacts from the market **one by one** until a Flare or Continuum card is revealed — that card stays. |
| **Flavor** | *"Every ending becomes fuel. Every return comes back less innocent."* |
| **Animation Archetype** | `revealUntil` |
| **Procedure Steps** | `luminaryPulse` → `reveal` (tier3, stop: Flare/Continuum) → `keywordEvent` (burn) → `reveal` (tier2, stop: Flare/Continuum) → `keywordEvent` (burn) → `targetClaim` → `marketRedraw` |
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
| **Eminence** | 3 |
| **Effect** | At the end of each of your turns, gain +1 Eminence for every burn effect that occurred since your last turn (from any source). |
| **Flavor** | *"It waits for the nova to wound the world, then flowers in the scar."* |
| **Animation Archetype** | `thresholdPayoff` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `scoreChange` (dynamic amount = burn count) |
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
| **Eminence** | 3 |
| **Effect** | On arrival, burns **every** currently face-up Tier III Artifact from the market. All those slots immediately redraw. |
| **Flavor** | *"The hammer falls only after the future has already broken."* |
| **Animation Archetype** | `burn` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` (keyword: burn) → `keywordEvents` (burn) → `marketRedraw` |
| **Residue** | None |
| **Colors** | Primary `#f97316`, Secondary `#1c1917`, Aura `storm` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 9. The Hourless Compass — *The Forgotten Hour*
| Field | Value |
|-------|-------|
| **ID** | `lum_compass` |
| **Domain** | Erasure |
| **Affinities** | Continuum, Abyss |
| **Cost** | 4 Continuum + 4 Abyss |
| **Eminence** | 3 |
| **Effect** | On arrival, marks **all** currently face-up market Artifacts as **Forgotten** — they award 0 Eminence when forged until the end of your next turn. |
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
| **Eminence** | 3 |
| **Effect** | On arrival, places **Avatar Seed** tokens on the top card of each deck tier. When an opponent forges a seeded card, you earn pending Eminence paid out at the end of your next turn. |
| **Flavor** | *"It leaves its avatars where tomorrow has already begun to remember."* |
| **Animation Archetype** | `seeded` |
| **Procedure Steps** | `luminaryPulse` → `deckScry` (all tiers, bias: seeded) → `residue` (seeded) |
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
| **Eminence** | 3 |
| **Effect** | Once per game, the first time you forge an Artifact, a free copy of your cheapest-cost Tier I Artifact is added to your collection. |
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
| **Eminence** | 3 |
| **Effect** | On arrival, each player holding more than half the starting supply of any crystal must return 1 of that crystal to the bank. |
| **Flavor** | *"Every bargain reveals one truth and buries another."* |
| **Animation Archetype** | `crystalReturn` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `crystalReturn` (all affected players) |
| **Residue** | None |
| **Colors** | Primary `#cbd5e1`, Secondary `#0a0a14`, Aura `pale` |
| **Art Status** | Illustrated panel + entity locked |

---

### Triple-Color Luminaries (2–4 Eminence)

---

#### 13. Ember Sovereign — *Cinder Mandate*
| Field | Value |
|-------|-------|
| **ID** | `lum_ember` |
| **Domain** | Flame |
| **Affinities** | Flare, Abyss, Radiance |
| **Cost** | 3 Flare + 3 Abyss + 3 Radiance |
| **Eminence** | 4 |
| **Effect** | **Two-path:** On arrival, marks all face-up Artifacts lacking Flare, Abyss, or Radiance as **Condemned**. At the start of your next turn, Condemned cards burn, clearing those slots. |
| **Flavor** | *"What cannot survive the fire is granted the mercy of disappearance."* |
| **Animation Archetype** | `condemned` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` (keyword: condemned) → `residue` (condemned) |
| **Residue** | `condemned` |
| **Colors** | Primary `#ff5a3c`, Secondary `#7b1fa2`, Aura `fire` |
| **Art Status** | Illustrated panel + entity locked |

---

#### 14. First Hunger — *Assimilation*
| Field | Value |
|-------|-------|
| **ID** | `lum_hunger` |
| **Domain** | Assimilation |
| **Affinities** | Flare, Verdance, Radiance |
| **Cost** | 3 Flare + 3 Verdance + 3 Radiance |
| **Eminence** | 2 |
| **Effect** | On arrival, you may replace your forge action this turn with **Assimilation** — copy the bonus affinity of any Artifact in your collection as a permanent bonus. |
| **Flavor** | *"Its first act is consumption. Its second is perfect repetition."* |
| **Animation Archetype** | `assimilate` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `pendingAction` (assimilate) |
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
| **Eminence** | 0 (awards none) |
| **Effect** | On arrival, marks all face-up Tier III Artifacts lacking Continuum, Abyss, or Radiance as **Nullified** — they award 0 Eminence when forged. |
| **Flavor** | *"Past the last observable star, entire futures fall silent without being destroyed."* |
| **Animation Archetype** | `suppression` |
| **Procedure Steps** | `luminaryPulse` → `targetClaim` → `residue` (nullified) |
| **Residue** | `nullified` |
| **Colors** | Primary `#ffffff`, Secondary `#0a0a14`, Aura `null` |
| **Art Status** | Illustrated panel + entity locked |

---

## Deferred / Inactive Luminaries

These Luminaries are defined in the engine but are **not** in the `AVAILABLE_LUMINARIES` pool. They do not appear in games.

| ID | Name | Domain | Cost | Eminence | Note |
|----|------|--------|------|----------|------|
| `lum_oracle` | The Cosmic Oracle | Prophecy | 3+3+3 (F/C/V) | 4 | Deferred — no effectName/effectDescription in current build |
| `lum_scholar` | The Celestial Scholar | Erasure | 4 Continuum + 4 Radiance | 3 | v0.9 addition; deferred from active rotation. Effect: draws two cards, keeps one. |

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
| `keywordEvent` | Single keyword fires (🔥 BURN, ◎ FORGOTTEN) | Phoenix Paradox, Iron Harbinger |
| `keywordEvents` | Batch keyword fires | Red Moth |
| `deckScry` | Deck-top shimmer + reorder preview | Tide Architect, Compass, Seed |
| `scoreChange` | `+N EMN` or `-N EMN` flash | Void Warden, Radiant, Bloom, Pale |
| `crystalReturn` | `◇ RETURN` flash + crystal animation | Pale Merchant |
| `residue` | Persistent marker badge placed on card | Compass (forgotten), Ember (condemned), Null (nullified), Seed (seeded) |
| `marketRedraw` | Slot refresh animation | Burn-family Luminaries |
| `reveal` | Card flip reveal from deck | Phoenix Paradox |
| `pendingAction` | `✦ ASSIMILATE` action replacement | First Hunger |

### ArrivalBrandStrike System

When a Luminary places a **persistent marker** (Forgotten, Condemned, Nullified, Avatar Seed) on market cards, the `ArrivalBrandStrike` overlay fires:

1. **Source pulse** (if source Luminary provided): Expanding ring from portal in Luminary colors
2. **Lightning beam** (300ms delay): Sharp gradient beam from viewport top to card center
3. **Impact flash**: Crisp border flash on card (2px, no blur)
4. **Large brand glyph**: Marker icon (◎, ⚑, ⊘, ⁕) covers card face, pulses, fades
5. **CardMarkerBadge**: Springs in after brand delay (spring physics, stiffness 420)

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

When a Luminary is claimed, the engine assigns a default active affinity (first eligible) stored in `GameState.luminaryAffinities` as a `LuminaryActiveState` array.

Starting the **next turn** after summoning, the owner gains **+1 bonus toward that active affinity** on every card purchase.

The `effectiveBonuses()` function merges:
- Base `player.bonuses` (from forged Artifact cards)
- Living Luminary bonuses (from all claimed Luminaries the player owns)

This merged result drives `effectiveCost()` and `payForCard()` — the discount is applied automatically at purchase time.

### `toggle_luminary_affinity` (Action)

Owners can toggle the active affinity **anytime** (even off-turn) by clicking the claimed Luminary portal card. This cycles to the next eligible affinity.

- Single-eligible Luminaries: always use that affinity (no toggle UI)
- Multi-eligible Luminaries: show selector dots + a `↻` badge
- `turnCount` (monotonically incrementing per `advanceTurn`) gates activation — bonus applies only after the summoning turn

---

## Claim & Arrival Resolution

### Claim Order
When a single action qualifies a player for multiple Luminaries, the canonical order is:
1. Highest `lumens` value first
2. If tied, order in `LUMINARIES` array (stable deterministic order)

### Oblivion vs. Eminence
- **Oblivion**: Set via `oblivion: N` on the LuminaryDef. On claim, ALL players lose N Eminence. The claimer gains **zero** Eminence.
- **Eminence**: Standard `lumens: N`. Claimer gains N Eminence immediately.

### Win Attribution
- `winTriggerLuminaryId` is set to the Luminary that pushed the player to ≥15 Eminence
- If a player wins via Luminary claim, the win cinematic names the triggering Luminary

---

## Card Marker System

### Marker Types

| Marker | Label | Color | Meaning | Duration |
|--------|-------|-------|---------|----------|
| **Forgotten** | ◎ | Blue-purple `#9988ee` | Awards 0 Eminence when forged | End of source player's next turn |
| **Condemned** | ⚑ | Red `#e05050` | Will Burn at start of source player's next turn | Resolves at start of next turn |
| **Nullified** | ⊘ | Blue-gray `#7090b8` | Awards 0 Eminence while marked | Persists until card is removed / re-marked |
| **Avatar Seed** | ⁕ | Green `#4cc88a` | Opponent forge → source player gains pending Eminence | Active until opponent forges it |
| **Burned** | ✕ | Orange `#ff7040` | Transient label during burn animation | ~300ms, fades as BurnFlash ramps |

### Marker Expiration Rules
- **Forgotten**: `summonedAtTurnCount + 2` — expires at the end of the source player's next turn
- **Condemned**: Burns at `start_of_turn` hook on the source player's next turn
- **Nullified**: Persists until the card is removed from market (burn, purchase, or re-mark)
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
