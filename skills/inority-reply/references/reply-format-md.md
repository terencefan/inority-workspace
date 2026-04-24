# Markdown Reply Format Template

Use this in editor-hosted interfaces such as the VS Code plugin or Cursor.

```md
| Title | Percent | Detail |
| --- | --- | --- |
| Goal | - | <一句话当前 longrun 目标> |
| Ambiguity | <🟢/🟡/🔴 NN%> | <简洁说明当前 longrun 还有什么不明确；如果没有就写无> |
| Risk | <🟢/🟡/🔴 NN%> | <简洁说明当前最大 longrun 风险及其实际影响> |
```

Rules:

- Begin every main-agent reply with `Goal`, `Ambiguity`, and `Risk`, and make them describe the current longrun rather than the latest local action.
- `Ambiguity` and `Risk` must use percentages, and the highest current longrun risk should be explained inline in the `Risk` row.
- Use `🟢 <10%`, `🟡 10%-39%`, and `🔴 >=40%` as the default thresholds.
