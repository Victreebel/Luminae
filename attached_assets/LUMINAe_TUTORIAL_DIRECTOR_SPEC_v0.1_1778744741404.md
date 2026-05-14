# LUMINAe Tutorial Director Spec v0.1

## Status

Draft source-of-truth candidate for the guided tutorial redesign.

This document should govern the next implementation pass for Luminae’s first-run tutorial. It replaces broad “make the tutorial better” prompts with a beat-by-beat director-approved sequence.

Do not treat this as final locked canon until reviewed.

---

## Core Tutorial Goal

The tutorial should teach the player to **think like an Architect first** and understand the win condition second.

The tutorial is not a tooltip tour. It is a guided initiation.

The player should feel:

- discovered by Lumii
- guided through a cosmic interface
- responsible for shaping the technological direction of an existing people / society
- gradually released from full guidance into constrained choice
- rewarded with a Verdance ascension arc that culminates in a Luminary answering

---

## Primary Fantasy

The player is not creating civilization from nothing.

The planets already contain life, people, and societies. The player is an **Architect** guiding technological direction and ascension paths toward cosmic scale.

Preferred tutorial language:

- Architect
- society
- cosmic society
- people
- life
- future
- path
- direction
- Forge
- artifact
- affinity
- Verdance
- Eminence
- Luminary

Avoid:

- civilization as the default repeated noun
- crystals
- gems
- currents, unless the UI actually renders flowing currents
- charges, unless the UI visually supports charge-like units
- patrons
- prizes
- collectors
- “summon” in tutorial-facing lore language unless unavoidable for existing UI

---

## Lumii Character Direction

Lumii should feel:

- mysterious but friendly
- warm, curious, quietly excited
- nonhuman but not cold
- an active guide, not a mascot
- authoritative but not omniscient
- capable of moving the camera and controlling the tutorial space

Lumii is best described as:

> an echo of the affinities

Do not overexplain what Lumii is.

---

## Tutorial Control Philosophy

The tutorial should be strongly guided.

### Early Tutorial

Use strict lockout.

- Player can advance Lumii text.
- Player can only click the action Lumii asks for.
- Wrong clicks are blocked with a short Lumii nudge.
- Background dims when Lumii needs attention.
- Lumii moves smoothly between locations rather than disappearing and reappearing.

### Mid Tutorial

Use controlled interaction.

- Player still follows a scripted Verdance path.
- Player performs real clicks.
- Only correct tutorial actions are available.
- Singularity misuse is blocked and explained.

### Tier 3 Choice

Use constrained freedom.

- Player may harness repeatedly.
- No opponent pressure.
- No real turn rhythm.
- Player chooses among three purchasable Verdance Tier 3 artifacts.
- One non-Verdance Tier 3 card is visible but intentionally unreachable.
- If the player clicks the unreachable card, Lumii explains why that path is not currently available.

---

## Visual / Animation Language

### Lumii Motion

Lumii should:

- remain visible when possible
- glide smoothly between tutorial focus areas
- bounce or pulse clearly above a target when directing attention
- tether visually to highlighted UI elements
- move the camera / viewport when needed
- hold the camera on the current focus until the step is complete

### Focus / Lockout

Use three attention states:

| Mode | Purpose | Behavior |
|---|---|---|
| **Listen** | Lumii explains a concept | Background dimmed, interface locked, Lumii/text dominant |
| **Look** | Lumii introduces a UI area | Target spotlighted, rest lightly dimmed, interactions mostly locked |
| **Act** | Player performs one action | Intended target pulses, all other actions blocked |

### Foreground Teaching

Lumii can pull cards/panels/tokens to the foreground.

When explaining cards, highlight:

- card name
- cost
- current owned affinities
- discounted cost
- bonus affinity
- Eminence value
- Reserve action
- Forge action

When explaining views, highlight:

- Discounted view
- Needed view

When explaining progress, highlight:

- Verdance artifact storage
- Luminary progress / threshold
- Eminence display

---

# Director Sequence

## Beat 0 — Contact

**Screen:** black.  
**Lumii:** not visible.  
**Text box:** appears alone.  
**Mode:** Listen.  
**Interaction:** tap to continue.

**Lumii dialogue:**

> Hello… Are you there?

