# LUMINAe Tutorial Engine Architecture v0.1

## Status

Draft source-of-truth candidate.

This document is an architecture addendum to:

`LUMINAe_TUTORIAL_DIRECTOR_SPEC_v0.1.md`

It exists because the director-spec tutorial differs meaningfully from normal Luminae gameplay. The guided tutorial should not be forced awkwardly through the normal multiplayer turn engine if doing so creates brittle workarounds.

---

## Core Decision

The first-run guided tutorial should be implemented as a **scripted tutorial scenario**, not as a normal multiplayer match with tutorial overlays.

The tutorial should use real Luminae card data and real rule helpers where correctness matters, but it should own its own pacing, camera, lockouts, scripted market state, and cinematic transitions.

In short:

```text
Normal Game = competitive match engine.
Tutorial = scripted teaching scenario using real game concepts.
```

---

## Why This Matters

The tutorial director spec intentionally requires behavior that differs from normal play:

- no active opponent
- no true turn pressure
- strict Lumii-controlled lockout
- curated Forge rows
- forced tutorial card sequence
- repeated Harness actions during the Tier 3 lesson
- cinematic fast-forward
- scripted artifact acquisition
- guided Luminary trigger
- camera and focus control
- foreground card teaching
- wrong-click nudges

Trying to superimpose all of that on the existing game engine risks making the tutorial fragile, confusing, and hard to maintain.

---

# 1. Rejected Approach: Normal Engine Overlay

## Description

A normal game room is created, then tutorial logic tries to hide or suppress unwanted normal game behavior.

## Pros

- maximum rules fidelity
- no separate state model
- easier to reuse current game screens initially

## Cons

- requires fake opponent or opponent suppression
- requires skipping or bypassing turn cadence
- makes repeated Harness awkward
- makes fast-forward state injection awkward
- creates brittle action-gating edge cases
- makes camera choreography harder
- makes curated market state harder
- risks tutorial bugs whenever normal engine changes
- can leave visible traces of multiplayer structure that confuse players

## Verdict

Do not use this as the long-term architecture for the director-spec tutorial.

It is acceptable only as a temporary prototype bridge.

---

# 2. Recommended Approach: Tutorial Scenario Layer

## Description

Create a tutorial-specific scenario controller that owns tutorial pacing and presentation while borrowing real game data and rule helpers.

The tutorial has its own state machine:

```text
Tutorial beat
→ allowed actions
→ camera target
→ Lumii position
→ highlighted target
→ lockout state
→ scripted market
→ player tutorial state
```

The tutorial should not require an active opponent.

If the existing backend requires a second participant, that participant should be a passive placeholder and should not influence tutorial logic.

---

## Core Principle

The tutorial should teach **real concepts**, not necessarily obey the full real cadence.

Examples:

| Concept | Must remain real? | Tutorial adaptation |
|---|---:|---|
| Artifact costs | Yes | Use real card costs |
| Discounts | Yes | Use real discount helper if available |
| Forge action | Yes | Player clicks actual Forge-style action |
| Reserve action | Yes | Player clicks actual Reserve-style action |
| Singularity substitution | Yes | Teach real substitution logic |
| Opponent turns | No | Suppress entirely |
| Turn rhythm | No | Suspend during tutorial |
| Tier 3 Harnessing | Conceptually yes | Allow repeated Harness for teaching |
| Fast-forward | No normal equivalent required | Scripted cinematic state update |

---

# 3. Architecture Overview

## TutorialDirector

Owns the guided experience.

Responsibilities:

- current beat number
- Lumii dialogue
- Lumii position
- camera target
- attention mode
- target highlight
- lockout state
- allowed action list
- wrong-click nudge
- beat transition conditions
- cinematic triggers
- tutorial completion

The TutorialDirector should answer:

```text
What is the player allowed to do right now?
Where should Lumii be?
What should the player look at?
What happens after the player performs the intended action?
```

---

## TutorialScenarioState

Tracks simplified gameplay state needed for the tutorial.

Responsibilities:

