# Lumiane Agent Notes

## Operating Style

- Keep edits small and scoped. Solve one concrete problem at a time.
- Prefer targeted verification first. Run the full build only when the change has real compile or integration risk.
- Do not repackage the native app unless the user explicitly asks.
- For visual and animation work, first state the exact behavior being changed and the expected visible outcome.
- Avoid speculative redesign loops. If an approach looks high effort, brittle, or unlikely to produce the requested visual result, say so early and suggest shelving or narrowing it.
- Preserve user and preexisting worktree changes. Do not revert unrelated dirty files.

## Dialogue Authorship

- Follow `docs/LUMINAe_DIALOGUE_AUTHORSHIP_CONTRACT_v1.0.md` for tutorial,
  Chronicle, Vault, Lumii, and player-response copy.
- Treat user-written and explicitly approved dialogue as immutable. Do not
  revise it for clarity, tone, brevity, market readiness, consistency, or lore
  polish without an explicit request to change that wording.
- Layout, animation, mechanics, accessibility, bug-fix, and flow approval never
  grants permission to rewrite dialogue.
- New connective copy remains `draft` until the user approves it. Prefer
  presenting exchange-level intent and only the affected draft lines for
  review, rather than rewriting an entire scene.
- Do not update dialogue locks or their regression expectations merely to make
  a copy-protection test pass. A lock changes only when the user explicitly
  changes or unlocks that copy.
