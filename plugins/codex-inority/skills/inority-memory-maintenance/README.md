# inority-memory-maintenance

`inority-memory-maintenance` is a maintenance skill bundled inside the `codex-inority` plugin.

The plugin hook automatically discovers and injects `.codex/memory/`. This skill is used only when that runtime needs to be installed, repaired, audited, or reorganized.

## Responsibilities

- link `SOUL.md` and `USER.md` to their maintained source files
- seed other missing runtime files from `templates/`
- preserve existing workspace-local memory
- check required files, legacy entrypoints, and memory boundaries
- route durable content to the correct existing home

It does not own automatic prompt injection, reply formatting, reflection, dairy distillation, or domain workflows.

## Memory Contract

| File | Responsibility |
| --- | --- |
| `SOUL.md` | agent operating style |
| `USER.md` | user profile and personal preferences |
| `WORKSPACE.md` | ASCII project navigation and team-wide preferences |
| domain skill | workflow, tool, cluster, and implementation rules |

## Commands

```bash
node scripts/install.mjs --workspace-root /path/to/workspace --source-memory-dir /path/to/source-memory
node scripts/check-workspace.mjs --workspace-root /path/to/workspace --source-memory-dir /path/to/source-memory
node scripts/uninstall.mjs --workspace-root /path/to/workspace
```

Without `--workspace-root`, scripts target `CODEX_WORKSPACE_ROOT` when set, otherwise the current working directory.