- player affinities
- player Singularity
- player reserved artifacts
- player forged artifacts
- player artifact bonuses
- player Eminence
- Verdance progress
- curated Forge rows
- scripted artifact acquisition
- Luminary trigger state
- victory state

This state should be deterministic and replayable.

---

## Shared Rule Helpers

Use shared helpers from the real game where possible.

Recommended helpers:

```text
calculateDiscountedCost()
canAfford()
spendAffinity()
applySingularitySubstitution()
forgeArtifact()
reserveArtifact()
calculateArtifactBonuses()
calculateEminence()
checkLuminaryTrigger()
```

If existing helpers are tightly coupled to the normal engine, create thin wrappers rather than duplicating logic blindly.

---

## Tutorial Presentation Layer

Owns visual guidance.

Responsibilities:

- black-screen intro
- camera pan to Lumii
- Singularity crack/shatter reveal
- cinematic affinity-token sequence
- Lumii movement
- foreground cards
- target highlights
- dim overlays
- interface lockouts
- bouncing/pulsing attention animation
- blue time-stream fast-forward
- card fly-to-storage animations
- final Luminary/victory sequence

---

# 4. Normal Game vs Tutorial Responsibilities

| Responsibility | Normal Game Engine | Tutorial Scenario |
|---|---:|---:|
| Competitive turn order | Yes | No |
| Opponent AI | Yes | No |
| Normal action legality | Yes | Partial / beat-specific |
| Card data | Yes | Yes, reused |
| Costs | Yes | Yes, reused |
| Discounts | Yes | Yes, reused |
| Forge/Reserve concepts | Yes | Yes, guided |
| Camera choreography | No | Yes |
| Lockout and nudges | No | Yes |
| Scripted market rows | No | Yes |
| Fast-forward animation | No | Yes |
| Repeated Harness practice | No | Yes |
| Lumii dialogue | No | Yes |

---

# 5. Tutorial Beat Model

Each tutorial beat should have structured data.

Recommended shape:

```ts
type TutorialBeat = {
  id: string;
  title: string;
  mode: "listen" | "look" | "act" | "cinematic" | "semiOpen";
  dialogue: TutorialDialogueLine[];
  cameraTarget?: TutorialTarget;
  lumiiTarget?: TutorialTarget;
  highlightedTargets?: TutorialTarget[];
  foregroundCardId?: string;
  allowedActions?: TutorialAllowedAction[];
  wrongClickNudge?: string;
  completionTrigger: TutorialCompletionTrigger;
  onEnter?: TutorialEffect[];
  onComplete?: TutorialEffect[];
};
```

This is illustrative, not mandatory.

The important requirement is that beats are explicit and inspectable.

---

# 6. Action Lockout Policy

## Listen Mode

Used when Lumii is explaining core concepts.

- board dimmed
- all gameplay actions locked
- only advance dialogue allowed

## Look Mode

Used when Lumii introduces an area.

- target area spotlighted
- unrelated actions locked
- player may not accidentally alter state

## Act Mode

Used when player must perform one exact action.

- only intended target/actions enabled
- wrong clicks trigger Lumii nudge
- target pulses or bounces until completed

## Semi-Open Mode

Used for Tier 3 choice.

Allowed:

- repeated Harness
- selecting among valid Tier 3 Verdance cards
- forging one valid Tier 3 Verdance card
- adjusting affinities if token limit reached

Blocked:

- unrelated forge/reserve actions
- impossible non-Verdance purchase
- normal turn progression
- opponent behavior

---

# 7. Scripted Card Rows

The tutorial should curate rows rather than relying on random market state.

## Required Tutorial Card Slots

The tutorial needs real in-app cards for:

1. first guided Tier 1 Verdance forge
2. second reserved Tier 1 Verdance card discounted by the first card
3. guided Tier 2 Verdance card discounted by the first two artifacts
4. three purchasable Tier 3 Verdance cards
5. one impossible non-Verdance Tier 3 card
6. two fast-forwarded Verdance Tier 3 artifacts
7. final Tier 2 Verdance artifact with 2 Eminence

