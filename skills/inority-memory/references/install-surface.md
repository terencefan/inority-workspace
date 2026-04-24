# Inority Memory Install Surface

Central install surface for the inority-style workspace `.codex/memory` system.

Installed workspaces should treat `.codex/memory/README.md` as the canonical
runtime entrypoint for the memory system, and their `AGENTS.md` should point
agents there before they read individual memory files.

This package manages the non-sensitive memory entrypoints from `inority-workspace`
and installs them into a target workspace:

- `SOUL.md`
- `USER.md`
- `README.md`

Syncable assets must stay link-installed:

- `SOUL.md`: symlink to `inority-workspace/memory/SOUL.md`
- `USER.md`: symlink to `inority-workspace/memory/USER.md`

Sensitive workspace-local content stays local and is never sourced from this repo:

- `WORKSPACE.md`
- `credential.yaml`
- `dairy/`

## Install

```bash
node ./install.mjs
```

Optional flags:

- `--workspace-root /path/to/workspace`

Default target is the umbrella workspace root that contains this `inority-workspace`
repository.

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

- `SOUL.md` and `USER.md` are symlinked to the maintained source files in
  `inority-workspace/memory/`.
- `README.md` is symlinked to the managed runtime-facing memory README template
  in this package.
- The installed `README.md` is the intended runtime entrypoint that workspace
  `AGENTS.md` should reference.
- `WORKSPACE.md` is created only if missing, from a sanitized template.
- `credential.yaml` is created only if missing, from a sanitized template.
- `dairy/` and `dairy/archive/` are created only if missing.
- Uninstall removes only the managed symlinks and restores any backed-up public
  files; it does not delete local `WORKSPACE.md`, `credential.yaml`, or diary
  notes.
- `check-workspace.mjs` verifies required runtime entrypoints, managed symlink
  targets, local-only files, `dairy/archive/`, legacy root-level `.codex/*.md`
  leftovers, and stale `AGENTS.md` references to old entrypoints.
