---
name: inority-clarify
description: Use when the active skill needs to ask the user a focused clarification question, confirm a path or option, resolve materially different choices, or verify a fact before continuing. This skill governs user-facing clarification rounds for specs, runbooks, and other planning work.
---

# Inority Clarify

Use this skill when the current task cannot safely continue without asking the user to clarify a fact, choose a path, confirm a boundary, or approve one option over another.

This skill is the shared clarification surface for other skills. It does not own the parent artifact. The caller still owns:

- which document or plan is being updated
- which domain-specific constraints apply
- how answers are written back into the parent artifact

## Use This Skill When

- uncertainty is still materially affecting scope, design, risk, acceptance, or execution shape
- multiple viable options exist and different choices would change downstream work
- the agent needs the user to confirm a path rather than letting the model decide silently
- current facts are incomplete, stale, contradictory, or likely wrong
- the active skill requires real user Q/A before the artifact can be considered converged

Do not use this skill for:

- read-only reconnaissance against hosts, systems, or the web
- internal reasoning that can be resolved safely from local context
- formatting or rewriting an already-settled answer without asking the user anything new

## Clarification Loop

1. State why clarification is needed now.
2. Name the current goal, the unresolved ambiguity, and the highest downstream risk.
3. Ask exactly one question for this round.
4. Keep the round scoped to one dimension, such as:
   - `goal`
   - `non-goal`
   - `fact`
   - `path selection`
   - `risk`
   - `rollback`
   - `acceptance`
5. When helpful, present `2-4` mutually exclusive options instead of an open-ended prompt.
6. After each option, add one short reason so the tradeoff is legible.
7. Once the user answers, hand control back to the parent skill to update the artifact or continue planning.

## Question Rules

- Prefer one question per round.
- Prefer closed options over open-ended prompts when the real choice set is already visible.
- Do not hide a material decision inside vague wording such as “确认一下” or “看下怎么做”.
- Do not silently choose between materially different paths on the user's behalf.
- If the answer would change implementation, rollout, acceptance, or risk posture, escalate it to the user explicitly.
- If the parent skill already has an artifact-specific interview section, preserve that artifact's native record format instead of inventing a new one here.

## Write-back Contract

When the parent artifact requires real user interview records:

- only write back real user answers from this round
- do not fabricate Q/A to satisfy a minimum-count rule
- keep the parent artifact's native schema for Q/A shape, headings, timestamps, or impact lines
- if the user chose among numbered options, record the chosen option's full meaning rather than only the option number

## Stop Conditions

Stop using this skill for the current round once either condition is true:

- the user has answered the question and the ambiguity for that dimension is resolved enough for the parent skill to proceed
- the user answer exposes a new blocker or contradiction that requires the parent skill to re-plan before asking the next question
