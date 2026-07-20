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
- the user explicitly invokes `inority-memory-maintenance` and clearly asks for reusable lessons from the current thread
- the task is to produce promotion candidates before writing durable memory

## Preconditions

- `.codex/memory/` runtime must already be initialized
- if runtime entrypoints are missing or broken, stop and use `inority-memory-maintenance` first

## Goal

Produce reusable lesson candidates from the current thread before writing durable memory.

The user must choose which candidates should be promoted. Until the user selects numbers, do not write into:

- `.codex/memory/USER.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/credential.md` and the matching `.codex/memory/credential.d/*.yaml` fragment

## Candidate Rules

When practical, a domain-skill candidate should capture:

- symptom
- root cause
- repair pattern
- preventative check

Compress the lesson into one operational sentence or bullet. Keep chronology out unless it is necessary to preserve the reusable rule.

Avoid speculative or weakly evidenced lessons.

## Candidate Destinations

- `USER.md`: user profile or personal preference
- `WORKSPACE.md`: concise project navigation or team-wide workspace preference
- `SOUL.md`: stable agent operating style
- corresponding skill: workflow, tool, cluster, product, implementation, or repair rule
- `credential.md`: category index; `credential.d/*.yaml`: secret names, values, locations, and usage hints
- nowhere: content that is not stable or reusable

## Output Contract

- return compact numbered candidates
- state the intended destination for each candidate
- wait for the user's selection before writing durable memory
- name the source thread or repaired item being reflected

## Resource Files

- `references/reflect-surface.md`

Read the reference file when you need the detailed trigger and candidate-shape reminder. Keep the main workflow concise.