**Purpose:** establish contact, mystery, and full tutorial control.

---

## Beat 1 — Locate Lumii

**Screen:** black.  
**Lumii:** off-screen right.  
**Text box:** appears to the right.  
**Mode:** Listen.  
**Interaction:** tap to continue.

**Lumii dialogue:**

> Over here.

**Action:** player taps.

**Camera:** pans right through darkness to reveal Lumii.

**Lumii dialogue after pan:**

> There you are.

Optional line, if pacing allows:

> I was beginning to wonder if this path would open.

**Purpose:** teach that Lumii exists spatially and can direct attention / camera movement.

---

## Beat 2 — Lumii Introduces Itself

**Screen:** void / black space.  
**Lumii:** visible, softly pulsing.  
**Mode:** Listen.  
**Interaction:** tap to continue.

**Lumii dialogue:**

> I am Lumii — an echo of the affinities.

Tap.

> I will help you guide a society toward the cosmic scale.

**Purpose:** define Lumii lightly without overexplaining.

---

## Beat 3 — The Architect

**Screen:** void.  
**Lumii:** visible.  
**Mode:** Listen.  
**Interaction:** tap to continue.

**Lumii dialogue:**

> And you are its Architect.

Tap.

> An Architect does not rule.

Tap.

> An Architect shapes the direction of a people.

Tap.

> You will decide what they reach for — and what they become.

**Purpose:** establish player role as guide of technological direction / ascension paths, not god or ruler.

---

## Beat 4 — Threshold Reveal

**Screen:** void behind Lumii.  
**Lumii:** foreground.  
**Mode:** Listen.  
**Interaction:** locked during animation.

**Lumii dialogue:**

> Then let me show you what guides them.

**Animation:**

1. A thin golden/yellow Singularity-colored crack appears behind Lumii.
2. Crack branches lightly.
3. Shatter pattern forms.
4. Brief flash of Singularity/yellow light.
5. Flash fades into a cosmic tutorial stage / board background.

**Important:** Do not explain Singularity yet. The gold crack is visual language only.

**Purpose:** reveal the board as a threshold opening, not a normal UI load.

---

## Beat 5 — Five Primary Affinities

**Background:** cosmic stage / board reveal.  
**Lumii:** foreground.  
**Mode:** Listen / cinematic.  
**Interaction:** locked.

**Lumii dialogue:**

> There are five primary affinities that guide the cosmos.

**Visual sequence:**

Each affinity appears as a spinning token/emblem, travels across the background, then fades or drifts toward the future affinity UI area.

Lumii names them only, without micro-meanings:

> Flare.

> Radiance.

> Verdance.

> Continuum.

> Abyss.

Then:

> Through them, a society chooses the kind of future it will build.

**Important:** Do not include Singularity in this opening affinity sequence.

**Purpose:** create visual identity for affinities without front-loading lore.

---

## Beat 6 — The Forge Appears

**Transition:** affinity tokens fade or streak toward the UI.  
**Camera:** shifts to the Forge / artifact market.  
**Mode:** Look.  
**Lockout:** full lockout except text advance.  
**Foreground:** one hand-picked tutorial artifact rises forward.  
**Lumii:** glides beside the card and pulses above it.

**Lumii dialogue:**

> Affinities alone are only potential.

Tap.

> The Forge gives them form.

Tap.

> Here, a society shapes artifacts — technologies that change what it can become.

**Card selection:** use a real, hand-picked Tier 1 Verdance artifact.

Recommended candidate:

- **Worldforming Seed**

If this card is not available or not suitable in app data, choose another real Tier 1 Verdance artifact with:
- simple cost
- no special rules
- Verdance bonus or Verdance relevance
- easy visual explanation

**Purpose:** teach goal before resource collection.

---

## Beat 7 — Artifact Cost

**Foreground:** tutorial artifact remains enlarged.  
**Mode:** Look.  
**Highlight:** cost section of the card.  
**Lumii:** bounces/pulses above the cost area.

**Lumii dialogue:**

> Every artifact has a cost.

Tap.

> To forge this, your society needs these affinities.

**Visual:** the cost icons / cost row pulse.

**Purpose:** connect artifact construction to affinity need.

---

## Beat 8 — First Harness, Fully Guided

