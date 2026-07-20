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
- `.codex/memory/credential.md` and `.codex/memory/credential.d/*.yaml`

## Candidate Shape

When practical, a domain-skill candidate should capture:

- symptom
- root cause
- repair pattern
- preventative check

Compress the lesson into one operational sentence or bullet. Keep diary-like chronology out unless it is required to preserve the reusable rule.

## Output Expectations

- return compact numbered candidates
- state the intended destination for each candidate
- wait for the user's selection before writing durable memory
- avoid speculative or weakly evidenced lessons

## Candidate Destinations

- `USER.md`: user profile or personal preference
- `WORKSPACE.md`: concise project navigation or team-wide workspace preference
- `SOUL.md`: stable agent operating style
- corresponding skill: workflow, tool, cluster, product, implementation, or repair rule
- `credential.md`: category index; `credential.d/*.yaml`: secret names, values, locations, and usage hints
- nowhere: content that is not stable or reusable
