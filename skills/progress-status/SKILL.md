---
name: progress-status
description: Format progress reports for ongoing plans, deployments, migrations, runbooks, and long-running work. Use whenever the user asks for current progress, status, where work stands, what is complete, what is running now, or what remains.
---

# Progress Status

Report the current state using checkboxes, bullet points, statistics, and a compact text progress bar.

## Required format

Lead with a one-line numerical summary and progress bar, for example:

`Progress: 4/7 steps complete (57%)  [██████░░░░]`

Then provide these sections in order:

- `Completed` with `- [x]` items and concrete evidence or key statistics.
- `In progress` with `- [ ]` items, current state, counts, and any active gate.
- `Next` with `- [ ]` items in execution order.
- `Risks or blockers` only when non-empty.

Use measured values from authoritative current state. Distinguish `STARTING`, `READY`, `FAILED`, and unknown states. Never count an in-progress step as completed. Keep operational status concise while including important invariants such as protected jobs, replica counts, routes, and output versions.

For a multi-stage plan, compute the percentage as completed steps divided by total steps. If step sizes differ materially, label it `plan steps` so it is not mistaken for elapsed time or workload percentage.
