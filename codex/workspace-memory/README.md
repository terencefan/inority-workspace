# Workspace Memory

Central install surface for workspace `.codex/memory` management.

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
bash ./install.sh
```

Optional flags:

- `--workspace-root /path/to/workspace`

Default target is the umbrella workspace root that contains this `inority-workspace`
repository.

## Uninstall

```bash
bash ./uninstall.sh
```

Optional flags:

- `--workspace-root /path/to/workspace`

## Runtime behavior

- `SOUL.md` and `USER.md` are symlinked to the maintained source files in
  `inority-workspace/memory/`.
- `README.md` is symlinked to the managed runtime-facing memory README template
  in this package.
- `WORKSPACE.md` is created only if missing, from a sanitized template.
- `credential.yaml` is created only if missing, from a sanitized template.
- `dairy/` and `dairy/archive/` are created only if missing.
- Uninstall removes only the managed symlinks and restores any backed-up public
  files; it does not delete local `WORKSPACE.md`, `credential.yaml`, or diary
  notes.
