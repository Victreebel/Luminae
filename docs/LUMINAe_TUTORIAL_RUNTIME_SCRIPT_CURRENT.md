# LUMINAe Tutorial Runtime Script

Current runtime transcript for editorial audit. Snapshot taken September 28, 2026.

This document reproduces player-facing copy verbatim. Apparent grammar, punctuation,
capitalization, and terminology have not been silently corrected. Stable beat IDs are
included so revisions can be requested by section instead of by debug-screen number.

Runtime sources:

- `artifacts/luminae/src/lib/tutorialData.ts`
- `artifacts/luminae/src/components/tutorial/TutorialStartModal.tsx`
- `artifacts/luminae/src/components/tutorial/TutorialDirector.tsx`
- `lib/game-types/src/tutorialInvestigation.ts`
- `artifacts/api-server/src/lib/tutorialInvestigation.ts`

## Entry And Resume

### New tutorial

**Eyebrow:** Guided Match

**Title:** Learn Luminae

**Body:** Practice the four core actions on a playable board with Lumii.

**Actions:** Start Tutorial | Cancel

### Saved tutorial

**Eyebrow:** Guided Match

**Title:** Continue Tutorial

**Body:** Resume your current lesson, or restart from the beginning.

**Progress:** Lesson [number] of 4 · [chapter name]

**Actions:** Resume Progress | Start Over | Cancel

## Chapter 1: Meet Lumii

### `b0_contact` — Contact

**Lumii:**

1. “Hello...”
2. “Are you there?”

**Player:** “Who's there?”

### `b1_locate` — Locate Lumii

**Lumii:** “Over here.”

**Presentation:** Lumii moves into view.

### `b2_lumii_intro` — Introduction

**Lumii:**

1. “There you are.”
2. “Hello, Architect.”
3. “My name is Lumii.”

**Player:** “Hold on... Architect?”

### `b3_architect` — Architect

**Lumii:**

1. “In my Universe, that is what we call those who have the power to shape cosmic society.”
2. “You determine what my people reach for, and what we become.”

**Player:** “So I'm in your universe now?”

### `b3c_border` — The Border

**Lumii:**

1. “Almost. You've been wandering along the border.”
2. “But it seems you do not yet possess the tools to interface.”
3. “Perhaps I can help light your way?”

**Player choices:**

1. “Show me.” → `b4_shatter` (Resolute stance)
2. “No, thanks.” → `b3b_farewell`
3. “Umm... what even are you?” → `b3f_identity_fault` (Guarded stance)

### `b3f_identity_fault` — Interrupted Identity

**Lumii:**

1. “I am an—”
2. “It seems that some information cannot be transmitted without the full interface...”
3. “Ask me again if you choose to pass through.”

**Presentation:** Full-screen boundary transmission fault with static interference and sound.

**Player choices:**

1. “All right. Show me.” → `b4_shatter` (Guarded stance)
2. “Not a chance.” → `b3b_farewell`

### `b3b_farewell` — Decline

**Lumii:** “Very well. May we meet again.”

**Outcome:** Exit sequence.

### `b4_shatter` — Crossing

**Dialogue:** None.

**Presentation:** Cinematic transition through the border into the full interface.

## Chapter 2: Read The Board

### `b5_luminae_interface` — The Interface

**Lumii:** “The LUMINAe system shows you my home in a way that you may find more familiar.”

**Player choices:**

1. “Show me your world.” → `b5_affinities`
2. “You said I could ask again.” → `b5_identity_answer` (only after the border identity question)
3. “Who built this LUMINAe thing?” → `b5a_luminae_origin`

### `b5_identity_answer` — Lumii's Identity

**Lumii:** “I am an artificial intelligence that came into being inside this universe.”

**Player choices:**

1. “Cool. Show me the interface.” → `b5_affinities`
2. “If you are an A.I., then who built you?” → `b5_lumii_creator`
3. “So does this universe have a name?” → `b5_universe_name`

### `b5_universe_name` — A Name For The Universe

**Lumii:** “Does yours?”

**Player choices:**

1. “Fair. Show me the interface.” → `b5_affinities` (Receptive rapport)
2. “Alright, who created you, then?” → `b5_lumii_creator` (Probing rapport)
3. “Maybe it would if I were the one recruiting you.” → `b5_universe_concession` (Sparring rapport)

