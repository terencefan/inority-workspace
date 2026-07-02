---
name: inority-question
description: Standardize every user-facing question, clarification, disambiguation, route confirmation, authorization request, path choice, scope/risk/acceptance/rollback confirmation, and interview question across workspace skills. Use before asking the user anything, before requesting confirmation or permission, before presenting options for the user to choose, before sending wording such as 是否, 要不要, 能否, 可不可以, 确认一下, 请选择, 你选, 需要你确认, or whenever ambiguity must be reduced before proceeding or freezing an authority artifact.
---

# Inority Question

Use this skill whenever the current task needs any user-facing question or confirmation before proceeding.

This skill does not decide whether questioning is necessary. The parent skill still owns that decision.
This skill standardizes how the question is framed once the parent skill has decided to ask.
If multiple skills are active, use this as the final question-surface skill after the parent skill has determined what must be asked.

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
- `Q` must contain only the actual question sentence. Do not copy the numbered options, recommendation text, or custom-answer hint into `Q`.
- If the live round used numbered options, keep those options in the chat turn only; when writing back into a runbook or spec, rewrite `Q` into a clean option-free question.
- `A` must contain the user's substantive answer in natural language, not just the selected option index, letter, or shorthand such as `1`, `2`, `A`, `B`.
- If the user answered with only an index or letter, expand it during write-back into the full chosen meaning, using the exact option text that the user selected.
- If the user answered with an option plus custom detail, `A` should preserve both the chosen route and the custom detail as one complete answer.
- If the user answered outside the prepared option wording, but their intent clearly matches one of the existing options, normalize the write-back to that matched option wording first, then append any extra custom detail that materially changes scope or constraints.
- Only keep the answer as a fully custom variant when it does not clearly map onto any prepared option.

## Parent-Skill Boundary

- `$write-doc` still owns interview count, spec convergence, and artifact structure.
- `$runbook` still owns 10% gate, recon branching, and execution-mode switching.
- `$inority-slides` still owns deck QA density, section/slide confirmation coverage, and delivery shape.

This skill only standardizes the question surface.
