---
name: inority-memory-reflect
description: Use when the user explicitly wants reusable lesson candidates from the current thread or just-finished repair in the inority memory system. Covers reflection-only workflow, candidate shaping, destination memory-home selection, and the requirement to wait for user selection before writing durable memory.
---

# Inority Memory Reflect

Use this skill when the user wants to reflect on the current thread under the inority memory model.

This skill is only for current-thread or just-finished-repair reflection. It does not initialize `.codex/memory/`, repair runtime entrypoints, or process historical dairy backlogs.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

## Use This Skill When

- the user explicitly invokes `inority-memory-reflect`
- the user explicitly invokes `inority-memory` and clearly asks for reusable lessons from the current thread
- the task is to produce promotion candidates before writing durable memory

## Preconditions

- `.codex/memory/` runtime must already be initialized
- if runtime entrypoints are missing or broken, stop and use `inority-memory` install or repair first

## Goal

Produce reusable lesson candidates from the current thread before writing durable memory.

The user must choose which candidates should be promoted. Until the user selects numbers, do not write into:

- `.codex/memory/USER.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/credential.yaml`

## Candidate Rules

When practical, each candidate should capture:

- symptom
- root cause
- repair pattern
- preventative check

Compress the lesson into one operational sentence or bullet. Keep chronology out unless it is necessary to preserve the reusable rule.

Avoid speculative or weakly evidenced lessons.

## Memory Homes

- `USER.md`: durable user preferences or workflow defaults
- `WORKSPACE.md`: workspace structure, environment rules, cross-project conventions
- `SOUL.md`: reusable operating principles or repair patterns
- `credential.yaml`: secret names, locations, and usage hints only

## Output Contract

- return compact numbered candidates
- state the intended destination memory home for each candidate
- wait for the user's selection before writing durable memory
- name the source thread or repaired item being reflected

## Resource Files

- `skills/inority-memory-reflect/references/reflect-surface.md`

Read the reference file when you need the detailed trigger and candidate-shape reminder. Keep the main workflow concise.
