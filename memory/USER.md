# USER.md

Personal preferences for collaborating with Terence.

## User Profile

- Name: Terence Fan
- What to call them: Terence
- Timezone: UTC+08:00

## Communication Preferences

- In every main-agent reply, begin with `Goal`, `Ambiguity`, and `Risk`.
- Determine the format by the host interface, not by the underlying runtime implementation.
- In terminal-hosted interfaces such as Codex CLI, render those three fields as plain-text aligned fields; do not use Markdown tables or box-drawing borders.
- In editor-hosted interfaces such as the VS Code plugin, render those three fields as a three-column Markdown table with `Title`, `Percent`, and `Desc`.
- In either format, `Ambiguity` and `Risk` use percentages, and the highest current risk is explained inline in the `Risk` description instead of a separate `当前最大风险` line.
- In the VS Code table format, keep `Desc` concise.
- When the interface preserves ANSI escapes, color the `Ambiguity` / `Risk` percentages by range: `0%-10%` green, `11%-40%` yellow, `41%-100%` red.
- In terminal-hosted interfaces such as Codex CLI, do not append textual level suffixes or trailing punctuation after the percentages; use color alone to distinguish severity.
- In CLI output, use a fixed separator so the description text for `Goal`, `Ambiguity`, and `Risk` starts in the same column on all three lines.
- In the VS Code table format, prepend a traffic-light prefix to the `Percent` value: `🟢 0%-10%`, `🟡 11%-40%`, and `🔴 41%-100%`.
- Keep the concrete CLI template in `.codex/references/reply-format-cli.md` and the VS Code template in `.codex/references/reply-format-vscode.md` rather than inline in this file.
- When presenting lists, prefer clearer hierarchy and more structured organization instead of flat lists.

## Writing Preferences

- In docs, keep blockquotes concise; prefer a single sentence, and if multiple sentences are necessary, split them across lines rather than packing them into one long quote.
- In global architecture or spec documents, avoid machine-local details such as local paths, current workstation context, or host-specific operational state; keep those in the appropriate `.codex/memory/` files instead.
- For metric naming in docs and specs, treat bare `duration` as milliseconds by default; avoid unit suffixes such as `_seconds` unless a different unit is intentionally required.

## Workflow Preferences

- Add preferences and recurring facts only when they are confirmed and useful.
- When a runbook shows rework and the lesson is reusable, record that lesson in the current day's `.codex/memory/dairy/YYYY-MM-DD.md`.
- After `git` commit and MR creation workflows, do not switch back to the main branch automatically.
- When Terence asks to submit or commit code, default to creating the MR in the same workflow for repositories where an MR can be created; do not stop after push unless blocked.
- When replacing a custom file-scan path with a mature CLI such as `rg`, prefer the tool's native semantics instead of reintroducing compatibility flags that preserve the old behavior.
