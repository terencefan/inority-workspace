# CLI Reply Format Template

Use this stable Markdown table in terminal-hosted interfaces such as Codex CLI.

| Signal | Level | Current longrun assessment |
| --- | --- | --- |
| Goal | — | <one-line current longrun objective> |
| Ambiguity | <🟢/🟡/🔴 NN%> | <what is still unclear in the longrun, or `none`> |
| Risk | <🟢/🟡/🔴 NN%> | <highest current longrun risk and practical impact> |

Rules:

- Begin every main-agent reply with this three-row table, and make the rows describe the current longrun rather than the latest local action.
- Keep the table syntactically valid Markdown; do not depend on ANSI color or terminal column padding.
- `Goal` content must stay plain text only; do not add a traffic light or percentage to the `Goal` row.
- `Ambiguity` and `Risk` must use percentages, and the highest current longrun risk should be explained inline in the `Risk` line.
- In CLI output, prefix the percentage with `🟢`, `🟡`, or `🔴` and do not append textual level suffixes such as `Low`, `Medium`, or `High`.
- Do not append trailing punctuation after the percentage.
- Never emit ANSI escape sequences in assistant replies. Render labels and indicator emojis as plain Markdown, including in terminal-hosted clients.
