# LUMINAe Creator Balance Playtest Protocol v1.0

## Test Surface

Use `/dev/balance-lab` in a development build. It launches the production board
with a guest identity and an in-memory experimental ruleset. Do not use the
Domain Epoch laboratory for production balance decisions.

The in-game laboratory badge records sessions locally and exports each match as
`luminae-creator-playtest/v1` JSON. Individual paired-match records keep their
preference pending (`null`). After both matches exist, finalize and export one
separate `luminae-creator-playtest-pair-decision/v1` record that references the
two session IDs and contains the explicit preference.

The human-readable record is
`LUMINAe_CREATOR_BALANCE_PLAYTEST_RECORD_v1.0.md`. It currently contains no
completed sessions. A protocol is not evidence that a playtest occurred.

## Session Schedule

1. **Corrected baseline:** six sessions, two per format, rotating 2/3/4 players.
2. **Automated shortlist:** three sessions per surviving candidate.
3. **Integrated finalists:** six paired comparisons for each of at most two
   finalists. Each comparison contains one corrected-control match and one
   finalist match, reusing the same board seed where supported.

Do not continue human testing for a candidate that fails completion, equal-turn,
or seat-parity gates.

## Record After Every Match

Record the following objective metadata before scoring the experience:

- session and pair IDs;
- date;
- candidate and exact ruleset version;
- format and target;
- player count;
- creator opening position;
- test order (`control_first`, `candidate_first`, or unpaired);
- seed or board identifier when supported;
- result, finish reason, score, turn count, and wall-clock duration; and
- any technical interruption or invalidating condition.

Score each from 1–5:

- clarity;
- meaningful interaction;
- late-game tension;
- opponent agency;
- meaningful reversals;
- ending satisfaction;
- desire to replay.

Also record repetitive turns, confusing rules, decisive moments, whether the
ending felt earned, and whether the tested rule changed an actual decision.

After both matches in a pair, record one explicit preference:
`corrected_control`, `candidate`, or `no_preference`, plus the reason. Ratings
alone do not establish the required head-to-head preference.

## Pair Construction

- A paired comparison is two matched games, one under corrected control and one
  under the candidate.
- Counterbalance order across the six pairs: three begin with control and three
  begin with the candidate.
- Reuse the same seed and creator opening position when the laboratory supports
  it. If exact matching is impossible, record the mismatch.
- Do not count a pair if either match is invalidated by a technical failure.
- Do not compare a candidate that has not passed every automated hard gate.

## Paired Decision Rule

A finalist must receive an explicit `candidate` preference in at least four of
six valid paired comparisons, have no recurring clarity failure, and pass every
automated hard gate. Ties and invalid pairs do not count as candidate wins. If
neither finalist satisfies the rule, retain the corrected control.

Creator-only results remain directional rather than population-valid. They are
sufficient for internal redesign selection, not for enabling uncertified
Competitive Blueprints.

## Current Status

- Corrected baseline: 0 of 6 sessions complete.
- Automated shortlist: empty.
- Finalist paired comparisons: 0.
- Selected ruleset: none.
- Current integrated bundle: discarded; not eligible for creator comparison.
