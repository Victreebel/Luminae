# LUMINAe Dialogue Authorship Contract v1.0

## Status And Authority

**Authoritative copy-governance contract.** This document controls how authored
dialogue, player responses, and narrative guidance may be changed. It does not
supersede the Lore Bible on canon, the Story Mode Framework on narrative
function, or the Onboarding Doctrine on disclosure and teaching order.

The project owner's direct wording and approvals outrank all inferred style goals.
"Natural," "clear," "market-ready," and similar goals are constraints, not
permission to replace authored language.

## Decision Hierarchy

When goals compete, decide in this order:

1. Preserve user-written or explicitly approved wording.
2. Preserve character voice and conversational cause and effect.
3. Preserve canon, disclosure order, and mystery.
4. Teach the mechanic relevant to the immediate action.
5. Improve clarity or pacing inside draft copy only.
6. Apply an implementer's stylistic preference only when none of the above
   decides the issue.

## Voice Contract

Lumii is concise, intelligent, witty, and slightly strange. She is a person in
the conversation, not a tutorial narrator wearing a character name.

- Let a joke, concession, unsettling fact, or sharp answer stand on its own.
- Do not append an explanation that restates the implication.
- Answer the question the player actually asked.
- Use omission, implication, or intelligible interference for mystery.
- Do not turn natural dialogue into a lore checklist.
- Prefer one clear sentence to a stack of abstract qualifications.

Player responses should sound like reactions a person might have at that exact
moment. The first option advances cleanly. Alternate options may question,
resist, joke, or investigate. A choice must receive an immediate response or
record a later effect; cosmetic branching without acknowledgement is not
enough.

## Copy States

Every tutorial line, player response, and choice has one of three states:

- `locked`: the player supplied or directly dictated the wording. Preserve it
  exactly until the player explicitly changes or unlocks it.
- `approved`: the player accepted the current wording. It is equally protected
  from unsolicited revision, while retaining its distinct provenance.
- `draft`: the wording has not been accepted. It may be proposed for review,
  but broad engineering approval does not silently promote it or authorize it
  to replace locked or approved copy.

Unlisted runtime copy defaults to `draft`. The typed ledger lives in
`artifacts/luminae/src/lib/tutorialDialogueGovernance.ts`. Its regression test
is a copy-protection boundary, not a snapshot to refresh during refactoring.

## Permission Boundaries

These requests do **not** authorize dialogue changes unless dialogue is named:

- fix a bug;
- update layout or camera behavior;
- improve mobile presentation;
- change animation or audio;
- gate an interaction;
- align the tutorial with production UI;
- optimize clarity or market readiness as part of a broader engineering task.

When a technical change needs connective language, add the minimum draft copy
and call it out. Never rewrite neighboring approved dialogue to make the new
line blend in.

## Efficient Review

Dialogue review happens at three useful scopes:

1. **Voice rule:** a durable global correction, such as "Lumii does not explain
   her jokes." Add it here and audit all draft copy against it.
2. **Exchange intent:** approve what a whole exchange must accomplish before
   drafting lines. Review only that exchange, not the full script.
3. **Exact lock:** preserve a supplied line or selected final draft verbatim in
   the typed ledger.

The project owner may use ordinary language; no command syntax is required. Short
labels such as `VOICE`, `INTENT`, `LOCK`, `UNLOCK`, `DRAFT`, or `TECH ONLY` are
available when convenient. `TECH ONLY` means no narrative wording changes.

For each dialogue update, present:

- the exchange's current purpose;
- only the lines that would change;
- any canon or flow consequence;
- which resulting text will become locked or approved.

Do not present untouched script for re-review unless asked.

## Source Order

Use sources in this order:

1. direct player wording and approvals;
2. this authorship contract and its typed lock ledger;
3. `LUMINAe_LORE_BIBLE_v1.0.md` for ontology and canon;
4. `LUMINAe_STORY_MODE_FRAMEWORK_v1.0.md` for narrative function;
5. `LUMINAe_PLAYER_FANTASY_AND_ONBOARDING_DOCTRINE_v1.0.md` for disclosure and
   teaching order;
6. `LUMINAe_LORE_CONCORDANCE_LEDGER_v1.0.md` for reconciliations;
7. runtime dialogue, which is implementation evidence rather than canon.

## Change Checklist

Before editing narrative copy:

1. Identify whether the target is locked, approved, or draft.
2. State the exchange-level intent and the exact affected lines.
3. Verify the change answers the player's request rather than an inferred
   preference.
4. Check canon and disclosure without adding explanatory afterthoughts.
5. Update the ledger only when approval is explicit.
6. Run dialogue-governance and tutorial-flow tests separately.

If a protected-copy test fails during non-dialogue work, restore the protected
copy. Do not alter the test or ledger to accommodate the accidental rewrite.
