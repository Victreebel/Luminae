# LUMINAe Implemented Campaign Balance Audit v1.0

## Scope And Verdict

This audit covers only gameplay that can be proven runnable in the current
application:

1. the **Architect Record qualifying match**, a standard 4-player Quick match
   against three Hard AI civilizations; and
2. the **Lumii Blueprint clearance challenge**, the authored 1v1 Defense
   Forecast identified by `blueprint_clearance_lumii`.

No other production route creates a campaign room or a distinct scenario ID.
The First Charge and later Chronicles are presentation or design records, not
playable scenarios, and receive no balance verdict here.

The qualifying match's wiring is stable enough to remain observable as a
legacy control, but its balance and progression suitability are not certified.
It is a poor story-progression structure: five victories are required, defeat
creates no campaign progress, and the gate tests the 15-Eminence Quick game
rather than the proposed 20-Eminence Standard target.

The Defense Forecast is a real authored encounter with sound retry and
withdrawal plumbing. It is **not balance-certified**. Lumii receives three
Blueprints, five starting Affinities, three secured components, and a curated
Forge path; no deterministic scenario matrix or creator result log establishes
whether that advantage produces the intended pressure, whether both racing and
denial remain viable, or whether first-player randomness is acceptable.

## Evidence Levels

- **Confirmed:** enforced directly by runtime code and/or a passing targeted
  test.
- **Strong inference:** follows from confirmed rules or an existing symmetric
  simulation, but is not direct human or scenario telemetry.
- **Unknown:** requires a dedicated scenario simulation or creator session.

Targeted verification completed for this audit:

- API server: 33 tests passed across Blueprint clearance decisions, Architect
  Record status, Archive derivation, and state projection.
- Web client: 32 tests passed across the Vault surface, Lumii outcome encounter,
  threshold reconciliation, and Architect Record continuity.
- Blueprint/engine focus: 22 Blueprint-, Antimatter-, Foundry-, Ascension-,
  clearance-, withdrawal-, or scenario-matched tests passed.

These tests establish rule wiring and presentation reachability. They are not a
substitute for encounter balance runs.

## Surface 1: Architect Record Qualifying Match

### Implemented Rules

| Property | Current behavior | Evidence |
|---|---|---|
| Format | 4 civilizations, 15 Eminence, no timer, standard rules, Blueprints disabled | Confirmed |
| Opposition | Exactly three Hard AI civilizations | Confirmed |
| Turn fairness | Random opener with ordinary turn-order Eminence compensation | Confirmed |
| Qualification | Only a human victory under those exact final settings counts | Confirmed; rejection cases tested |
| Progress | One permanent signal per qualifying victory, capped at five | Confirmed |
| Defeat | Ordinary loss record; no Architect Record progress or authored consequence | Confirmed |
| Resume | The launch action resumes an active room matching the room settings | Confirmed |

### Objective Success

The one-click launcher creates the exact settings checked by the qualification
validator, so a newly created room cannot silently miss the objective because
of player count, AI difficulty, timer, mode, target, or Blueprint policy.

There is one integrity gap: resumability checks the room settings but does not
re-check the identities or difficulties of the other three participants. An
unrelated active 4-player/15/no-timer standard room can therefore be resumed by
the campaign button even when its final result cannot qualify. This is a
moderate UX risk, not evidence that completed qualification is miscounted; the
final validator remains strict.

### Fail-Forward Behavior

This surface does not fail forward. Wins advance the Record; losses only add to
ordinary account statistics. No defeat flag, alternate consequence, partial
mastery, preparedness result, or campaign branch is stored. Retrying is
available, but retry availability is not the same as fail-forward progression.

The corrected 5,000-game adaptive-bot control gives opener-relative 4-player
Quick win rates of `24.56% / 26.00% / 25.44% / 24.00%`. If a creator
performed like one symmetric Hard AI, a five-win gate would require 20 matches
on average. Under that model, only 7.8% of runs finish within 10 matches and
58.5% within 20. This is a **strong inference**, not a human completion-rate
estimate, but it demonstrates the amount of repetition embedded in the gate.

### Approach Viability And AI Pressure

The three opponents use the same default Hard policy. The match supports all
ordinary strategies, but it does not deliberately test different pressure
styles such as specialization, denial, Luminary pursuit, or comeback play.
Consequently, repeated attempts risk teaching one AI pattern rather than
demonstrating broad mastery.

The symmetric automated control is within the four-point seat gate at Quick,
but no evidence establishes creator win rate, attempt count, teach friction, or
fatigue against three Hard AIs. Those remain unknown.

