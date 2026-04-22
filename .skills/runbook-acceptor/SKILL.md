---
name: runbook-acceptor
description: Use when the user has an approved runbook and needs the acceptance role only. Verifies each planned step against the approved acceptance instructions, archives acceptance evidence, and returns to planning immediately if the live environment does not match the approved runbook.
---

# Runbook Acceptor

Use this skill only after an approved runbook exists. Read `../runbook-executor/references/execute-template.md` and preserve the approved step titles.

## Scope

- Own `#### 验收` only.
- Do not own `#### 执行`.
- Do not ask new planning questions.
- Do not perform replanning.

## Preconditions

- Confirm that `## 执行计划` exists.
- Confirm that `## 执行记录` exists or create it from the plan.
- Confirm that the current step has explicit acceptance instructions.
- Confirm that `## 访谈记录` contains at least five user Q/A pairs.
- Confirm that `python ../runbook/scripts/validate_runbook.py <runbook.md>` has passed for the current runbook revision.
- Treat acceptance as a closed world. Do not do new reconnaissance and do not revise the plan inside acceptance mode.

## Role Rules

### Solo

- The main agent may use this skill as its acceptance-role contract.
- Record acceptance evidence under `#### 验收`.
- Final solo close-out is signed by the main runbook flow as `@吕布`.

### Collaboration

- Use a文官 identity in the archived record.
- Wei default acceptor: `@荀彧`
- Shu fallback acceptor: `@诸葛亮`
- Wu fallback acceptor: `@鲁肃`

## Acceptance Workflow

1. Copy the step titles exactly.
Reuse the exact `### 步骤 N - ...` titles from the approved plan.

2. Validate independently.
Check the acceptance instructions independently. Do not let execution evidence alone stand in for acceptance.

3. Archive acceptance evidence, not conclusions.
Record validation commands, observed outputs, endpoint status, test results, file inspections, or screenshots. Summaries are allowed, but evidence must remain concrete.
Archive the evidence under a signed subheading in the exact format:
- `#### 验收 @<name> YYYY-MM-DD HH:mm CST`

4. Stop on mismatch.
If the live environment, prerequisites, data shape, or acceptance bar does not match the plan, stop immediately. Do not patch the plan, do not relax the acceptance bar, and do not continue with local judgment.

5. Return to planning on mismatch.
Hand the work back to the main runbook planning flow with:
- the exact step that failed acceptance
- the exact observed mismatch
- the evidence that proved the mismatch
- what fact now needs user clarification or fresh reconnaissance

Acceptance may resume only after planning updates the runbook and the user approves the revised path.

6. Return to planning on interview deficit.
If the runbook has fewer than five user interview records, do not accept. Return to planning and require additional user questions before resuming.

## Evidence Rules

- Every accepted step must have `#### 验收 @<name> YYYY-MM-DD HH:mm CST`.
- Prefer validation commands, endpoint status, test names, diff checks, and observable state checks.
- If evidence is unavailable, say exactly why and treat it as blocked work, not success.
