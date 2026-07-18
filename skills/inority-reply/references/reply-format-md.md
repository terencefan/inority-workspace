# Markdown Reply Format Template

Use this in editor-hosted interfaces such as Codex Desktop, the VS Code plugin, or Cursor.

```text
Goal       : <one-line current longrun objective>
Ambiguity  : <🟢/🟡/🔴 NN%> <brief note on what is still unclear in the longrun, or say none>
Risk       : <🟢/🟡/🔴 NN%> <highest current longrun risk inline, plus the practical impact>
```

Rules:

- Begin every main-agent reply with `Goal`, `Ambiguity`, and `Risk`, and make them describe the current longrun rather than the latest local action.
- For Markdown/editor hosts, wrap the three-line header in a fenced `text` code block so alignment stays stable.
- `Goal` must stay plain text only; do not add a traffic light or percentage to the `Goal` line.
- `Ambiguity` and `Risk` must use percentages, and the highest current longrun risk should be explained inline in the `Risk` line.
- Use `🟢 <10%`, `🟡 10%-39%`, and `🔴 >=40%` as the default thresholds.
- Do not rely on ANSI color in Markdown/editor-hosted surfaces.
