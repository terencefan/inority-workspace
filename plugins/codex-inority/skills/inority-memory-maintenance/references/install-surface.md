# Inority Memory Install Surface

Central install surface for the inority-style workspace `.codex/memory` system.

Installed workspaces should treat `.codex/memory/MEMORY.md` as the canonical
runtime entrypoint for the memory system, and their `AGENTS.md` should point
agents there before they read individual memory files.

This package installs the inority-style workspace memory runtime into a target
workspace.

- `SOUL.md`
- `USER.md`
- `WORKSPACE.md`
- `MEMORY.md`

Source-managed runtime files are installed as symbolic links:

- `SOUL.md`: linked to `<source-memory-dir>/SOUL.md`
- `USER.md`: linked to `<source-memory-dir>/USER.md`

Workspace-local runtime files are installed as regular files:

- `WORKSPACE.md`: seeded from `templates/WORKSPACE.template.md`
- `MEMORY.md`: seeded from `templates/runtime-memory-entry.md`

Sensitive workspace-local content stays local and is never sourced from this repo:

- `credential.md`
- `credential.d/`
- `dairy/`

## Install

```bash
node ./install.mjs
```

Optional flags:

- `--workspace-root /path/to/workspace`
- `--source-memory-dir /path/to/source-memory`

Default target is the current working directory. Set `CODEX_WORKSPACE_ROOT` or pass
`--workspace-root` when invoking the script from another directory.

## Uninstall

```bash
node ./uninstall.mjs
```

## Check Workspace

```bash
node ./check-workspace.mjs
```

Optional flags:

- `--workspace-root /path/to/workspace`
- `--json`

The Node entrypoints are the cross-platform public surface for Windows and Ubuntu.
Legacy `.sh` wrappers may still exist for shell-native workflows, but the documented command path should prefer `.mjs`.

## Runtime behavior

- `SOUL.md` and `USER.md` are symbolic links to maintained source files.
- `MEMORY.md`, `WORKSPACE.md`, credential assets, and dairy remain workspace-local and are never synchronized.
- Existing non-link `SOUL.md` or `USER.md` files are preserved and reported as contract errors instead of being overwritten.
- Existing workspace-local runtime files are never replaced; templates are copied only when the corresponding file is missing.
- The installed `MEMORY.md` is the intended runtime entrypoint that workspace
  `AGENTS.md` should reference.
- `credential.md` is created only if missing, from a sanitized Markdown index template.
- `credential.d/` is created only if missing and stores categorized local-only fragments.
- `dairy/` and `dairy/archive/` are created only if missing.
- Uninstall does not delete runtime memory. It only reports the preserved runtime location.
- `check-workspace.mjs` verifies required runtime entrypoints, local-only files,
  `dairy/archive/`, legacy root-level `.codex/*.md`
  leftovers, stale `AGENTS.md` references, and the SOUL / USER / WORKSPACE contract.
