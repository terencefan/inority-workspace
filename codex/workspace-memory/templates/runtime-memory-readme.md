# memory/README.md

This directory stores long-lived context files plus local-only notes under
`.codex/memory/`.

## Purpose

- Keep the durable context files for this workspace together in one place
- Keep local-only sensitive content out of the reusable source repository
- Keep daily notes separate from the long-lived files

## Files

- `SOUL.md`: agent operating style, managed from `inority-workspace/memory/SOUL.md`
- `USER.md`: personal preferences, managed from `inority-workspace/memory/USER.md`
- `README.md`: runtime-facing memory index, managed from
  `inority-workspace/codex/workspace-memory/`
- `WORKSPACE.md`: workspace-local structure, conventions, and environment rules
- `credential.yaml`: local-only credential assets
- `dairy/YYYY-MM-DD.md`: daily notes for one date
- `heartbeat-state.json`: optional machine-readable heartbeat state when needed

## Writing Rules

- Prefer short bullets
- Keep facts and decisions, not filler
- Promote durable knowledge into the right file inside `.codex/memory/`
- Keep `dairy/` focused on daily notes rather than long-lived context
- If a planning or reflection pass produces a reusable lesson, write it into
  today's `dairy/YYYY-MM-DD.md` instead of leaving it only in the transient
  reply or diff
- For reusable cross-environment assets, edit the source files under
  `inority-workspace/memory/` and keep `.codex/memory/` as the stable runtime
  entrypoint

## Sensitive Local Files

The following paths are intentionally local-only and should not be copied back
into the reusable source repository as real content:

- `WORKSPACE.md`
- `credential.yaml`
- `dairy/`