**Camera:** Lumii glides from the card to the Affinity Well.  
**Mode:** Act.  
**Lockout:** only correct affinity selections and Harness action available.  
**Visual:** cost area remains ghosted or pinned nearby. Matching affinities in the Well pulse.

**Lumii dialogue:**

> Come. I’ll show you how to gather what the Forge needs.

Then:

> Select the affinities shown in the cost.

**Player action:**

- Player selects exact required affinities.
- Player clicks Harness.
- All other clicks are blocked.

**Wrong-click nudge:**

> Not yet. Follow the cost first.

**Completion dialogue:**

> Good. The Forge has what it needs.

**Purpose:** teach “read cost → harness matching affinities.”

---

## Beat 9 — First Forge, Fully Guided

**Camera:** returns to tutorial artifact.  
**Mode:** Act.  
**Lockout:** only the Forge action for that card is available.  
**Highlight:** Forge button.

**Lumii dialogue:**

> Now shape it.

**Player action:** click Forge.

**Animation:**

- Artifact moves into player’s artifact storage.
- Storage / owned artifact area pulses.
- Any new bonus is visibly added.

**Lumii dialogue after forge:**

> A forged artifact remains with your society.

Tap.

> Its bonus will make future artifacts easier to shape.

**Purpose:** teach forging and permanence.

---

## Beat 10 — Reserve a Specific Discounted Tier 1 Card

**Setup:** a second real Tier 1 Verdance card is available and discounted by the first artifact’s bonus.

**Camera:** moves to Forge / market.  
**Mode:** Look then Act.  
**Highlight:** second card, then its discounted cost.

**Lumii dialogue:**

> Your first artifact has already changed the path.

Tap.

> This artifact is now easier to shape because of what you built.

**Visual:** show original cost and discounted cost if UI supports it. If not, pulse the cost and the relevant owned bonus.

**Teach Discounted view:**

Lumii moves to the **Discounted** tab/view.

> The Discounted view reveals artifacts your society has already made easier to shape.

**Player action:** click Discounted view if not already active.

**Then:** highlight the specific card.

**Lumii dialogue:**

> Reserve this one. It will wait for you until you are ready.

**Player action:** click Reserve on the specific card.

**Lockout:** only that Reserve action is available.

**On reserve:**

- Card moves to reserve / hand area.
- Singularity is granted.

**Lumii dialogue:**

> Reserving protects a future artifact.

Tap.

> It also grants Singularity.

Tap.

> Hold that for now. A convergence is most useful when the path becomes harder.

**Purpose:** teach Reserve, Discounted view, and Singularity acquisition without spending Singularity yet.

---

## Beat 11 — Forge the Reserved Tier 1 Card Without Singularity

**Camera:** moves to reserve / hand area.  
**Mode:** Look then Act.  
**Foreground:** reserved card rises forward.  
**Highlight:** discounted cost, then reserve pile Forge action.

**Lumii dialogue:**

> Reserved artifacts can still be forged.

Tap.

> This one is discounted by what your society has already shaped.

**Action sequence:**

1. Lumii highlights the exact affinities needed.
2. Camera moves to Affinity Well.
3. Player selects the required affinities.
4. Player clicks Harness.
5. Camera returns to reserved card.
6. Player clicks Forge from reserve pile.

**Important:** player must not spend Singularity here.

**If player clicks Singularity:**

> Hold that Singularity for now. A harder path is coming.

**Purpose:** teach reserved forging and reinforce discounts while preserving Singularity for the Tier 2 lesson.

---

## Beat 12 — Tier 2 Guided Forge: Needed View + Singularity Substitution

**Setup:** one real Tier 2 Verdance card is available and discounted by the first two owned artifacts.

**Camera:** moves to Tier 2 Forge / market.  
**Mode:** Look.  
**Lumii:** hovers near Tier 2 row.

**Lumii dialogue:**

> Your society is no longer choosing from nothing.

Tap.

> Earlier artifacts now pull certain futures closer.

**Teach Needed view:**

Lumii moves to **Needed** view.

> The Needed view helps reveal artifacts that advance the path you are already building.

**Player action:** click Needed view.

**Highlight:** specific Tier 2 Verdance card.

**Lumii dialogue:**

> This one is within reach — but not perfectly.