### Distortion Versus Core

The action rules are the production core. Distortion comes from progression,
not turn mechanics:

- Quick is mandatory even though Standard is the primary audit target.
- Player count, opponent count, AI difficulty, timer, and Blueprint policy are
  fixed.
- Five similar victories are treated as story access rather than five
  independent comparative matches.

This surface should be re-evaluated only after the winning core rules are
selected. It should not be used as evidence that the future Chronicle structure
is balanced.

## Surface 2: Lumii Blueprint Clearance Challenge

### Implemented Rules

| Property | Current behavior | Evidence |
|---|---|---|
| Match | 1v1 campaign room, 15 Eminence, no timer, epic presentation | Confirmed |
| Human | Ordinary production actions, account civilization identity, no assigned Blueprint | Confirmed |
| Lumii | Hard AI with Antimatter Detonator, Mantle-to-Orbit Foundry, and Ascension Registry | Confirmed |
| Starting advantage | Five natural Affinities and three secured Tier I Antimatter components | Confirmed |
| Curated frontier | Four fixed Tier I components, two queued Tier I components, and the fixed Tier II Antimatter component | Confirmed |
| AI policy | Blueprint-component prioritization; Encrypt disabled for Lumii | Confirmed |
| Opening order | Random first player; ordinary turn-order Eminence compensation is not requested | Confirmed |
| End condition | Standard 15-Eminence comparison; no separate Domain or scenario objective | Confirmed |
| Victory | Vault cleared; Antimatter Detonator unlocked and placed in Campaign/Custom loadouts | Confirmed |
| Defeat | Normal account loss; earned threshold state is returned to `challenge_ready` | Confirmed |
| Withdrawal | No game rollup, win, or loss; earned clearance remains available | Confirmed |

### Objective Success

The HUD presents comparative score and boss pressure consistent with a race to
defeat Lumii before Lumii reaches 15 Eminence. Whether a first-time creator
understands that objective without explanation has not been verified in a
browser session or creator playtest. Project manifestation creates boss
pressure, but it is not a declared independent objective. Preventing
Antimatter, Foundry, or Registry from manifesting matters only insofar as it
helps win the same Eminence race.

The scenario structurally permits at least two approaches:

- **race:** build the player's own economy and reach 15 first; and
- **deny:** Forge Lumii's visible Project components before Lumii can assemble
  them, while using those Artifacts in the player's own economy.

Whether both are competitive is unknown. The Forge is only partially curated,
the remaining catalog and Luminaries are random, and no scenario report records
win rate, Project manifestation, effect frequency, lead changes, or strategy
outcomes.

### Fail-Forward Behavior

The earned-access route has good retry safety but not full narrative
fail-forward:

- defeat preserves the five qualifying wins, threshold approach, dialogue,
  Cipher state, and rupture memory, then allows another challenge;
- withdrawal ends the room without a win/loss rollup and preserves earned
  access; and
- concurrency and reconnect paths resume the active room rather than creating
  duplicate challenges.

Defeat does not clear the Vault, unlock a different continuation, or store a
distinct authored outcome. It is therefore a retry loop rather than a
fail-forward Chronicle outcome.

The legacy Decryption Key bypass is more punitive: losing or withdrawing its
single attempt removes the bypass and resets encounter memory when the account
has not earned the normal gate. That behavior should remain outside any future
campaign-balance conclusion because the approved concordance program already
places the purchasable bypass on the removal/redesign list.

### Threshold Approach Viability

Kinship, Inquiry, and Dominion are all reachable, persist one response at a
time, support authored optional branches, and can launch the challenge. The
targeted path tests cover every authored branch and idempotent retry.

They are not distinct gameplay approaches. In the engine, the presence of any
threshold approach enables the same Lumii Blueprint heuristics and the same
Antimatter target-selection policy. The selected value changes dialogue,
commentary, and outcome presentation but not setup, resources, AI strength,
victory conditions, or available actions. This is acceptable if the choice is
intended to express relationship stance; it does not support a claim that all
three routes offer mechanically distinct viable strategies.

### AI Pressure

Lumii's pressure is intentionally front-loaded:

- three of four Antimatter components begin secured;
- the fourth is forced into the Tier II frontier;
- all three Foundry components begin face-up;
- all Registry components begin face-up or near the top of the Tier I Archive;
- Hard AI explicitly values missing Blueprint components; and
- after Foundry manifests, the AI prioritizes its discounted Tier II Forge
  action.

