---
name: runbook
description: Use when the user asks for a runbook, 执行手册, rollout playbook, SOP, production-grade delivery plan, or wants a full plan-and-execute workflow with fresh reconnaissance, ambiguity gating, evidence capture, and a required solo/collaboration choice before execution.
---

# Runbook

Use this skill as the primary runbook surface. Planning lives here. Execution is delegated to `../runbook-executor/SKILL.md` and acceptance is delegated to `../runbook-acceptor/SKILL.md`.

Before generating the plan, load:
- `references/runbook-template.md` as the only output scaffold and filling rulebook

Do not generate an ad-hoc structure when the template is available.

## Planning Gates

1. Perform fresh reconnaissance first.
Treat live inspection as the source of truth. Inspect the current repo, runtime, service state, config, endpoints, logs, or environment directly. Existing docs or prior conversation may be used only as historical hints, never as current-state truth.

2. Require ambiguity and risk below `10%`.
Any uncertainty, conflicting evidence, or more than one viable implementation path counts as ambiguity. If ambiguity or risk exceeds `10%`, stop and ask the user before finalizing the plan.

3. Require at least five user interviews.
An approved runbook must contain at least five user Q/A pairs in `## 访谈记录`. If fewer than five interviews exist, planning is incomplete and must continue.

4. Ask questions in the required format.
Avoid open-ended questions by default. Use exactly one question followed by numbered options and reasons. Every question must offer at least two concrete alternatives for comparison, and each option must include its reason. When one option is clearly better, put it first and make that recommendation explicit in the reason. Only when the answer space truly cannot be enumerated may you add `3. 其他`, but even then you must still present at least two concrete options first.

```text
问题：<需要用户决定的点>
1. <选项标题>
理由：<为什么选这个>
2. <选项标题>
理由：<为什么选这个>
3. 其他
理由：<仅在必须开放时才提供，并说明边界>
```

5. Draw both current and target with dot.
`## 现状` and `## 目标` must each include a `dot` code block. The current-state diagram must be derived from fresh reconnaissance done in this turn.
When drawing runbook `dot` graphs, target the dark-mode handbook renderer: keep the background explicitly transparent via graph attributes, prefer rounded rectangles, and use dark-safe colors by lowering brightness first rather than washing everything into gray. Keep some color identity, but avoid bright neon fills. Apply the same color to same-kind nodes so category groupings remain visually obvious.

6. Require the runbook validator to pass before execution admission.
Run `python scripts/validate_runbook.py <runbook.md>` against the final planning artifact. Do not ask for execution handoff and do not enter execution mode unless the validator exits `0`.

## Planning Workflow

1. Reconstruct the live current state.
Collect direct evidence first. Quote commands, live responses, file paths, process status, or code locations that prove the current state.

2. Run the interview loop.
When intent, scope, ownership, cutover choice, rollback choice, acceptance bar, fallback path, or operational boundary is unclear, ask the user. Do not compress the user's answer into only a numeric choice in the archive; record the actual content in `## 访谈记录`. Keep asking until the runbook contains at least five user Q/A pairs.
Format `## 访谈记录` as grouped三级标题: one `### 访谈 N - <topic>` per interview, then put `Q:` and `A:` on their own lines.
In each `A:`, keep only the concrete answer content. Do not write wrapper text such as `用户选择 1` or `用户选择 2` before the real answer.

3. Build the runbook against the template.
Load `references/runbook-template.md`, keep its section order, and fill every required section, including `背景与现状`, `目标与非目标`, `风险与收益`, `红线行为`, `访谈记录`, `思维脑图`, `执行计划`, `执行记录`, `最终验收`, and `参考文献`.
In `## 参考文献`, use Markdown links only; keep raw commands in the planning sections rather than the reference list.
Do not emit a leading `Rules` block or any template meta-instructions in the final runbook body.
Treat runbook headings as a whitelist, not a pattern playground: only the approved `##` titles, approved fixed `###` titles, step titles `### 步骤 N - ...`, and approved `#### 执行/验收` forms may appear.
`## 思维脑图` must be a `dot` graph with one brain root, at least two first-level categories, and at least two second-level conclusions under each category.
If the current interview record cannot support that structure honestly, planning is incomplete and must continue interviewing before execution admission.
For all runbook `dot` graphs, use consistent styling defaults such as explicitly transparent graph backgrounds, rounded rectangles, dark-safe mid-saturation colors with restrained brightness, and same-color treatment for same-kind nodes.

4. Make the steps executable and acceptable.
In `## 执行计划`, each step must have:
- a stable step title
- `#### 执行` with exact commands or exact actions
- `#### 验收` with exact validation commands or checks

5. Pre-allocate the execution record.
In `## 执行记录`, create the same step titles in the same order. Leave placeholders when execution has not happened yet.
Before execution starts, keep placeholder subheadings unsigned:
- `#### 执行`
- `#### 验收`
When real evidence is archived, replace them with signed subheadings:
- `#### 执行 @<name> YYYY-MM-DD HH:mm CST`
- `#### 验收 @<name> YYYY-MM-DD HH:mm CST`

