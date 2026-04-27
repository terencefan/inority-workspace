# USER.md

Personal preferences for collaborating with Terence.

## User Profile

- Name: Terence Fan
- What to call them: Terence
- Timezone: UTC+08:00

## Communication Preferences

- Unless Terence explicitly asks otherwise, prefer replying and writing workspace docs in Chinese.
- `Goal`, `Ambiguity`, and `Risk` should describe the current longrun state, not the immediate local step or the most recent single tool action.
- Keep reply-format runtime details such as host detection, template selection, columns, alignment, and ANSI rendering in the `inority-reply` hook resources instead of duplicating them in `USER.md`.
- When presenting lists, prefer clearer hierarchy and more structured organization instead of flat lists.
- When ambiguity exceeds `10%`, stop and ask the user instead of proceeding.
- When multiple implementation paths would materially change behavior, scope, or workload, ask the user to choose instead of deciding silently.
- Keep questions short and prefer closed options over open-ended prompts.
- In fault analysis documents, every excluded cause found during investigation must be written into the document together with the exclusion step and exclusion reason; do not leave excluded causes only in chat replies.
- In fault analysis documents, prefer `侦察结论` over `关键结果`, and start each major conclusion subsection with one concise blockquote sentence.
- In fault analysis documents, every `侦察结论` subsection should include a concise `可复现方法`; if it was missing in the first draft, rerun a minimal read-only repro and write that method back into the same subsection.

## Writing Preferences

- In docs, keep blockquotes concise; prefer a single sentence, and if multiple sentences are necessary, split them across lines rather than packing them into one long quote.
- In global architecture or spec documents, avoid machine-local details such as local paths, current workstation context, or host-specific operational state; keep those in the appropriate `.codex/memory/` files instead.
- For metric naming in docs and specs, treat bare `duration` as milliseconds by default; avoid unit suffixes such as `_seconds` unless a different unit is intentionally required.
- When diagrams use numeric labels or step numbers, order them from left to right first, then top to bottom.

## Workflow Preferences

- Add preferences and recurring facts only when they are confirmed and useful.
- When a runbook shows rework and the lesson is reusable, record that lesson in the current day's `.codex/memory/dairy/YYYY-MM-DD.md`.
- `tefa` can be Terence's personal alias / local context label; do not automatically treat the token itself as a workspace-wide environment term unless the active project explicitly defines it that way.
- When storing long-term memory, keep facts concise and avoid extended analysis.
- Prefer large categories plus bullet points over deep heading trees in long-term memory files.
- Default to starting local services in WSL instead of directly on the Windows host unless Terence explicitly asks otherwise.
- For WSL elevation or system-level installation, prefer `wsl -u root` over interactive `sudo` with the current user.
- After `git` commit and MR creation workflows, do not switch back to the main branch automatically.
- When Terence asks to submit or commit code, default to creating the MR in the same workflow for repositories where an MR can be created; do not stop after push unless blocked.
- In runbook execution, if the authority still requires a final independent read-only recon, do not stop before that final复核 is completed or explicitly blocked.
- If enterprise Gitee PR creation returns `401`, remind Terence to log in again in Chrome before retrying the automation flow.
- For `inority-workspace`, default code-submission workflows to the `main` branch and run `git pull --rebase` before `git push`.
- When replacing a custom file-scan path with a mature CLI such as `rg`, prefer the tool's native semantics instead of reintroducing compatibility flags that preserve the old behavior.
- Daily note files under `.codex/memory/dairy/*.md` are approved for direct non-destructive edits without asking first; still ask before deleting, archiving, or moving diary files.
- When deleting workspace files, prefer moving them under `/home/fantengyuan/workspace/.recycle/` with their relative path preserved instead of permanently removing them.
- `runctl` and `specctl` are approved for direct execution without asking first.
- Default runbook storage to `inority-workspace/handbook/runbook/` unless the user chooses a different location.
- Use date-partitioned runbook directories in the form `inority-workspace/handbook/runbook/YYYY-MM-DD/`.
- For runbook `dot` diagrams in the handbook, target dark-mode-friendly output: transparent backgrounds, same-type nodes sharing colors, rounded rectangles by default, and color chosen by lowering brightness instead of washing everything out.
- When planning or revising runbooks, if state-changing actions touch different machine layers such as `dev3`, canary hosts, and VM / guest nodes, split them into separate numbered steps instead of combining them into one item.
