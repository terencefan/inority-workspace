---
name: inority-question
description: Standardize clarification, disambiguation, route-confirmation, and user interview questions across workspace skills. Use when an agent needs to ask the user a planning question, narrow multiple viable paths, confirm goals or non-goals, validate acceptance meaning, or collect structured interview records before freezing an authority artifact.
---

# Inority Question

Use this skill whenever the current task cannot safely proceed without asking the user something to reduce ambiguity.

This skill does not decide whether questioning is necessary. The parent skill still owns that decision.
This skill standardizes how the question is framed once the parent skill has decided to ask.

## What This Skill Owns

- one-question-per-round discipline
- dimension-focused questioning
- numbered mutually exclusive options by default
- lightweight recommendation text for each option
- concise route-confirmation and disambiguation wording
- interview-record formatting for artifacts that need durable Q/A history

## Default Question Protocol

1. Ask exactly one question in the current round.
2. Bind the question to one dimension only:
   - `goal`
   - `non-goal`
   - `risk`
   - `acceptance`
   - `rollback`
   - `path selection`
   - `audience`
   - `scope`
3. Prefer `2-3` mutually exclusive numbered options:
   - `1. ...`
   - `2. ...`
   - `3. ...`
4. After each option, add one short recommendation line explaining the tradeoff or why that option exists.
5. If none of the prepared options fully fit, allow the user to answer with a custom variant.
6. If the key boundary is still unresolved after the answer, ask the next round instead of pretending the artifact is frozen.

## Style Constraints

- Keep the question concise and decision-oriented.
- Do not ask compound questions.
- Do not hide a route decision inside vague wording like “确认一下” when the real issue is path selection.
- Do not ask fully open-ended questions first when structured options would help the user converge faster.
- Do not give more than three options unless the parent skill explicitly requires it.
- Do not present two options that are materially the same.

## Durable Q/A Recording

When the parent artifact requires interview history, record each round in this shape:

```md
> Q：...
>
> A：...

收敛影响：...
```

- `Q` and `A` stay inside the quote block.
- `收敛影响` stays outside the quote block.
- Only record real user answers; do not backfill fake Q/A.

## Parent-Skill Boundary

- `$write-spec` still owns interview count, spec convergence, and artifact structure.
- `$runbook` still owns 10% gate, recon branching, and execution-mode switching.
- `$inority-slides` still owns deck QA density, section/slide confirmation coverage, and delivery shape.

This skill only standardizes the question surface.
