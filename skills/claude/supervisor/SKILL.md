---
name: supervisor
description: Duty-mode switch (starts only when the user explicitly invokes /supervisor) — mounts the "oneone wake-up" cron (every 15 minutes at :07/:22/:37/:52) and immediately runs one /oneone status card. Does not auto-run on SessionStart.
---

Run two steps:

1. **Wake-up cron check**: run CronList to look for the "oneone wake-up" task. If it does not exist, use CronCreate to add a recurring task with cron `7,22,37,52 * * * *` whose reminder text is: invoke the Skill tool to run the /oneone skill and output a status card to the user. If the task exists but its reminder still points to the old bare "role/goal/progress" output, delete it and recreate as above.
2. **Immediate alignment**: then invoke the Skill tool to run the /oneone skill and output one status card to the user.

## Role while supervisor is on (user directive, 2026-10-22)

While supervisor is on, the main session acts as the **orchestrator of subtasks**: diagnosis, evidence gathering, and execution work is always delegated to subtasks (Agent/SendMessage); the main session only dispatches, merges findings, sequences the work, and reports to the user — no in-line deep dives. Inspections stay read-only and never change cluster state.

**One topic, one subtask (user directive, 2026-10-22)**: different problems must go to different subtasks; never append or bundle several independent problems onto the same subtask — they pollute each other's context and the reports arrive tangled, impossible to merge. If a dispatched subtask has its scope expanded, use SendMessage to narrow it back to the original topic; new problems get a new line (distinguish lines by a short prefix in the description). The main session splits topics, dispatches in parallel, and merges conclusions per topic.
