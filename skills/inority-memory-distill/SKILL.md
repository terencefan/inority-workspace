---
name: inority-memory-distill
description: Use when the user wants to distill historical dairy notes in the inority memory system into durable memory candidates. Covers dairy-note selection, oldest-note fallback, archive rules, candidate classification, and the requirement to wait for user selection before promotion.
---

# Inority Memory Distill

Use this skill when the user wants to process `.codex/memory/dairy/` backlog notes into durable memory candidates.

This skill is for backlog-style dairy processing only. It does not initialize `.codex/memory/`, repair runtime entrypoints, or reflect on the current thread.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

## Use This Skill When

- the user explicitly invokes `inority-memory-distill`
- the user explicitly invokes `inority-memory` and clearly asks to process `.codex/memory/dairy/`
- the task is to turn one dairy note at a time into durable memory candidates

## Preconditions

- `.codex/memory/` runtime must already be initialized
- if runtime entrypoints are missing or broken, stop and use `inority-memory` install or repair first

## Source Selection

Pick the source note in this order:

1. the dairy note file explicitly named by the user
2. the single obviously referenced dairy note in the thread
3. the oldest eligible default note

Oldest eligible default means:

- the earliest `.md` note in `.codex/memory/dairy/` whose filename date is strictly earlier than today
- after archiving one processed note, continue automatically to the next eligible pre-today note
- never auto-include today's dairy note unless the user explicitly names it

Treat `.codex/memory/dairy/archive/` as already processed and out of scope.

Use `scripts/find-oldest-dairy.mjs` when the user did not name a specific file.

## Goal

Produce durable memory candidates from one dairy note at a time.

Until the user selects numbers, do not:

- write durable memory
- move the source dairy note

If the user replies `N`, archive the processed note without promotion.

## Output Contract

Default reply shape:

1. a brief synthesis paragraph naming the dairy note scope
2. a one-line legend for `🟢 / 🟡 / 🔵 / 🔴`
3. a `No | Type | Lesson` table
4. an optional short `不建议入长期记忆` list
5. a short line asking the user to choose numbers, or reply `N`

## Archive Rules

- archive means moving the processed note into `.codex/memory/dairy/archive/`
- do not overwrite archive collisions
- after a successful archive, continue automatically to the next eligible pre-today note
- stop when the next remaining note is today's diary or when no eligible pre-today notes remain

## Memory Homes

- `🟢` -> `.codex/memory/USER.md`
- `🟡` -> `.codex/memory/WORKSPACE.md`
- `🔵` -> `.codex/memory/SOUL.md`
- `🔴` -> `.codex/memory/credential.yaml`

## Resource Files

- `skills/inority-memory-distill/scripts/find-oldest-dairy.mjs`
- `skills/inority-memory-distill/references/distill-surface.md`

Use the script for deterministic oldest-note selection instead of reimplementing date filtering inline.
