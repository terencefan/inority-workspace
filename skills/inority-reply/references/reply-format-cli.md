# CLI Reply Format Template

Use this in terminal-hosted interfaces such as Codex CLI.

```text
Goal       : <one-line current longrun objective>
Ambiguity  : <🟢/🟡/🔴 ANSI-colored NN%> <brief note on what is still unclear in the longrun, or say none>
Risk       : <🟢/🟡/🔴 ANSI-colored NN%> <highest current longrun risk inline, plus the practical impact>
```

Rules:

- Begin every main-agent reply with `Goal`, `Ambiguity`, and `Risk`, and make them describe the current longrun rather than the latest local action.
- Use the literal `: ` separator on all three lines so the description text starts in the same column.
- `Ambiguity` and `Risk` must use percentages, and the highest current longrun risk should be explained inline in the `Risk` line.
- In CLI output, prefix the percentage with `🟢`, `🟡`, or `🔴` and do not append textual level suffixes such as `Low`, `Medium`, or `High`.
- Do not append trailing punctuation after the percentage.
- Use ANSI color on the light and percentage together:
  - `<10%`: green
  - `10%-39%`: yellow
  - `>=40%`: red