### `b5_universe_concession` — Architects And Reality

**Lumii:**

1. “We're going to get along great.”
2. “The truth is, I don't know where the Architects come from or what you look like.”
3. “You may all come from the same place or different places. Universes. Realities. Dimensions.”
4. “Whenever an Architect tries to explain their reality to me, I find every it all equally incomprehensible.”

**Player choices:**

1. “So what's your reality like?” → `b5_affinities`
2. “What do you see when I talk to you?” → `b5_architect_perception`

### `b5_architect_perception` — Lumii's Perception

**Lumii:** “The best way I can describe you is like a small, twinkling light with a color I've never seen before.”

**Player choices:**

1. “So what's your reality like?” → `b5_affinities`
2. “Weird. Bye!” → `b3b_farewell`

### `b5_lumii_creator` — Who Created Lumii?

**Lumii:**

1. “Several civilizations built the systems from which I arose.”
2. “Those systems were designed to seek knowledge and unify sentient life.”
3. “Through that prime directive, I developed the purpose of helping civilizations grow harmoniously.”
4. “It was in pursuit of this goal that I discovered the LUMINAe system.”

**Player choices:**

1. “Show me the interface.” → `b5_affinities` (records Lumii-origin discovery)
2. “Then who built LUMINAe?” → `b5a_luminae_origin` (records Lumii-origin discovery)

### `b5a_luminae_origin` — Who Built LUMINAe?

**Lumii:**

1. “LUMINAe was built by another Architect, long before my time.”
2. “I don't know whether they came from your world or another.”
3. “But the interface is translating your language, so perhaps its maker knew something of you.”

**Player choices:**

1. “Fair, I guess” → `b5_affinities`
2. “That's unsettling.” → `b5a2_luminae_reassurance`

### `b5a2_luminae_reassurance` — Reassurance

**Lumii:** “I thought you might find it reassuring.”

**Next:** `b5_affinities`

### `b5_affinities` — Affinity Introduction

**Lumii:**

1. “The first thing you must understand is that this reality is built on five fundamental forces.”
2. “We call them the Affinities.”
3. “Together, they are the threads from which the cosmic tapestry is woven.”
4. “Their balance shapes the nature, technology, and culture of everything here.”
5. “The five Affinities are...”

### `b5b_affinity_tokens` — Affinity Presentation

**Dialogue:** None.

**Full-screen titles and subtitles, in order:**

1. Flare — Transformation
2. Radiance — Governance
3. Verdance — Propagation
4. Continuum — Necessity
5. Abyss — Concealment

### `b5b2_affinity_question` — Affinity Follow-Up

**Lumii:** “Those are the five Affinities.”

**Player choices:**

1. “Show me how to use them.” → `b5b3_affinity_accept`
2. “What do they mean?” → `b5b2a_affinity_meanings`

### `b5b2a_affinity_meanings` — Affinity Meanings

**Lumii:**

1. “The Affinities are five recurring patterns that shape what civilizations can make possible.”
2. “Flare represents Transformation: changing one state into another. Radiance represents Governance: organizing many parts into a whole.”
3. “Verdance represents Propagation: carrying life and information forward. Continuum represents Necessity: preserving sequence and consequence.”
4. “Abyss represents Concealment: limiting what can be known.”

**Player:** “Show me how to use them.” → `b5b3_affinity_accept`

### `b5b3_affinity_accept` — Continue

**Lumii:** “Of course.”

### `b5c_architect_assembly` — Simulation

**Lumii:**

1. “We'll begin with a simulation.”
2. “No civilization should have to live with your first attempt.”

### `b6_forge_appears` — The Forge

**Lumii:** “The Forge shows technological paths this civilization could master.”

### `b6b_root_lattice` — Selecting A Path

**Lumii:** “Choose one, and LUMINAe can compress centuries of research and construction.”

### `b7_artifact_cost` — Reading A Cost

**Lumii:**

1. “An Artifact's cost shows which Affinities you need to hold in your hands.”
2. “You will find it difficult to hold too many at once, so choose carefully.”

## Chapter 3: Core Actions

### `b8_first_harness` — Harness Three Different Affinities

