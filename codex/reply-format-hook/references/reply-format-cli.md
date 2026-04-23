# CLI Reply Format Template

Use this in terminal-hosted interfaces such as Codex CLI.

```text
Goal       : <one-line current objective>
Ambiguity  : <ANSI-colored NN%> <brief note on what is still unclear, or say none>
Risk       : <ANSI-colored NN%> <highest current risk inline, plus the practical impact>
```

Rules:

- Use the literal `: ` separator on all three lines so the description text starts in the same column.
- In CLI output, do not append textual level suffixes such as `Low`, `Medium`, or `High`.
- Do not append trailing punctuation after the percentage.
- Use ANSI color on the percentage only:
  - `0%-10%`: green
  - `11%-40%`: yellow
  - `41%-100%`: red
