# memory

Cross-environment reusable memory assets live in this directory.

## Scope

- `SOUL.md`: reusable operating principles
- `USER.md`: reusable collaboration preferences
- public runtime-facing memory entrypoints are installed into target workspaces by
  `skills/inority-memory/scripts/`

## Install Contract

- `SOUL.md` and `USER.md` are syncable assets and should be installed as copied
  regular files into the target workspace `.codex/memory/`
- `README.md` may also be installed as a copied regular compatibility entrypoint
  when a workspace still points agents here instead of `MEMORY.md`
- workspace-local sensitive files stay local and should not be versioned here as
  real content

The workspace entrypoint remains `../../.codex/memory/`, and reusable files should be copied there so the startup path stays stable without relying on symlinks.

Sensitive workspace-local memory content should stay outside this source directory
as real content:

- `WORKSPACE.md`
- `credential.yaml`
- `dairy/`
