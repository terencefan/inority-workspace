---
name: retrospective
description: Use when the user asks for a retrospective, postmortem, 回顾, or 复盘 after a bug fix, refactor, incident, release, or delivery cycle. Produces a concise engineering review with outcomes, root causes, repair patterns, and concrete next checks.
---

# Retrospective

Use this skill after implementation work, bug fixing, refactors, UI iterations, or delivery cycles when the goal is to extract reusable lessons instead of just summarizing changes.

## Output Shape

Default to a short retrospective with these sections:
- Scope: what work or time window is being reviewed.
- What improved: concrete wins that should be repeated.
- What went wrong: concrete failures, regressions, or wasted cycles.
- Root causes: why the problems happened.
- Next guardrails: checks, refactors, or workflow changes to prevent repeats.

Keep the tone factual. Prefer specific examples over general process language.

## Workflow

1. Reconstruct the recent work.
Use the conversation, diffs, errors, and user feedback to identify the real milestones, regressions, and repairs.

2. Separate symptoms from causes.
Do not stop at surface statements like "it was buggy". Name the symptom, then the decision or assumption that caused it.

3. Capture reusable repair patterns.
When a fix generalizes, convert it into a concise pattern such as:
- symptom
- root cause
- repair pattern
- preventative check

4. Distinguish product issues from workflow issues.
Product issue examples: wrong API assumption, stale cache, layout bug.
Workflow issue examples: no mock-path validation, oversized file coupling, missing cache versioning.

5. End with concrete next checks.
Each retrospective should leave behind a small set of enforceable follow-ups, not vague advice.

## Heuristics

- Prefer 3 to 7 findings, not an exhaustive timeline.
- Group related failures if they share the same cause.
- If the work includes bugfixes, explicitly mention the test or validation gap that allowed them through.
- If the work includes refactors, call out coupling reduction, cache invalidation, and compatibility risks.
- If no major issue exists, say that directly and focus on what should be repeated.

## For Coding Work

When reviewing engineering work, favor these categories:
- API/data-shape mistakes
- state/cache invalidation mistakes
- render/layout coupling mistakes
- missing validation or fixture coverage
- oversized files or unclear ownership boundaries

If the repo uses local rules or skills for postmortems, update them when a lesson generalizes.

## Example Trigger Phrases

- "做一次复盘"
- "写个 postmortem"
- "帮我回顾这轮改动哪里做得好/不好"
- "总结这次 bugfix 的经验教训"
- "Use $retrospective on this delivery"
