# LUMINAe Balance Migration Plan v0.1

## Current Authorization

The equal-turn frontier-exhaustion correction is implemented and rebaselined in
the current worktree. Release or deployment status remains a separate decision.
Keep every other candidate behind simulation or development-room configuration.

**No finalist is selected. Candidate migration is blocked.** The 1,000-game
matrix leaves every Artifact candidate outside at least one hard gate, and both
Blueprint slot configurations are rejected across the complete 18-cell
comparison. The current integrated bundle is discarded; it is not a migration
candidate.

The [nonexclusive Luminary 1,000-game report](balance-artifacts-v2-luminary-nonexclusive-1000.json)
passes completion, pacing, and first-to-last access in all nine cells. It is
not a finalist because near-ending Standard attainment is 87.0%, 90.2%, and
91.2% for 2/3/4 players, putting the 4-player cell above the 70–90% target,
and its strategy-policy screen fails. Its mixed-policy opener observations do
not certify parity.

The [exact-semantics Focus 1,000-game report](balance-artifacts-v2-focus-choice-1000.json)
matches the regenerated aggregate file's current Focus semantics. Explicit Focus choice materially
raises aggregate Encrypt conversion to 19.51–39.07%, but every 3-player format
still completes only 993 of 1,000 games because the full-hand/full-reserve/
empty-natural-Well deadlock remains. The current Focus rule is rejected and is
not a migration candidate.

## Candidate Isolation

- `BalanceRuleset` is not part of public room creation, account state, campaign
  state, generated API clients, or database schemas.
- The dedicated development launcher creates the room, players, and game state
  in process memory. Its state, actions, AI turns, and WebSocket membership use
  the same in-memory lifecycle and create no room, player, or game-state rows.
- Development-room selection lives in that memory store and disappears on API
  restart; a stale laboratory URL fails closed and must be relaunched.
- Experimental runtime markers are absent from ordinary games and must be
  removed from player-facing state projections.
- Existing rooms and rematches default to corrected control behavior.

## Rules-Version Boundary

Rooms do not currently persist an immutable balance-rules version. Consequently,
existing rooms may inherit the equal-turn exhaustion bugfix, and the plan cannot
truthfully promise that every active or historical room remains on a recorded
rules contract.

Before any experimental candidate is promoted:

1. add an immutable, additive `rulesetVersion` to newly created rooms and saved
   state;
2. define a documented compatibility fallback for legacy rooms without the
   field;
3. ensure rematches explicitly inherit or select the intended version; and
4. preserve historical reads without fabricating a version for old matches.

The exhaustion correction may remain a universal bugfix. A redesign candidate
must use the version boundary.

## Promotion Blockers

- no Artifact candidate passes every 1,000-game hard gate;
- nonexclusive Luminary contact solves the access screen but exceeds the
  Standard near-ending development-arc gate in the 4-player cell;
- exact-semantics Focus improves commitment but fails completion because its
  3-player circulation deadlock remains;
- no candidate has received 5,000-game finalist certification;
- corrected-baseline creator testing is at 0 of 6 sessions;
- no paired finalist creator comparison exists;
- no selected integrated ruleset exists; and
- the authoritative Blueprint comparison rejects both one- and two-slot
  competitive configurations in every player-count/format cell.

Clear each applicable blocker with linked evidence before starting production
migration work.

## Promotion Procedure

After one integrated candidate passes certification and creator comparison:

1. freeze its exact rule contract and report seed;
2. run server, client, Blueprint, tutorial, campaign, rematch, and migration
   regression suites;
3. define any required public types additively and preserve reads for legacy
   saved states;
4. feature-flag the candidate for new rooms only;
5. leave versioned active and historical rooms on their immutable rules version
   and apply the documented fallback to legacy unversioned rooms;
6. complete production-browser QA for setup, a full standard match, one loss,
   one rematch, and implemented campaign scenarios;
7. publish the final evidence report and rejected-alternative rationale before
   changing defaults.

No Artifact catalog conversion, account backfill, or native-app repackaging is
authorized by the audit itself.

Until the blockers clear, this document is a migration procedure, not an
authorization to ship an experimental ruleset.
