# 目录总纲 spec 模板

适用于 `docs/specs/README.md` 这类目录总纲文档。它不是普通索引页，而是该目录下 spec 集合的总纲 spec。

```md
# <目录主题>设计文档

> [!NOTE]
> 当前 spec 类型：目录总纲 spec

> 用一句话说明这个目录下的 spec 集合覆盖什么，以及当前根 spec 是哪一份。

## 背景与现状

### 背景

说明为什么当前需要为这个目录维护一份总纲 spec，而不是只堆文件名。

### 现状

说明当前 spec 集合如何分布、是否存在主线/兼容/历史混放，或者是否存在根 spec 缺口。

```dot
digraph CurrentState {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  current_root [label="当前根 spec", fillcolor="#dbeafe"];
  current_topic [label="当前专题 spec", fillcolor="#fef3c7"];
  current_legacy [label="历史兼容 spec", fillcolor="#fecaca"];

  current_root -> current_topic;
  current_topic -> current_legacy [style=dashed];
}
```

## 目标与非目标

### 目标

说明目录总纲要如何把根 spec、专题 spec、历史资料和推荐阅读路径组织清楚。

```dot
digraph TargetState {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  target_root [label="根 spec", fillcolor="#dbeafe"];
  target_topics [label="专题 spec", fillcolor="#fef3c7"];
  target_deprecated [label="deprecated", fillcolor="#fecaca"];

  target_root -> target_topics;
  target_topics -> target_deprecated [style=dashed];
}
```

### 非目标

明确这份 README 不负责替代单份专题 spec 的局部 contract，也不负责展开 runbook。

## 根 spec

### 当前根 spec

显式列出当前根 spec，并说明它冻结的系统级边界、真相源和目标态范围。

### 缺口与待建项

如果根 spec 尚未就位，写清计划文件名、覆盖范围和为什么现有专题 spec 不能代替它。

## 专题 spec

### 当前专题分组

按主题分组列出专题 spec；每条都要写职责说明，不要只堆路径。

### deprecated 分组

如果存在历史兼容文档，显式说明它们为什么在 `deprecated/`，以及它们不再承担什么 authority。

## 推荐阅读顺序

说明读者应该按什么顺序阅读根 spec、专题 spec 和历史资料。

```dot
digraph ReadingOrder {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  root [label="根 spec", fillcolor="#dbeafe"];
  topic [label="专题 spec", fillcolor="#fef3c7"];
  deprecated [label="deprecated", fillcolor="#fecaca"];

  root -> topic;
  topic -> deprecated [style=dashed];
}
```

## 相关文档

列出 README、runbook、实现仓库说明或其他非 spec 文档入口。

## 访谈记录

使用 [interview-record-template.md](./interview-record-template.md)。

## 参考资料

- [根 spec](./root-spec.md)
- [相关 README](../README.md)
```
