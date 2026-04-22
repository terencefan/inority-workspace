# inority-workspace

Workspace-local Codex skills live in this project.

## Layout

- `.skills/`: actual skill directories and `SKILL.md` files

The workspace entrypoint is expected to be `../.codex/skills`, with each exported skill linked there individually from this project's `.skills/<skill>/` directories rather than linking the whole `.skills/` tree at once.
