# Inority Memory Distill Surface

Standalone reference for the `inority-memory-distill` skill.

## Trigger

Use this skill only when:

- the workspace memory runtime is already initialized
- the task is backlog-style dairy processing rather than current-thread reflection
- the user explicitly asks to process `.codex/memory/dairy/`, distill dairy notes, or `inority-memory-distill`

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

## Output Expectations

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