**Foreground:** Tier 2 card rises forward.

**Highlight:**

- cost
- discounts from first two artifacts
- remaining shortfall
- Singularity owned by player

**Lumii dialogue:**

> Discounts have lowered the cost.

Tap.

> Singularity can stand in for what you still lack.

**Action sequence:**

1. Player gathers required affinities.
2. Player uses Singularity as substitution for the remaining missing affinity.
3. Player clicks Forge.

**Lockout:** only the correct sequence is available.

**Purpose:** teach Needed view, multi-artifact discounts, and Singularity substitution.

---

## Beat 13 — Tier 3 Choice Opens

**Setup:** Tier 3 row is curated:

- three purchasable Verdance Tier 3 artifacts
- one non-Verdance Tier 3 artifact
- non-Verdance card is impossible to obtain given current game state:
  - not eligible for discounts from purchased cards
  - raw cost greater than 10 affinity
  - not intended for purchase in tutorial

**Camera:** moves to Tier 3 row.  
**Mode:** Semi-open Act.  
**Lockout:** player may harness and purchase among available Tier 3 options. Other unrelated actions remain blocked.  
**Lumii:** hovers near Tier 3 row.

**Lumii dialogue:**

> Now choose.

Tap.

> Any of these Verdance artifacts will deepen the path you have shaped.

Tap.

> I will hold the flow of time still. Gather what you need, then choose what your society will shape next.

**Player freedom:**

- Player can perform Harness repeatedly.
- This does not behave like normal turn-based play.
- No opponent actions.
- No turn pressure.
- Player chooses one of the three purchasable Verdance Tier 3 artifacts.
- Player forges it.

**If player clicks impossible non-Verdance Tier 3 card:**

> That path is beyond this society’s reach for now. Its cost is too distant from what you have already shaped.

**If player reaches 10 affinity limit:**

> You have reached the affinity limit. To gather more, release some affinity first.

Then allow the player to put affinities back / adjust holdings.

**Purpose:** provide constrained choice while keeping the Verdance arc intact.

---

## Beat 14 — Win Condition Explanation

**Trigger:** player forges one Tier 3 Verdance artifact.

**Camera:** moves to player panel / Eminence display / Verdance artifact storage.  
**Mode:** Listen.  
**Lockout:** full lockout except text advance.  
**Highlight:** Eminence display and Verdance storage.

**Lumii dialogue:**

> Every artifact changes what your society can become.

Tap.

> Some also add Eminence.

Tap.

> Reach enough Eminence, and your society is no longer quiet in the cosmos.

If exact target is displayed:

> In a full game, the first society to reach 15 Eminence wins.

Alternative if shorter:

> Reach 15 Eminence, and the cosmos can no longer ignore what you have built.

**Purpose:** teach win condition after player has already felt the engine.

---

## Beat 15 — Fast-Forward Time

**Mode:** cinematic / Listen.  
**Lockout:** full.  
**Lumii:** moves above the board, brighter, active.

**Lumii dialogue:**

> Now I will let the centuries pass.

**Animation hierarchy:**

1. A flowing blue stream animation appears to simulate time.
2. The blue stream must be subtle and non-blocking.
3. It must not cover or compete with card acquisition.
4. Two additional real Verdance Tier 3 artifacts complete themselves.
5. Each card flips / rises clearly to the foreground.
6. Each card flies into the player’s Verdance artifact storage box.
7. Treat both as obtained by the player.
8. Verdance storage pulses.
9. Eminence display updates and pulses.
10. Player total Eminence should now be at least 10.

**Important:** the cards must be more visually prominent than the blue time stream.

**Purpose:** show long-term consequence of the path without making the player grind.

---

## Beat 16 — Final Guided Tier 2 Verdance Forge

**Setup:** one hand-picked real Tier 2 Verdance artifact with **2 Eminence** is available and clearly visible.

This purchase should be enough to trigger the in-app Verdance Luminary and win.

**Camera:** moves to the final Tier 2 Verdance artifact.  
**Mode:** Act.  
**Lockout:** only the necessary harness / forge actions are available.  
**Lumii:** bounces/pulses near the final card.

**Lumii dialogue:**

> One more artifact will make the path unmistakable.

Tap.

> Forge this, and the boundary will thin.

