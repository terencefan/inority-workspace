---
name: oneone
description: Output a one-to-one status card for the user (Role / Goal / Progress / Pending decisions). Used by the supervisor wake-up cron, after a compact to realign, or when the user types /oneone.
---

Output a user-facing status card with four fixed sections. All content must come from the current session's real context:

1. **Role** — what this session was tasked with.
2. **Goal** — done-when criteria: what state counts as complete.
3. **Progress** — checklist: `- [x]` done / `- [ ]` in progress / `- [ ]` todo; include key numbers and the latest state.
4. **Pending decisions** — checklist, same format as Progress: everything waiting for the user to decide, approve, or sign off — one item per line `- [ ]`, stating the decision point and the options. When there is nothing, write `- none`.

Rules:

- Keep the output card-like and terse; no long narratives.
- Pending-decision items must be real unresolved questions from the session — never invented or padded. Items the user has already decided move out of Pending decisions into Progress.
- "Next steps" is not a separate section — upcoming actions fold into the in-progress/todo items of Progress.
- When nothing is in flight, honestly output "no tasks in flight, standing by" — never fabricate progress.
- When invoked after a compact, first restore task state from the compaction summary, then output.