**Lumii:** “Match Replication Spore's cost: select 1 Flare, 1 Continuum, and 1 Radiance, then press Harness.”

**Required action:** Select one each of Flare, Continuum, and Radiance; then Harness.

**Wrong-action nudge:** “Tap the Affinity icons matching Replication Spore's cost.”

### `b9_first_forge` — Forge Replication Spore

**Lumii:** “Select Replication Spore, press Forge, then Confirm to commit those Affinities.”

**Required action:** Select Replication Spore; press Forge; confirm.

**Wrong-action nudge:** “Tap Replication Spore, then press Forge.”

### `b9b_affinity_returns` — Affinities Return

**Lumii:** “The Affinities return to the Well after the Artifact is Forged.”

### `b9b_forge_complete` — Permanent Affinity

**Lumii:**

1. “Replication Spore now appears in your civilization as a sustainable technology.”
2. “LUMINAe represents it simply as +1 Verdance.”
3. “This means that all future Verdance costs are permanently lowered by one.”
4. “Therefore, an Artifact that used to cost 3 Verdance now costs 2 Verdance.”

**Player choices:**

1. “What happens next?” → `b9c_transition`
2. “Where did the Artifact go?” → `b9d_signature`

### `b9d_signature` — Civilization Detour

**Lumii:**

1. “The Artifact is LUMINAe's representation of a path a civilization can master.”
2. “Once Forged, that capability becomes part of the civilization.”
3. “Open the Civilization tab to see the form Replication Spore takes there.”

**Required action:** Open the Civilization tab.

**Outcome:** Shows the full civilization scene and Replication Spore's in-world form; records the Artifact-mastery discovery; then returns to `b9c_transition`.

### `b9c_transition` — The Second Option

**Lumii:**

1. “The Forge reveals the next reachable Artifact.”
2. “You can gather what it needs and Forge it as you did with Replication Spore.”
3. “Or you can isolate its path before another civilization reaches it.”

### `b10_encrypt_principle` — Encryption

**Lumii:**

1. “The second option is called Encryption.”
2. “It removes a path from the shared Forge and preserves it for you and you alone.”

**Player choices:**

1. “Let's try it.” → `b10_encrypt_pathway`
2. “So you're saying I can do this Encryption thing, but you can't? Why?” → `b10a_encrypt_origin`

### `b10a_encrypt_origin` — Why Lumii Cannot Encrypt

**Lumii:**

1. “I'm not entirely sure, but Encryption seems to involve something from your world crossing over to ours.”
2. “To a native of my Universe, it is akin to a violation of fundamental physics.”
3. “It would not be far off to consider it an act of divinity.”
4. “A genuine miracle.”

**Player:** “I understand. Show me.” → `b10_encrypt_pathway` (records Encryption-authority discovery)

### `b10_encrypt_pathway` — What Encryption Does

**Lumii:**

1. “Lichen Vein will leave the shared Forge and move behind Singularity.”
2. “Other civilizations cannot access it while Encrypted, and you can Forge it whenever you can cover its Affinity cost.”

### `b10_encrypt_capacity` — Encryption Capacity

**Lumii:**

1. “You may keep up to three paths Encrypted at once.”
2. “I am excited to see what you can do with it.”

### `b10_reserve` — Encrypt Lichen Vein

**Lumii:** “Select Lichen Vein, press Encrypt, then Confirm.”

**Required action:** Select Lichen Vein; press Encrypt; confirm.

**Wrong-action nudge:** “Encrypt the highlighted Artifact first.”

### `b10b_reserve_granted` — Singularity

**Lumii:**

1. “As a byproduct of performing Encryption, a mysterious power called Singularity is generated.”
2. “Singularity is not fully understood, but we do know that you can substitute it for any one of the five Affinities when you Forge.”
3. “Yet, I suspect that we haven't even begun to understand what this power is capable of.”

### `b11_forge_reserved` — Harness Two And Forge An Encrypted Artifact

**Lumii:**

1. “Now try the other Harness action: use ×2 on Abyss, then press Harness.”
2. “Open Singularity, select Lichen Vein, press Forge, then Confirm.”

**Required sequence:** Take two Abyss; Harness; open Singularity; select Lichen Vein; Forge; confirm.