**Action sequence:**

1. Highlight final card.
2. Highlight cost / discounted cost.
3. Player harnesses required affinities if needed.
4. Player clicks Forge.
5. Artifact flies to Verdance storage.
6. Eminence updates.
7. Verdance threshold / Luminary trigger begins.

**Purpose:** final action completes the Verdance arc.

---

## Beat 17 — Verdance Luminary Answers

**Trigger:** final Tier 2 Verdance artifact is forged.

**Use:** existing in-app Verdance Luminary and existing emergence / reveal logic where possible.

**Lumii dialogue before / during emergence:**

> When a society expresses an affinity strongly enough, the boundary thins.

Tap or continue.

> And something answers.

**Visual:**

- Existing Verdance Luminary reveal animation.
- Do not over-explain the shattering panel.
- Do not call the Luminary a prize or patron.

**Purpose:** connect affinity depth to Luminary emergence.

---

## Beat 18 — Victory

**Trigger:** Verdance Luminary contribution reaches win condition.

**Camera:** Eminence / victory display.  
**Mode:** Listen.  
**Lumii:** calm, bright, near victory display.

**Lumii dialogue:**

> You followed Verdance to Eminence.

Tap.

> Other affinities lead elsewhere.

Tap.

> Now you know the first shape of the game.

**Final options:**

- Begin a full game
- Replay tutorial
- Return home

**Purpose:** end with confidence, mystery, and replay interest.

---

# Required Tutorial-Specific Rules

## No Active Opponent

Tutorial uses no active AI.

If the server requires a second participant, use a passive placeholder that:

- never takes turns
- never performs actions
- never changes the board
- never logs distracting actions
- cannot win

## Tutorial Harnessing

During fully guided beats:

- only specified affinity selections are available
- only specified actions are available

During Tier 3 semi-open beat:

- player may harness repeatedly
- tutorial ignores normal turn rhythm
- no opponent interruptions
- token limit still applies
- if token limit is reached, Lumii teaches the put-back rule

## Singularity

Singularity is not introduced in the opening five-affinity sequence.

Singularity is introduced when Reserve grants it.

Singularity must be saved during the reserved Tier 1 forge.

Singularity is used during the Tier 2 guided forge as substitution.

## Verdance Path

The tutorial path is scripted around Verdance.

This does not mean the whole game is Verdance-only.

The Tier 3 row must include a non-Verdance card to avoid the impression that high-tier choices are monochrome.

## Tier 3 Row Composition

During the tutorial Tier 3 choice:

- 3 purchasable Verdance Tier 3 artifacts
- 1 impossible non-Verdance Tier 3 artifact

The non-Verdance card should:

- be visually attractive enough to notice
- have raw cost greater than 10 affinity
- not receive meaningful discounts from the player’s built artifacts
- not be purchasable in the tutorial state

Only explain it if clicked.

---

# Implementation Dependencies / Open Data Choices

The implementation must choose real in-app cards for:

1. First guided Tier 1 Verdance forge
2. Second reserved Tier 1 Verdance card discounted by first card
3. Guided Tier 2 Verdance card discounted by first two artifacts
4. Three purchasable Tier 3 Verdance choices
5. One impossible non-Verdance Tier 3 card
6. Two fast-forwarded Verdance Tier 3 artifacts
7. Final Tier 2 Verdance artifact with 2 Eminence

Recommended selection principle:

- use real cards
- prefer simple/no special rules
- preserve Verdance discount chain
- avoid confusing names for first lessons
- ensure final math reaches Luminary + victory
- do not use fake tutorial-only cards unless absolutely necessary

---

# Tone Guardrails

Do:

- make Lumii active and spatial
- make the player feel like an Architect
- let the tutorial feel cinematic and replayable
- use Verdance as the first demonstrated path
- visually show cause and effect
- teach strategy through the sequence

Do not:

- front-load too much lore
- explain all five affinity meanings at the start
- describe visuals that are not present
- use “crystals” or “gems”
- overuse “civilization”
- imply Luminaries are prizes or patrons
- let broad Replit interpretation replace this director spec

---

# Next Step

After review, implement this spec as the tutorial source of truth.

Implementation should be exact and beat-driven, not a broad “improve tutorial” patch.