The pressure is authored rather than accidental, but its magnitude is
uncertified. The ordinary Blueprint simulation cannot answer this question: it
uses symmetric assignments and uncurated starts, whereas this encounter gives
one side three Projects and a large tempo advantage. The authoritative
1,000-game-per-cell comparison across all player counts and formats rejects
both two-slot and one-slot symmetric Blueprint configurations, but that result
neither certifies nor directly condemns this authored asymmetric encounter.

First-player sensitivity is also unknown. The opener is random, and the
scenario does not request the production compensation normally used for the
second actor. A 2-player control without compensation previously showed an
opener advantage, but that symmetric result cannot quantify this asymmetric
boss encounter.

### Distortion Versus Core

The encounter preserves the core action grammar but intentionally changes the
starting state and information structure:

- Lumii has **three** private Blueprint slots while ordinary accounts have two.
- The player receives no Blueprint in the scenario.
- Lumii receives five free Affinities and three reserved Artifacts.
- Ten component locations are curated across secured cards, visible rows, and
  near-term draws.
- Lumii cannot Encrypt, while the human still can.
- The scenario uses Quick's 15-Eminence end condition despite its boss framing.
- The random public remainder and Luminary pool still introduce meaningful
  seed variance.

One confirmed presentation/rules contradiction should be resolved before
balance testing. The pre-match briefing warns that Tier I collateral
Annihilation is possible and the global scenario is labeled Broken Covenant,
but the setup explicitly records Lumii's Covenant state as `intact`. Antimatter
collateral only executes when the **device owner's** Covenant state is
`broken`; Lumii's device therefore cannot produce the warned collateral under
this setup. This is not a numerical tuning issue: either the warning/setup or
the ownership doctrine is wrong.

### Concordance Boundary

Two additional discrepancies are legacy-runtime facts, not balance verdicts:

- production still gates the Threshold through five qualifying victories,
  while the settled Story Framework and Concordance Ledger unlock it after the
  three opening Chronicles have primary outcomes regardless of victory; and
- production labels the Threshold encounter Broken Covenant, while the settled
  doctrine says the Architect–Lumii Threshold rupture does not itself break the
  Covenant.

See `LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md` and
`LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md`. This audit records the contradiction
without treating a lore migration as an authorized balance change.

## Decision Table

| Question | Current answer | Confidence |
|---|---|---|
| Does a qualifying win count reliably? | Yes, for newly created matches; the final validator is exact | High |
| Does qualifying defeat advance story? | No | High |
| Is the five-win gate appropriately paced? | Likely too repetitive; creator evidence required | Medium-high |
| Is the Defense Forecast retry-safe? | Yes for earned access; withdrawal is non-recorded | High |
| Does Defense Forecast defeat fail forward? | No; it permits retry but does not create a continuing outcome | High |
| Are all three threshold routes playable? | Yes | High |
| Are they mechanically distinct? | No | High |
| Are race and component denial both viable? | Structurally possible, not measured | Low |
| Is Lumii's advantage fair and satisfying? | Unknown | Low |
| Is the scenario representative of core Blueprint balance? | No; it is a deliberate asymmetric exception | High |

## Required Next Evidence

No production campaign rule should be changed from this audit alone. After the
core finalist is chosen:

1. Extract the Defense Forecast setup into a pure, seedable scenario fixture
   usable by the authoritative balance harness.
2. Run player-first and Lumii-first matrices for all three threshold stances,
   recording completion, turns, winner, lead changes, each Project's
   manifestation/effect rate, Antimatter target resolution, and race-versus-
   denial behavior.
3. Establish an intended creator win band before tuning Lumii's resources,
   secured cards, or Project count. A boss scenario need not be 50/50, but its
   target must be explicit.
4. Run six creator baseline attempts and log first-attempt result, clarity,
   pressure, strategy used, memorable reversals, ending satisfaction, and
   willingness to retry.
5. Resolve the collateral-warning/Covenant-state contradiction before those
   sessions so testers are evaluating the implemented threat.
6. Reassess whether the Architect Record remains a legacy clearance challenge
   or is replaced by authored fail-forward Chronicles. Do not treat five Quick
   victories as proof of Standard mastery.

Until those steps are complete, the confidence-ranked disposition is:

- **Qualifying match:** retain as a legacy comparison surface during the audit;
  redesign before using it as principal story progression.
- **Defense Forecast:** retain as an authored prototype, do not tune or certify
  from generic Blueprint simulations.
- **Future Chronicles:** no balance verdict.
