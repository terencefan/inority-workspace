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
- `README.md`
- `MEMORY.md`

Templated runtime files are installed as regular files:

- `SOUL.md`: seeded from `templates/SOUL.template.md`
- `USER.md`: seeded from `templates/USER.template.md`
- `WORKSPACE.md`: seeded from `templates/WORKSPACE.template.md`
- `MEMORY.md`: seeded from `templates/runtime-memory-entry.md`

Compatibility public assets may still be copied from reusable source:

- `README.md`: copied from `inority-workspace/memory/README.md`

Sensitive workspace-local content stays local and is never sourced from this repo:

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

- `SOUL.md`, `USER.md`, `WORKSPACE.md`, and `MEMORY.md` are installed as
  workspace-local regular files from templates.
- If an older install left behind managed `SOUL.md` / `USER.md` content or
  symlinks, reinstall may replace those legacy managed files with template files.
- The installed `MEMORY.md` is the intended runtime entrypoint that workspace
  `AGENTS.md` should reference.
- The installed `README.md` remains as a local compatibility entrypoint for
  workspaces whose `AGENTS.md` still points there, but it must also be a
  regular file rather than a symlink.
- `credential.yaml` is created only if missing, from a sanitized template.
- `dairy/` and `dairy/archive/` are created only if missing.
- Uninstall removes only the managed copied public compatibility files and
  restores any backed-up public files; it does not delete local template-based
  runtime files such as `SOUL.md`, `USER.md`, `MEMORY.md`, `WORKSPACE.md`, `credential.yaml`,
  or diary notes.
- `check-workspace.mjs` verifies required runtime entrypoints, managed copied
  compatibility file content, local-only files, `dairy/archive/`, legacy root-level `.codex/*.md`
  leftovers, and stale `AGENTS.md` references to old entrypoints.