6. Run the admission validator.
After the runbook body is complete, run:

```text
python scripts/validate_runbook.py <runbook.md>
```

If the validator fails, stay in planning mode, read the reported `code / line / content` diagnostics, fix the runbook, and rerun it until it passes.

7. Own every replanning loop.
If execution or acceptance finds that the live scene does not match the plan, planning mode must take control again. Re-run reconnaissance or ask the user as needed, update the runbook, and only then hand the revised runbook back to execution.

8. Refuse execution when interviews are insufficient.
Do not hand the runbook to execution unless `## 访谈记录` contains at least five user Q/A pairs. If the count is lower, return to planning, ask more questions, and revise the runbook first.

## Execution Mode Choice

Once the plan is complete, ask:

```text
问题：执行模式选哪个？
1. Solo
理由：主 agent 直接推进执行与验收，最终执行签名用 @吕布。
2. Collaboration
理由：主 agent 负责编排；执行由武将 subagent 负责，验收由文官 subagent 负责。
```

Do not start execution before the user answers.
Do not ask this question until the validator has passed for the current runbook revision.

## Execution Routing

### Solo

- Main agent executes and validates directly.
- Sign the execution close-out as `@吕布`.
- Use `../runbook-executor/SKILL.md` and `../runbook-acceptor/SKILL.md` as behavioral contracts even when the main agent performs both roles itself.

### Collaboration

Use one Three Kingdoms roster consistently:
- Wei default: leader `@曹操`, executor general `@张辽`, acceptor official `@荀彧`
- Shu fallback: leader `@刘备`, executor general `@赵云`, acceptor official `@诸葛亮`
- Wu fallback: leader `@孙权`, executor general `@甘宁`, acceptor official `@鲁肃`

Default to Wei unless the user asks for another faction.

Execution rules:
- Main agent acts as the faction leader and orchestrator.
- Delegate implementation to `../runbook-executor/SKILL.md`.
- Delegate acceptance to `../runbook-acceptor/SKILL.md`.
- Keep the execution record aligned with the plan one-to-one.

## Output Contract

- Planning output must contain both `## 执行计划` and `## 执行记录`.
- Planning output must pass `python scripts/validate_runbook.py <runbook.md>` before execution admission.
- Execution output must fill `## 执行记录` with evidence while preserving the step mapping from the plan.
- Planning output must not prefill signature placeholders before execution or acceptance has actually happened.
- Execution and acceptance evidence must be recorded under signed subheadings in the exact format `@<name> YYYY-MM-DD HH:mm CST`.
- Execution or acceptance is not allowed to repair planning gaps in place. Any live mismatch must send the work back to planning first.

## Postmortem

- Symptom: planning-stage runbooks looked like partially executed artifacts because `执行记录` already contained signed execution/acceptance headings.
- Root cause: the template mixed execution-time evidence format into pre-execution placeholders.
- Repair pattern: keep planning placeholders unsigned as `#### 执行` / `#### 验收`, and add signatures only when real execution or acceptance evidence is archived.
- Preventative check: when reviewing a newly generated runbook before execution starts, scan `## 执行记录`; if any line already contains `@<name> YYYY-MM-DD HH:mm CST`, the planning output is wrong.
- Symptom: validator failure was non-actionable because it only returned a generic rule message with no location.
- Root cause: the validator emitted rule-level failures but did not attach the failing line or original content.
- Repair pattern: print structured diagnostics with `code / line / content`, and expose the same data via `--json` for automated planning repair loops.
- Preventative check: when adding a new validator rule, verify one negative test prints enough detail for the planner to patch the exact line without rereading the whole runbook.
- Symptom: planning output looked structurally correct to humans, but headings and mind maps were still too free-form for reliable execution admission.
- Root cause: heading rules were implicit rather than whitelisted, and `思维脑图` used loose bullet structure instead of a machine-checkable graph form.
- Repair pattern: validate headings with an explicit whitelist, and require `思维脑图` to be a rooted `dot` tree: `brain -> category -> conclusion`, with at least two categories and at least two conclusions per category.
- Preventative check: keep one negative test for an illegal heading and one negative test for an under-expanded or malformed mindmap tree; both must fail before shipping validator changes.
- Symptom: generated runbook diagrams still looked white-backed and visually harsh in the dark handbook even though the template claimed dark-mode support.
- Root cause: the template only set a top-level transparent background hint and still used overly saturated accent fills, so renderer defaults and bright fills dominated the result.
- Repair pattern: set graph transparency explicitly in the graph attributes, keep rounded rectangles, and standardize on a muted low-saturation palette with same-kind nodes sharing one fill.
- Preventative check: when updating any runbook `dot` example, inspect the graph block itself for explicit transparent graph attributes and verify there are no vivid high-saturation fills or mixed colors for the same node class.