## Selection Rules

Use real cards.

Prefer cards that:

- are simple
- have no distracting special rules
- support Verdance progression
- demonstrate discounting clearly
- make the final Luminary trigger reliable
- preserve the intended Eminence math

Avoid fake tutorial-only cards unless there is no viable real-card solution.

---

# 8. Tutorial Harnessing Rules

## Fully Guided Harness

During early beats:

- exact affinity choices are highlighted
- only those choices can be selected
- Harness button is enabled only when the correct selection is made

## Tier 3 Practice Harness

During the Tier 3 choice beat:

- player may Harness repeatedly
- normal turn cadence is suspended
- opponent does not act
- player may adjust affinities if the limit is reached
- token/affinity limit is still respected and taught if encountered

Lumii framing:

> I will hold the flow of time still. Gather what you need, then choose what your society will shape next.

---

# 9. Fast-Forward State Injection

The fast-forward is a tutorial-specific cinematic state update.

It should not be implemented as a series of fake opponent turns.

## Visual Sequence

1. Lumii announces that centuries will pass.
2. A subtle flowing blue stream animation appears.
3. The stream must not obscure the main card animations.
4. Two Verdance Tier 3 artifacts complete themselves.
5. Each card flips or rises into foreground.
6. Each flies into the player’s Verdance artifact storage.
7. State updates treat both as obtained.
8. Eminence and Verdance progress update visibly.
9. Player reaches at least 10 Eminence.

## Rule

The card acquisition animation is more important than the blue stream.

The stream is atmosphere. The cards are the event.

---

# 10. Opponent Policy

The tutorial should not have an active opponent.

If a second participant is technically required:

- use passive placeholder
- no turns
- no actions
- no board changes
- no logs
- no win condition
- no visible emphasis unless unavoidable

The tutorial should never ask the player to wait for an opponent.

---

# 11. Fidelity Guardrails

The tutorial may suspend turn rhythm, but it must not teach false strategy.

## Allowed Tutorial Deviations

- no opponent
- no turn cadence
- repeated Harness during Tier 3 lesson
- scripted market
- scripted fast-forward
- forced Luminary trigger

## Not Allowed

- fake costs
- fake discount behavior
- fake cards unless unavoidable
- fake Singularity behavior
- fake Forge/Reserve meanings
- fake Eminence/luminary relationship
- implying full games allow indefinite Harness without turns

Whenever the tutorial deviates from normal cadence, Lumii should frame it as a teaching intervention.

---

# 12. Implementation Recommendation

Build the tutorial in layers:

## Phase 1 — Scenario State

- create TutorialScenarioState
- load real tutorial card IDs
- define current beat
- define allowed actions
- block all other actions

## Phase 2 — Real Rule Helpers

- wire in cost/discount calculation
- wire in reserve/forge behavior
- wire in Singularity substitution
- wire in Eminence calculation
- wire in Luminary trigger

## Phase 3 — Presentation

- Lumii movement
- camera movement
- highlight/tether
- foreground card focus
- lockout overlays
- wrong-click nudges

## Phase 4 — Cinematics

- black-screen intro
- Singularity shatter reveal
- affinity token sequence
- blue time stream fast-forward
- card fly-to-storage animations
- Verdance Luminary reveal
- victory wrap-up

Do not start with cinematic polish before the scenario state is stable.

---

# 13. Critical Risk

The largest risk is trying to preserve normal-game architecture so strictly that the tutorial becomes confusing.

The second-largest risk is making the tutorial so custom that it teaches a different game.

The correct balance:

```text
Custom pacing.
Real concepts.
Real cards.
Real costs.
Real discounts.
Real Forge/Reserve meaning.
Scripted presentation.
```

---

# 14. Source Relationship

This file should sit immediately after:

`LUMINAe_TUTORIAL_DIRECTOR_SPEC_v0.1.md`

The Director Spec defines **what happens**.

This file defines **how it should be architected**.

If implementation constraints conflict with the Director Spec, do not silently simplify the tutorial. Return to the spec and revise the beat intentionally.
