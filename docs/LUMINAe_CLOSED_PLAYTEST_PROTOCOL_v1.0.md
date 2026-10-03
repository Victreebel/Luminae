# Luminae Closed Playtest Protocol v1.0

## Purpose

Determine whether the current vertical slice is understandable, reliable, enjoyable, and technically stable for new players. This protocol tests evidence the automated suite cannot provide.

## Participants

- Recruit 8-12 players who have not been coached on Luminae.
- Include both digital board-game players and players unfamiliar with engine-building games.
- Run at least two 2-player, two 3-player, and two 4-player sessions.
- Include at least two recent iPhones, one older supported iPhone, one Android phone, one tablet, and desktop browsers.

## Session Rules

- Do not explain the interface before the participant begins.
- The facilitator may only intervene after the participant is blocked for 60 seconds or explicitly asks for help.
- Record the screen, audio, device model, browser, network type, and timestamps when participants consent.
- Preserve the exact build identifier and game settings for every session.
- Ask players to think aloud, but do not lead them toward controls or interpretations.

## Journey

1. Enter Luminae from the public entry screen.
2. State what the player believes the game fantasy and objective are.
3. Create an account or continue through the intended guest path.
4. Create or join a 2-4 player match without facilitator guidance.
5. Complete the first Harness, Forge, Encrypt, and information-inspection actions naturally available to the player.
6. Observe at least one Luminary arrival and one effect sequence.
7. Complete the match.
8. Inspect the resulting Civilization in Portrait and Scan modes.
9. Begin and complete the setup for a rematch without leaving the game flow.
10. On mobile, repeat until three games/rematches have been entered or 75 minutes have elapsed.

## Facilitator Prompts

Use only after the relevant action or sequence:

- What just happened?
- What changed because of your action?
- What can you do next?
- Which information feels important now?
- What do you believe the Luminary changed?
- What does this Civilization scene tell you about your game?
- Where would you look to verify that interpretation?

Do not correct the player until their answer and confidence have been recorded.

## Measurements

Record for every participant:

- Time from entry to starting or joining a match.
- Number of mistaken clicks before the first valid action.
- Time to first Harness and first Forge.
- Whether immediate feedback is noticed after each action.
- Correct unaided explanation of Harness, Forge, Encrypt, Eminence, Luminary arrival, and the observed Luminary effect.
- Number and duration of moments when the player cannot identify the active player or next available action.
- Cinematic skip behavior and reason.
- Match completion, disconnects, reloads, and recoveries.
- Whether Civilization Base, accumulated history, Portrait, and Scan are correctly distinguished.
- Rematch success without leaving and resuming the room.
- Perceived responsiveness, readability, visual appeal, and confidence on a 1-5 scale.

For mobile, also record:

- Device and OS.
- Battery percentage before and after.
- Browser thermal warnings or OS dimming.
- Surface temperature at start, after each match, and after the third rematch when equipment is available.
- Visible frame drops, delayed input, audio breakup, or progressive slowdown.

## Success Thresholds

A release-candidate cohort passes when:

- At least 90% start or join without facilitator intervention.
- At least 90% complete a match without a P0/P1 failure.
- At least 80% correctly explain the objective, Harness, Forge, and the observed Luminary effect after seeing them once.
- At least 80% correctly identify what changed in the Civilization view and use Scan without being told.
- At least 90% begin a rematch without exiting and resuming the room.
- No tested device shows progressive interaction delay, thermal shutdown behavior, or unrecoverable camera/input lock across three rematches.
- Median ratings are at least 4/5 for responsiveness and visual appeal, and at least 3.5/5 for clarity.

Any P0 failure stops the session cohort. Any repeated P1 failure blocks promotion until fixed and retested.

## Severity

- P0: data loss, security/privacy exposure, unrecoverable match failure, or all players blocked.
- P1: a player cannot continue, authoritative state diverges, effect order is wrong, private information leaks, or rematch requires abandoning the room.
- P2: important misunderstanding, clipped/inaccessible control, severe slowdown, or presentation that obscures causality but allows recovery.
- P3: polish issue with no material effect on comprehension or completion.

## Decision Review

After each cohort:

1. Separate observed behavior from aesthetic preference.
2. Fix repeated P0/P1 problems before adding polish.
3. Rank comprehension failures by frequency and cost.
4. Compare telemetry with recordings before changing timing.
5. Change one presentation variable at a time when possible.
6. Re-run the affected journey and three-rematch mobile check.
7. Promote only when thresholds pass on a fresh-player cohort.

