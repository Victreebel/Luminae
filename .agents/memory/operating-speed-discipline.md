---
name: Operating speed discipline
description: User preference for smaller, faster, less speculative implementation loops across Lumiane chats.
---

## The rule

Keep work loops tight: small scoped edits, targeted verification first, and no native repackaging unless the user explicitly asks.

For visual or animation requests, state the observed problem and expected visible change before editing. If the fix looks high effort, brittle, or unlikely to move the visible result, say so early instead of burning time on speculative iterations.

## How to apply

- Change one concrete thing at a time.
- Prefer grep/diff/syntax checks before full builds.
- Run full builds when there is compile or integration risk, not by reflex.
- Do not repackage the Mac/native app unless requested.
- Preserve unrelated dirty worktree changes.
