---
name: distill-dairy
description: Extract reusable long-term-memory candidates from daily notes under `.codex/memory/dairy/`. Use only when explicitly invoked as `$distill-dairy` and the goal is to process the oldest eligible dairy note, identify the highest-value lessons worth promoting into `USER.md`, `WORKSPACE.md`, `SOUL.md`, or `credential.yaml`, present numbered candidates in the same selection-first format as `$postmortem`, archive the processed dairy note into `.codex/memory/dairy/archive/` after the user chooses, and then automatically continue to the next eligible pre-today note.
---

# Distill Dairy

Use this skill to turn one eligible dairy note at a time into a shortlist of durable memory candidates, then keep moving forward through the backlog.

This skill is explicit-first. Do not run it implicitly from generic requests for a recap or summary. Prefer it when the user wants to mine `.codex/memory/dairy/` for reusable lessons that are worth promoting into the long-lived memory files.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

## Scope

Treat the source material in this order:

1. The dairy note file explicitly named by the user.
2. The single currently open or obviously referenced dairy note file in the thread.
3. If no specific note is named, use the oldest eligible default file:
   - pick the earliest dairy note file in `.codex/memory/dairy/` that is strictly earlier than today
   - after the current note is archived, automatically continue to the next eligible pre-today dairy note in the same run
   - never auto-include today's dairy note unless the user explicitly names it

Do not broaden into repo-wide archaeology, adjacent dairy notes, or unrelated historical notes just to manufacture lessons.
Treat `.codex/memory/dairy/archive/` as already-processed material and keep it out of scope.

Use `scripts/find_oldest_dairy.py` to locate the earliest eligible dairy note when the user did not name a specific file.

Examples:

```bash
python3 scripts/find_oldest_dairy.py --before-today
python3 scripts/find_oldest_dairy.py --all --before-today
```

## Goal

Produce a numbered list of candidate lessons that are:

- reusable beyond a one-off diary entry
- grounded in concrete note evidence
- specific enough to be written into long-term memory later

The user chooses which numbers should be promoted. Until the user selects numbers, do not write to `.codex/memory/USER.md`, `.codex/memory/WORKSPACE.md`, `.codex/memory/SOUL.md`, `.codex/memory/credential.yaml`, or any other durable store, and do not move the source dairy note yet.

For this skill, "archive" means: move the processed source dairy note from `.codex/memory/dairy/` into `.codex/memory/dairy/archive/`. Archiving is a file move, not just a logical "not promoted" outcome. Non-selected candidates are simply dropped for the current round.

## Filtering Rules

Keep only candidates that pass all of these checks:

1. The lesson changes future behavior, validation, structure, or operator judgment.
2. The lesson is likely to matter again in this workspace or operating style.
3. The lesson can be stated without depending on diary-only shorthand.

Drop or demote anything that is:

- just a diary timeline recap
- a one-off local accident with no reusable pattern
- already captured in durable memory unless the new wording is clearly better
- still speculative or weakly evidenced

## Memory-Home Heuristic

For each candidate, decide the best destination without writing it yet:

- `.codex/memory/USER.md`: personal preferences and user-specific durable workflow choices
- `.codex/memory/WORKSPACE.md`: workspace-wide structure, navigation, environment rules, or cross-project conventions
- `.codex/memory/SOUL.md`: enduring operating principles for agent behavior
- `.codex/memory/credential.yaml`: local-only credential assets such as tokens, passwords, proxy credentials, or secret-bearing paths

In the final table, express that destination through the `Type` color symbol rather than a separate `Target` column.

If a lesson is useful but not durable enough, say so and keep it out of the numbered promotion set.

## Workflow

### 1. Reconstruct the dairy slice briefly

Compress the source note into 1 short paragraph:

- which dairy note file was read
- what kind of work they captured
- where rework, discovery, or repeated failure appeared

### 2. Extract candidate lessons

Look for:

