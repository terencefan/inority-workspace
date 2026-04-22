# inority-workspace

Workspace-local Codex skills and the local handbook app live in this project.

## Layout

- `.skills/`: actual skill directories and `SKILL.md` files
- `handbook/`: workspace-level local handbook site code and its `runbook/` documents

The workspace entrypoint is expected to be `../.codex/skills`, with each exported skill linked there individually from this project's `.skills/<skill>/` directories rather than linking the whole `.skills/` tree at once.
