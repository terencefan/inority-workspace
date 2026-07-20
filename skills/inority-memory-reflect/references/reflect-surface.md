# Inority Memory Reflect Surface

Standalone reference for the `inority-memory-reflect` skill.

## Trigger

Use this skill only when:

- the workspace memory runtime is already initialized
- the task is current-thread reflection rather than dairy backlog processing
- the user explicitly asks for reusable lessons, reflection candidates, or `inority-memory-reflect`

## Goal

Produce reusable lesson candidates from the current thread before writing durable memory.

The user must choose which candidates should be promoted. Until the user selects numbers, do not write into:

- `.codex/memory/USER.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/credential.yaml`

## Candidate Shape

When practical, each candidate should capture:

- symptom
- root cause
- repair pattern
- preventative check

Compress the lesson into one operational sentence or bullet. Keep diary-like chronology out unless it is required to preserve the reusable rule.

## Output Expectations

- return compact numbered candidates
- state the intended destination memory home for each candidate
- wait for the user's selection before writing durable memory
- avoid speculative or weakly evidenced lessons

## Memory Homes

- `USER.md`: durable user preferences or workflow defaults
- `WORKSPACE.md`: workspace structure, environment rules, cross-project conventions
- `SOUL.md`: reusable operating principles or repair patterns
- `credential.yaml`: secret names, locations, and usage hints only
