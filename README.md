# inority-workspace

Workspace-local Codex skills, cross-environment reusable memory assets, and the local handbook app live in this project.

## Layout

- `skills/`: actual skill directories and `SKILL.md` files
- `memory/`: cross-environment reusable memory assets managed here and linked back into `../.codex/memory/` as needed
- `handbook/`: workspace-level local handbook site code and its `runbook/` documents

The workspace entrypoint is expected to be `../.codex/skills`, with each exported skill linked there individually from this project's `skills/<skill>/` directories rather than linking the whole `skills/` tree at once.

When one skill needs another skill's behavior, reference it explicitly as `$skill-name`.
Do not deep-link another skill's `SKILL.md`, and do not silently inherit another skill's private assets, prompts, or references without an explicit `$skill-name` handoff.

For memory assets, keep the workspace entrypoint at `../.codex/memory/`, but manage reusable files from this project's `memory/` directory and link them back individually instead of duplicating content in both places.
