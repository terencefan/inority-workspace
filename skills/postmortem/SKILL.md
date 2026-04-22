---
name: postmortem
description: Extract reusable lessons from the current task context after debugging, execution, incident handling, runbook work, or visible rework. Use only when explicitly invoked as `$postmortem` and the goal is to synthesize numbered long-term-memory candidates from the current context, let the user choose which numbers to keep, and avoid writing durable memory before that selection.
---

# Postmortem

Use this skill to turn the current context into a shortlist of reusable lessons.

This skill is explicit-first. Do not run it implicitly from generic requests for a summary or recap. Prefer it when the user wants reusable lessons, postmortem candidates, or memory-promotion options from the work already visible in context.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

## Scope

Treat "current context" in this order:

1. The current conversation, including user goals, corrections, failures, and confirmed outcomes.
2. Files, logs, commands, diffs, and notes already referenced in the thread or obviously in play.
3. A narrow read of directly referenced artifacts when the current context is too thin.

Do not broaden into a repo-wide archaeology pass just to manufacture lessons.

## Goal

Produce a numbered list of candidate lessons that are:

- reusable beyond the exact one-off step
- grounded in evidence already present
- specific enough to be written into long-term memory later

The user chooses which numbers should be promoted. Until the user selects numbers, do not write to `.codex/memory/USER.md`, `.codex/memory/WORKSPACE.md`, `.codex/memory/SOUL.md`, `.codex/memory/credential.yaml`, or any other durable store.

## Filtering Rules

Keep only candidates that pass all of these checks:

1. The lesson changes future behavior, validation, structure, or operator judgment.
2. The lesson is likely to matter again in this workspace or operating style.
3. The lesson can be stated without depending on fragile thread-only wording.

Drop or demote anything that is:

- just a timeline recap
- a local accident with no reusable pattern
- already captured in durable memory unless the new wording is clearly better
- still speculative or weakly evidenced

## Memory-Home Heuristic

For each candidate, suggest the best destination without writing it yet:

- `.codex/memory/USER.md`: personal preferences and user-specific durable workflow choices
- `.codex/memory/WORKSPACE.md`: workspace-wide structure, navigation, or cross-project conventions
- `.codex/memory/SOUL.md`: enduring operating principles for agent behavior
- `.codex/memory/credential.yaml`: local-only credential assets such as tokens, passwords, proxy credentials, or secret-bearing paths

If a lesson is useful but not durable enough, say so and keep it out of the numbered promotion set.

## Workflow

### 1. Reconstruct the task briefly

Compress the task into 1 short paragraph:

- what kind of work happened
- where rework, failure, ambiguity, or discovery occurred
- what evidence the synthesis is based on

### 2. Extract candidate lessons

Look for:

- repeated failure modes
- validation gaps that caused churn
- contract mismatches between docs, automation, and reality
- prompt/governance lessons that should persist
- environment or tooling constraints that will matter again

Prefer lessons with a clear "if X, then do Y" shape.

### 3. Deduplicate and tighten

Merge near-duplicates. Split overloaded lessons when they hide two separate reusable rules.

Each lesson should be one atomic claim.

### 4. Present numbered candidates

Before the table, add one single-line legend that explains the traffic-light symbols, for example:

`图例：🟢 = 经验复用，🟡 = 自我纠错，🔴 = 用户纠错`

Present the durable candidates as one Markdown table with these exact columns:

`No | Type | Lesson | Target | Evidence`

Formatting rules:

- `No`: the stable selection number, for example `1`
- `Type`: show only one symbol: `🟢` / `🟡` / `🔴`
  - `🟢 经验复用`: the lesson is a reusable engineering or workflow pattern not centered on a correction event
  - `🟡 自我纠错`: the lesson exists because the agent discovered and corrected its own mistake or mismatch
  - `🔴 用户纠错`: the lesson exists because the user corrected a wrong assumption, wrong direction, or wrong output
- Sort rows by type in this fixed order: `🟢` -> `🟡` -> `🔴`
- `Lesson`: make this very concise; prefer a short rule-like sentence or imperative, and cut filler before cutting meaning
- `Target`: the suggested memory home from the durable files above
- `Evidence`: brief pointer to the context that supports it

Keep numbering stable within the reply.

### 5. Stop for user selection

End by asking the user to reply with the numbers they want to promote.

Do not auto-promote.
Do not write the durable memory entry in the same turn unless the user explicitly asks for both extraction and writeback.

## Output Contract

Default reply shape:

1. A brief synthesis paragraph.
2. A one-line legend for `🟢 / 🟡 / 🔴`.
3. `候选经验` Markdown table with columns `No | Type | Lesson | Target | Evidence`.
4. `不建议入长期记忆` short list for items that are useful but not durable enough, only if needed.
5. A short closing line asking the user to choose numbers.

When evidence is thin, say that explicitly and return fewer, higher-confidence candidates instead of padding.

## Style Rules

- Prefer Chinese unless the user asks for English.
- Be blameless and operationally concrete.
- Favor stable abstractions over thread-specific narration.
- Keep evidence and inference separate.
- Keep `Lesson` shorter than you first want to write; compress to the minimum wording that still changes future behavior.
- Optimize for selection quality, not for completeness theater.

## Example Prompt

`Use $postmortem to extract reusable lessons from the current context, add a one-line legend for 🟢 / 🟡 / 🔴, present the durable candidates in a Markdown table with No / Type / Lesson / Target / Evidence, keep only the traffic-light symbol in Type, keep Lesson very concise, sort rows as green then yellow then red, and wait for my selection before writing any long-term memory.`
