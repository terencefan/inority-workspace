# 示例文档

```dot
digraph G {
  graph [rankdir=LR, bgcolor="transparent", fontname="sans-serif"];
  node [fontname="sans-serif", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="sans-serif", color="#94a3b8", fontcolor="#94a3b8"];

  subgraph cluster_current {
    label="现状";
    color="#94a3b8";
    fontcolor="#475569";
    current [label="当前组件", fillcolor="#dbeafe"];
  }

  subgraph cluster_target {
    label="目标";
    color="#94a3b8";
    fontcolor="#475569";
    target [label="目标组件", fillcolor="#dcfce7"];
  }

  current -> target [label="演进"];
}
```