- validation gaps that caused churn
- environment or workflow constraints rediscovered multiple times
- note patterns that clearly want promotion out of dairy
- durable conventions that should stop living only in the diary stream

Prefer lessons with a clear "if X, then do Y" or "keep X in Y file" shape.

### 3. Deduplicate and tighten

Merge near-duplicates. Split overloaded lessons when they hide two separate reusable rules.

Each lesson should be one atomic claim.

### 4. Present numbered candidates

Before the table, add one single-line legend that explains the destination symbols, for example:

`图例：🟢 = USER.md，🟡 = WORKSPACE.md，🔵 = SOUL.md，🔴 = credential.yaml`

Present the durable candidates as one Markdown table with these exact columns:

`No | Type | Lesson`

Formatting rules:

- `No`: the stable selection number, for example `1`
- `Type`: show only one symbol: `🟢` / `🟡` / `🔵` / `🔴`
  - `🟢`: promote to `.codex/memory/USER.md`
  - `🟡`: promote to `.codex/memory/WORKSPACE.md`
  - `🔵`: promote to `.codex/memory/SOUL.md`
  - `🔴`: promote to `.codex/memory/credential.yaml`
- Sort rows by type in this fixed order: `🟢` -> `🟡` -> `🔵` -> `🔴`
- `Lesson`: make this very concise; prefer a short rule-like sentence or imperative, and cut filler before cutting meaning

Keep numbering stable within the reply.

### 5. Stop for user selection

End by asking the user to reply with the numbers they want to promote.

Selection rules:

- If the user replies with one or more numbers, only those numbers are kept for promotion; every non-selected candidate is dropped for this round, and the processed dairy note is archived after the requested durable writeback completes.
- If the user replies `N`, treat that as "promote none"; archive the processed dairy note without writing anything durable.
- If the archive target path already exists, stop and surface the collision instead of overwriting it.
- Do not auto-promote dropped candidates.

Do not auto-promote.
Do not write the durable memory entry in the same turn unless the user explicitly asks for both extraction and writeback.

### 6. Auto-continue after archive

After a note is archived successfully:

- if another unarchived dairy note exists that is strictly earlier than today, immediately continue to that next note without waiting for the user to re-invoke `$distill-dairy`
- if the next remaining note is today's diary, stop instead of distilling it
- if no eligible pre-today dairy notes remain, say so explicitly and end the run

## Output Contract

Default reply shape:

1. A brief synthesis paragraph naming the dairy note scope.
2. A one-line legend for `🟢 / 🟡 / 🔵 / 🔴`.
3. `候选经验` Markdown table with columns `No | Type | Lesson`.
4. `不建议入长期记忆` short list for items that are useful but not durable enough, only if needed.
5. A short closing line asking the user to choose numbers, or reply `N` to archive the current dairy note without promotion.

When continuing automatically after an archive, start the next cycle directly from step 1 instead of adding extra narration about the handoff.

When evidence is thin, say that explicitly and return fewer, higher-confidence candidates instead of padding.

## Style Rules

- Prefer Chinese unless the user asks for English.
- Be blameless and operationally concrete.
- Favor stable abstractions over diary-specific narration.
- Keep evidence and inference separate.
- Keep `Lesson` shorter than you first want to write.
- Optimize for selection quality, not for completeness theater.

## Example Prompt

`Use $distill-dairy to read the oldest eligible file under .codex/memory/dairy/ that is earlier than today, extract the highest-value long-term-memory candidates, add a one-line legend for 🟢 / 🟡 / 🔵 / 🔴 where the color maps directly to the durable memory file, present the candidates in the No / Type / Lesson table format, and wait for my selection before writing anything durable. If I reply with some numbers, promote only those and then archive the processed dairy note into .codex/memory/dairy/archive/; if I reply N, archive that dairy note without promotion. After each archive, continue automatically to the next eligible pre-today dairy note, and skip today's dairy unless I explicitly name it.`