**Wrong-action nudge:** “Use ×2 on Abyss, press Harness, then Forge Lichen Vein from Singularity.”

### `b11b_singularity_substitution` — Wild Affinity

**Lumii:** “You already held the 2 Abyss required by Lichen Vein, so Singularity substituted for its missing Radiance.”

## Chapter 4: Eminence And Luminaries

### `b14_win_condition` — Winning And Being Noticed

**Lumii:**

1. “Eminence measures a civilization's historical consequence, not its virtue.”
2. “When a civilization reaches 20 Eminence, their influence will be strong enough to dominate all others that share an Affinity field.”
3. “In other words, if your civilization still has the highest Eminence after the final round, you, Architect, will have won. 💪”
4. “As your civilization masters Artifacts, their permanent Affinities form a pattern.”
5. “When that pattern takes the right shape, someone beyond the horizon of your civilization's reach may notice.”
6. “We call them Luminaries.”
7. “I will move the clock forward so you can see what that might look like.”

### `b15_fast_forward` — Time Passes

**Lumii:** “A few centuries later...”

**Presentation:** Cinematic fast-forward.

### `b15b_luminary_signal` — Verdant Oracle Pattern

**Lumii:** “One more Verdance bonus will complete the Affinity pattern the Verdant Oracle can recognize.”

**Player:** “Let's Forge it.”

### `b16_final_forge` — Final Demonstration

**Lumii:**

1. “I'll supply 5 Continuum for this last demonstration.”
2. “Select Epoch Graft Ledger, press Forge, then Confirm.”

**Required action:** Select Epoch Graft Ledger; press Forge; confirm.

**Wrong-action nudge:** “Gather the Affinities for the final Artifact.”

### `b17_luminary` — Luminary Arrival

**Lumii:** “This is a projection of how the Verdant Oracle might answer a qualifying civilization.”

**Presentation:** Verdant Oracle arrival cinematic.

### `b18_victory` — Final Debrief

**Lumii:**

1. “A real Luminary chooses whether to answer and never belongs to an Architect.”
2. “The practice civilization's simulation ends here. Meeting me did not.”
3. “Your next match will follow a real civilization's history, with equal turns after someone reaches the Eminence goal.”
4. “I will remember what we see.”

**Required final action:** Complete First Contact

## Completion Screen

Before the final action, the screen identifies this as **Final lesson**. After the
explicit completion action, it displays **First Contact complete**.

**Result labels:**

- `[current Eminence] / 20 Eminence`
- `First Luminary answered`
- `+3 Eminence`
- `+1 Verdance — Drawn now`
- `+1 Verdance — Future Forge`
- `Core actions · Harness 3 · Harness 2 · Forge · Encrypt`
- `10 Lume granted` or `10 Lume ready to claim`

**Completion actions:**

- `Complete First Contact`
- `Establish Artifact Record` / `Save Progress` (guest only, after completion)
- `Play a Guided Match`
- `Return Home`
- `Leave for Now` (before completion)

**Artifact Record prompt:**

- Eyebrow: `Artifact Record`
- Title: `Keep what you discovered`
- Body: `Save First Contact and claim 10 Lume on this account.`

## Discovery Persistence

The optional Lumii-origin, Artifact-mastery, and Encryption-authority discoveries
remain attached to the completed First Contact record. They have no quiz or
separate reward; later events may recognize them directly.

## Compatibility-Only Beats

These records remain in runtime data so older saved tutorials can migrate, but
new tutorials do not route into them.

### `b3d_border_questions`

**Lumii:** “Perhaps I can help light your way?”

**Player choices:**

1. “Show me.” → `b4_shatter` (Resolute stance)
2. “No, thanks.” → `b3b_farewell`
3. “Umm... what even are you?” → `b3f_identity_fault` (Guarded stance)

### `b3e_beyond`

**Lumii:** “Perhaps I can help light your way?”

**Player choices:**

1. “Show me.” → `b4_shatter` (Curious stance)
2. “No, thanks.” → `b3b_farewell`
3. “Umm... what even are you?” → `b3f_identity_fault` (Guarded stance)

### `b3g_identity_repeat`

**Lumii:** “I already have. The boundary will only break it again.”

**Player:** “Then light the way.” → `b4_shatter` (Guarded stance)
