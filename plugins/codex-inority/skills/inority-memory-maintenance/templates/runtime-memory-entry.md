# memory/MEMORY.md

`.codex/memory/` stores workspace memory loaded by the `codex-inority` plugin.

Before using memory content, tell the user which memory files are being loaded.

## Files

- `SOUL.md`: agent operating style
- `USER.md`: user profile and personal preferences
- `WORKSPACE.md`: ASCII project navigation and team-wide workspace preferences
- `credential.md`: local credential index without secret values
- `credential.d/*.yaml`: categorized local secret fragments; never load automatically
- `dairy/YYYY-MM-DD.md`: time-scoped notes

## Loading

- Load only the files relevant to the current task.
- Load a project `AGENTS.md` and project memory only when working in that project.
- Read `credential.md` only when credentials are required, then load the minimum matching fragment.

## Placement

- agent operating style -> `SOUL.md`
- personal profile or preference -> `USER.md`
- team-wide workspace preference or project navigation -> `WORKSPACE.md`
- workflow, tool, cluster, or domain rule -> the corresponding skill
- temporary finding -> `dairy/YYYY-MM-DD.md`

Do not duplicate skill rules in memory. Memory installation, repair, and audit are maintained by the plugin-internal `inority-memory-maintenance` skill at `inority-workspace/plugins/codex-inority/skills/inority-memory-maintenance/`.
