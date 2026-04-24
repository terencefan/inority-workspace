---
name: inority-memory-migration
description: Use when the user wants to migrate memory from another system or legacy layout into the inority memory structure. Covers source inspection, migration planning, target mapping, backup expectations, and the migration command surface under `skills/inority-memory-migration/`.
---

# Inority 记忆迁移

Use this skill when the user wants to migrate memory from another system into the inority memory structure.

This skill is explicit-only. Do not invoke it implicitly from generic memory questions.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

## Use This Skill When

- the user explicitly invokes `inority-memory-migration`
- the user wants to import legacy or external memory into the inority layout
- the source memory lives under another workspace's `.codex/` directory as non-inority-style `.md` files
- the user wants help mapping another memory system into `USER.md`, `SOUL.md`, `WORKSPACE.md`, `credential.yaml`, and `dairy/`
- the user wants to run or review the migration command surface

## Scope

This skill owns:

- migration source inspection
- migration planning and target mapping
- user-confirmation gating before mutation
- the migration command surface
- backup expectations and migration safety boundaries
- understanding legacy `.codex/user.md`, `.codex/memory.md`, `.codex/workspace.md`, and `.codex/credential.md`

This skill does not own:

- normal `.codex/memory/` runtime install / repair
- current-thread reflection
- dairy distillation

## Runtime Relationship

`inority-memory` remains the governance skill for the inority runtime.
`inority-memory-migration` is the explicit migration lane that imports foreign memory into that runtime.

If memory content appears non-inority-style during normal inspection, the correct response is to suggest this skill or the `migrate` command rather than silently reshaping the source in place.

## Command Surface

`migrate` is an understanding-first command surface for importing memory from another system into the inority layout.

### Goal

Understand external memory structure first, present a migration plan for confirmation, then import it into the right inority targets without silently overwriting managed runtime structure.

### Preferred Source Shape

Prefer a legacy workspace `.codex/` directory as the migration source.

Typical non-inority source files:

- `.codex/user.md`
- `.codex/memory.md`
- `.codex/workspace.md`
- `.codex/credential.md`
- `.codex/memory/*.md` as dairy-style day notes

Migration workflow:

1. model understanding
2. generate backup script
3. generate migration script
4. user confirmation
5. execution

### Target Groups

- syncable targets in `inority-workspace/memory/`
- `USER.md`
- `SOUL.md`
- workspace-local targets in `.codex/memory/`
- `WORKSPACE.md`
- `credential.yaml`
- `dairy/`

Primary command:

- `node scripts/scan-md.mjs --source-root /path/to/legacy-workspace`
- `node scripts/migrate.mjs`
- `node .codex/memory/.migration-plans/<stamp>/1-backup.mjs`
- `node .codex/memory/.migration-plans/<stamp>/2-migrate.mjs`

This command should:

- understand source markdown structure first
- prefer legacy `.codex/*.md` source files over assuming another inority runtime
- generate a migration plan plus two reviewable scripts by default
- script `1` must be the backup script
- script `2` must be the migration script
- require explicit user confirmation before any mutation
- do not execute migration during plan generation
- ensure the target runtime exists first during apply
- map content into the inority target files
- understand source memory semantically and split it into individual memory entries before insertion
- back up touched targets before mutation
- after successful migration, clean legacy source files by moving them into the per-run backup area instead of leaving duplicate live sources behind
- preserve unmapped content in explicit imported sections instead of dropping it

### Import Rules

- by default the command writes only plan artifacts under `.codex/memory/.migration-plans/<timestamp>/`
- the generated artifacts must include `plan.json`, `1-backup.mjs`, and `2-migrate.mjs`
- migration of memory content must not happen during plan generation
- source auto-detection should prefer legacy `.codex/*.md` files before assuming another inority runtime
- before writing any migration target, it creates a per-run backup under `.codex/memory/migrate-backups/<timestamp>/`
- after a successful apply, migrated legacy source files are moved under that run's backup directory so the original legacy paths are cleaned without losing auditability
- markdown sources are parsed into sections and content blocks first
- markdown sources are then split into individual entries and inserted into canonical inority sections instead of being copied as large imported blocks
- `.codex/memory.md` is treated as generic durable memory and split heuristically into `USER.md`, `SOUL.md`, and `WORKSPACE.md`
- `USER.md`, `SOUL.md`, and `WORKSPACE.md` are imported by inferred per-entry section mapping plus deduplication
- when a source section or line does not map cleanly, it falls back into the nearest canonical section rather than creating a mechanical imported dump
- yaml credentials stay conservative
- dairy notes are written into `.codex/memory/dairy/` by date; if the same date already exists, merge into that diary instead of creating `.migrated-*` filenames

### Example Commands

```bash
node scripts/migrate.mjs --source-root /path/to/legacy-workspace
```

```bash
node .codex/memory/.migration-plans/<timestamp>/1-backup.mjs
```

```bash
node .codex/memory/.migration-plans/<timestamp>/2-migrate.mjs
```

```bash
node scripts/migrate.mjs \
  --user-source /path/to/user.md \
  --soul-source /path/to/soul.md \
  --workspace-source /path/to/workspace.md \
  --credential-source /path/to/credential.yaml \
  --dairy-source-dir /path/to/dairy \
  --source-label legacy-system
```

## Output Contract

When operating under this skill:

- name the migration source inputs you used
- show which files will be migrated before mutation
- show where the generated backup and migration scripts were written
- call out the backup directory
- state how many new memory entries are expected to be added
- treat user confirmation as a strict `Y / N` decision
- distinguish inferred mapping from confirmed direct mapping
- do not migrate immediately after inspection unless the user explicitly confirms the plan

## Resource Files

- `skills/inority-memory-migration/scripts/scan-md.mjs`
- `skills/inority-memory-migration/scripts/migrate.mjs`
- `skills/inority-memory-migration/README.md`

Use these resources for migration-specific work. Keep install / reflect / distill behavior in `inority-memory`.
