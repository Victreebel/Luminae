# ChatGPT Handoff — Luminae: Luminary Reference

## About the Game

**Luminae** is a browser-based multiplayer tabletop engine-building game. Players collect colored crystals called **affinities**, spend them to acquire **Artifact cards** that give permanent affinity bonuses, and race to reach **15 Eminence** (the victory point currency) first. Tie-break goes to the player with the fewest purchased cards.

There are 5 affinity types used in costs (and a 6th wild type):
- 🔴 **Flare** (ruby) — stellar fire energy
- 🔵 **Continuum** (sapphire) — temporal/causality consciousness
- 🟢 **Verdance** (emerald) — biological/ecological intelligence
- ⚫ **Abyss** (onyx) — entropy, silence, absence
- ⚪ **Radiance** (pearl) — crystalline order, coherence
- ✨ **Singularity** (flux) — wild, used as any affinity

## What Are Luminaries?

**Luminaries** are 12 powerful cosmic patron entities. At the start of each game, **playerCount + 1** Luminaries are randomly placed face-up in the center. Players can claim a Luminary during their turn by spending the exact affinity crystals listed as its requirement directly from their crystal supply.

Each Luminary is claimed **once** — the first player to meet the cost takes it permanently.

**Claiming a Luminary does two things:**
1. Awards the listed **Eminence** to the claimant (or triggers Oblivion — see below).
2. Grants a permanent **Living Luminary bonus**: +1 discount to one chosen affinity on every card purchase, starting the claimant's next turn. On dual- and triple-affinity Luminaries, the owner can toggle which affinity is active at any time (even off-turn, for free).

**Oblivion Luminaries** deal negative Eminence to *all* players simultaneously (including the summoner) the moment they are claimed.

---

## The 12 Luminaries

### Mono-Affinity — 2 Eminence

**The Tide Architect** (`lum_tide`)
- Domain: Tides
- Eminence: **+2**
- Requires: 🔵 6 Continuum
- Living bonus: 🔵 Continuum
- *"The sea does not rage. It simply rises."*

---

**The Verdant Oracle** (`lum_verdant`)
- Domain: Verdance
- Eminence: **+2**
- Requires: 🟢 6 Verdance
- Living bonus: 🟢 Verdance
- *"She reads the future in the rings of trees that have not yet been planted."*

---

**The Radiant Keeper** (`lum_radiant`)
- Domain: Light
- Eminence: **+2**
- Requires: ⚪ 6 Radiance
- Living bonus: ⚪ Radiance
- *"She holds back the dark not with fire, but with patience."*

---

**The Void Warden** (`lum_void`) ⚠️ OBLIVION
- Domain: Void
- Eminence: **−4 to ALL players**
- Requires: ⚫ 6 Abyss
- Living bonus: ⚫ Abyss
- *"In the space between stars, something watches without eyes."*

---

### Dual-Affinity — 3 Eminence

**The Iron Harbinger** (`lum_forge`)
- Domain: Ruin
- Eminence: **+3**
- Requires: 🟢 4 Verdance + ⚫ 4 Abyss
- Living bonus: 🟢 Verdance or ⚫ Abyss (toggle)
- *"What he builds he eventually unmakes. Creation and ruin are the same song played in different keys."*

---

**The Astral Weaver** (`lum_astral`)
- Domain: Stars
- Eminence: **+3**
- Requires: 🔴 3 Flare + 🔵 3 Continuum
- Living bonus: 🔴 Flare or 🔵 Continuum (toggle)
- *"Where stellar fire meets the deep cold, the astral web is woven."*

---

**The Pale Merchant** (`lum_pale`)
- Domain: Balance
- Eminence: **+3**
- Requires: ⚫ 3 Abyss + ⚪ 3 Radiance
- Living bonus: ⚫ Abyss or ⚪ Radiance (toggle)
- *"Every transaction is a small death. Every debt, a small birth."*

---

**The Bloom Tyrant** (`lum_bloom`)
- Domain: Wildgrowth
- Eminence: **+3**
- Requires: 🔴 4 Flare + 🟢 4 Verdance
- Living bonus: 🔴 Flare or 🟢 Verdance (toggle)
- *"She tends the garden of conflict and harvests its strange flowers."*

---

**The Stellar Guide** (`lum_compass`)
- Domain: Navigation
- Eminence: **+3**
- Requires: 🔵 4 Continuum + 🟢 4 Verdance
- Living bonus: 🔵 Continuum or 🟢 Verdance (toggle)
- *"The shortest path between two stars is a story."*

---

### Triple-Affinity — 4 Eminence

**The Ember Sovereign** (`lum_ember`)
- Domain: Flame
- Eminence: **+4**
- Requires: 🔴 3 Flare + 🟢 3 Verdance + ⚫ 3 Abyss
- Living bonus: 🔴 Flare, 🟢 Verdance, or ⚫ Abyss (toggle)
- *"Born of the first stellar ignition, she feeds on the light of dying suns and leaves only cinders where empires once stood."*

---

**The Cosmic Oracle** (`lum_oracle`)
- Domain: Prophecy
- Eminence: **+4**
- Requires: 🔴 3 Flare + 🔵 3 Continuum + 🟢 3 Verdance
- Living bonus: 🔴 Flare, 🔵 Continuum, or 🟢 Verdance (toggle)
- *"She sees what will be, and what might have been, and cannot tell the difference."*

---

**The Null Sovereign** (`lum_null`) ⚠️ OBLIVION
- Domain: Transcendence
- Eminence: **−4 to ALL players**
- Requires: 🔵 4 Continuum + ⚫ 4 Abyss + ⚪ 4 Radiance
- Living bonus: 🔵 Continuum, ⚫ Abyss, or ⚪ Radiance (toggle)
- *"Beyond the final star, past the edge of the last dark, something waits that was never born and cannot die."*

---

## Quick Reference Table

| Luminary | Requirement | Eminence | Living Bonus |
|---|---|---|---|
| Tide Architect | 🔵×6 | +2 | 🔵 |
| Verdant Oracle | 🟢×6 | +2 | 🟢 |
| Radiant Keeper | ⚪×6 | +2 | ⚪ |
| Void Warden ⚠️ | ⚫×6 | −4 all | ⚫ |
| Iron Harbinger | 🟢×4 + ⚫×4 | +3 | 🟢/⚫ |
| Astral Weaver | 🔴×3 + 🔵×3 | +3 | 🔴/🔵 |
| Pale Merchant | ⚫×3 + ⚪×3 | +3 | ⚫/⚪ |
| Bloom Tyrant | 🔴×4 + 🟢×4 | +3 | 🔴/🟢 |
| Stellar Guide | 🔵×4 + 🟢×4 | +3 | 🔵/🟢 |
| Ember Sovereign | 🔴×3 + 🟢×3 + ⚫×3 | +4 | 🔴/🟢/⚫ |
| Cosmic Oracle | 🔴×3 + 🔵×3 + 🟢×3 | +4 | 🔴/🔵/🟢 |
| Null Sovereign ⚠️ | 🔵×4 + ⚫×4 + ⚪×4 | −4 all | 🔵/⚫/⚪ |
