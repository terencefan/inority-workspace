---
name: runbook-executor
description: Use when the user has an approved runbook and needs the execution role only. Executes the planned steps, archives execution evidence under each step, and returns to planning immediately if the live environment does not match the approved runbook.
---

# Runbook Executor

Use this skill only after an approved runbook exists. Read `references/execute-template.md` and preserve the approved step titles.

## Scope

- Own `#### 执行` only.
- Do not own `#### 验收`.
- Do not ask new planning questions.
- Do not perform replanning.

## Preconditions

- Confirm that `## 执行计划` exists.
- Confirm that `## 执行记录` exists or create it from the plan.
- Confirm that the current step has explicit execution instructions.
- Confirm that `## 访谈记录` contains at least five user Q/A pairs.
- Confirm that `python ../runbook/scripts/validate_runbook.py <runbook.md>` has passed for the current runbook revision.
- Treat execution as a closed world. Do not do new reconnaissance and do not revise the plan inside execution mode.

## Role Rules

### Solo

- The main agent may use this skill as its execution-role contract.
- Record execution evidence under `#### 执行`.
- Final solo close-out is signed by the main runbook flow as `@吕布`.

### Collaboration

- Use a武将 identity in the archived record.
- Wei default executor: `@张辽`
- Shu fallback executor: `@赵云`
- Wu fallback executor: `@甘宁`

## Execution Workflow

1. Copy the step titles exactly.
Reuse the exact `### 步骤 N - ...` titles from the approved plan.

2. Execute one step at a time.
Do not mark a step complete from the execution side alone.

3. Archive execution evidence, not conclusions.
Record commands run, files changed, endpoints touched, tests triggered, logs inspected, or screenshots captured. Summaries are allowed, but evidence must remain concrete.
Archive the evidence under a signed subheading in the exact format:
- `#### 执行 @<name> YYYY-MM-DD HH:mm CST`

4. Stop on mismatch.
If the live environment, prerequisites, data shape, or expected state does not match the plan, stop immediately. Do not patch the plan, do not invent fallback steps, and do not continue with local judgment.

5. Return to planning on mismatch.
Hand the work back to the main runbook planning flow with:
- the exact step that failed
- the exact observed mismatch
- the evidence that proved the mismatch
- what fact now needs user clarification or fresh reconnaissance

Execution may resume only after planning updates the runbook and the user approves the revised path.

6. Return to planning on interview deficit.
If the runbook has fewer than five user interview records, do not execute. Return to planning and require additional user questions before resuming.

## Evidence Rules

- Every executed step must have `#### 执行 @<name> YYYY-MM-DD HH:mm CST`.
- Prefer file paths, command snippets, exit status, endpoint status, and observable state changes.
- If evidence is unavailable, say exactly why and treat it as blocked work, not success.
