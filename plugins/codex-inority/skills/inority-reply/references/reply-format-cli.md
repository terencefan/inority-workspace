# CLI Reply Format Template

Use this in terminal-hosted interfaces such as Codex CLI.

```text
<ANSI-yellow Goal>       <one-line current longrun objective>
<ANSI-yellow Ambiguity>  <🟢/🟡/🔴 ANSI-colored NN%> <brief note on what is still unclear in the longrun, or say none>
<ANSI-yellow Risk>       <🟢/🟡/🔴 ANSI-colored NN%> <highest current longrun risk inline, plus the practical impact>
```

Rules:

- Begin every main-agent reply with the three-row, borderless `Goal`, `Ambiguity`, and `Risk` label table, and make the rows describe the current longrun rather than the latest local action.
- Render only the three left-column labels in ANSI yellow and reset the color immediately after each label. Emit real ANSI escape sequences, not the literal text `ANSI-yellow` or backslash escape notation.
- Do not use Markdown table pipes, bullets, borders, or a colon separator in this label table.
- Pad the labels so all right-column content starts at the same display column.
- `Goal` content must stay plain text only; do not add a traffic light or percentage to the `Goal` row.
- `Ambiguity` and `Risk` must use percentages, and the highest current longrun risk should be explained inline in the `Risk` line.
- In CLI output, prefix the percentage with `🟢`, `🟡`, or `🔴` and do not append textual level suffixes such as `Low`, `Medium`, or `High`.
- Do not append trailing punctuation after the percentage.
- Use ANSI color on the light and percentage together only when the host reliably renders terminal escape sequences:
  - `<10%`: green
  - `10%-39%`: yellow
  - `>=40%`: red
