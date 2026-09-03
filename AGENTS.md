# Lumiane Agent Notes

## Operating Style

- Keep edits small and scoped. Solve one concrete problem at a time.
- Prefer targeted verification first. Run the full build only when the change has real compile or integration risk.
- Do not repackage the native app unless the user explicitly asks.
- For visual and animation work, first state the exact behavior being changed and the expected visible outcome.
- Avoid speculative redesign loops. If an approach looks high effort, brittle, or unlikely to produce the requested visual result, say so early and suggest shelving or narrowing it.
- Preserve user and preexisting worktree changes. Do not revert unrelated dirty files.
- After changing tutorial copy, behavior, layout, or animation, complete the production tutorial from first contact through the victory screen in a browser. Reducer or isolated-beat tests are not sufficient on their own.
