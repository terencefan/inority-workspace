# memory/MEMORY.md

This directory stores long-lived context files plus local-only notes under
`.codex/memory/`.

Agents should treat this `MEMORY.md` as the canonical runtime entrypoint for the
inority-memory system before reading individual memory files.

Before reading memory files, tell the user that you are loading memory context
and what you are about to read.

## Loading Order

- Read `USER.md` for user preferences and collaboration defaults.
- Read `SOUL.md` for enduring agent operating principles and reusable repair
  patterns.
- Read `WORKSPACE.md` for the index of repositories, active work, and
  workspace-local conventions.
- Read the most recent two files under `dairy/` when recent context would
  materially help the task.
- Read `credential.yaml` only when the task requires credentials, external
  access, or secret names.

## Purpose

- Keep the durable context files for this workspace together in one place
- Keep local-only sensitive content out of the reusable source repository
- Keep daily notes separate from the long-lived files
- Provide the first runtime entrypoint that `AGENTS.md` should read for memory
  loading order and boundaries

## Files

- `SOUL.md`: agent operating style, managed from `inority-workspace/memory/SOUL.md`
- `USER.md`: personal preferences, managed from `inority-workspace/memory/USER.md`
- `MEMORY.md`: workspace-local runtime-facing memory index
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
  entrypoint; install and uninstall are managed from
  `inority-workspace/skills/inority-memory/`

## Sensitive Local Files

The following paths are intentionally local-only and should not be copied back
into the reusable source repository as real content:

- `WORKSPACE.md`
- `credential.yaml`
- `dairy/`
