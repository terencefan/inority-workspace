# 示例 llm 节点设计文档

> [!NOTE]
> 当前 spec 类型：LLM 节点 spec

> 用一句话说明这个 LLM 节点负责什么判定，以及它冻结了哪些 prompt、context 与状态边界。

## 背景与现状

### 背景

说明为什么这个节点需要独立 spec。

### 现状

说明当前需要一份目标态 authority spec 来冻结 llm contract。

```dot
digraph CurrentNeed {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];
  a [label="代码 / prompt / 测试分散", fillcolor="#dbeafe"];
  b [label="contract 易漂移", fillcolor="#fecaca"];
  c [label="需要目标态 authority spec", fillcolor="#dcfce7"];
  a -> b -> c;
}
```

## 目标与非目标

### 目标

说明要冻结的 prompt、context 和 contract。

```dot
digraph TargetNode {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];
  prompts [label="prompt", fillcolor="#fef3c7"];
  context [label="context", fillcolor="#dbeafe"];
  contract [label="contract", fillcolor="#dcfce7"];
  prompts -> context -> contract;
}
```

### 非目标

不覆盖其他节点。

## 风险与红线

### 风险

- target contract 继续漂移。

### 红线行为

> [!CAUTION]
> 不允许把未验证数据写成 prompt 或 context contract。

## Prompt 设计

### system prompt

给出目标状态下的 system prompt 原文示例；默认用 fenced code block 内嵌完整原文，不要只写摘要。

### user prompt

给出目标状态下的 user payload 示例；展示 JSON 时默认给关键字段加行内注释，说明字段来源、用途和 authority evidence 边界。

```dot
digraph UserPromptProduction {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];
  upstream [label="上游 state", fillcolor="#dbeafe"];
  map [label="压缩 / 映射", fillcolor="#fef3c7"];
  payload [label="user_payload", fillcolor="#dcfce7"];
  llm [label="LLM user prompt", fillcolor="#fecaca"];
  upstream -> map -> payload -> llm;
}
```

### prompt contract

说明目标状态下，prompt 两段合起来冻结的 contract。

## Context 设计

### 上游 context

说明目标状态下节点从哪些上游 state 读取证据。

### context 装配

说明目标状态下如何装配 context。

### context contract

说明目标状态下进入 LLM 的 context 形状；展示 JSON 时默认带行内注释。

## 边界与契约

### 输出契约

说明目标状态下的输出 contract。

### 字段映射

说明上游字段、prompt/context 字段和输出字段之间的映射。

### 本地规则边界

说明目标状态下 deterministic reconcile 的边界。

### 失败契约

说明目标状态下的失败方式。

## 验收标准

- [ ] 包含 `Prompt 设计` 章节
- [ ] 包含 `Context 设计` 章节
- [ ] `user prompt` 章节包含生产过程图

## 访谈记录

> [!NOTE]
> Q：这份 spec 是否只覆盖单个节点？
>
> A：是，只覆盖单个 llm 节点。

收敛影响：避免范围漂移到整条工作流。

> [!NOTE]
> Q：system prompt 是否必须单独成节？
>
> A：必须。

收敛影响：把 system prompt 章节提升成硬约束。

> [!NOTE]
> Q：user prompt 是否必须单独成节？
>
> A：必须。

收敛影响：把 user prompt 章节提升成硬约束。

> [!NOTE]
> Q：context 是否要作为一级公民单独成节？
>
> A：要。

收敛影响：把 llm spec 的主线改成 prompt / context / contract。

> [!NOTE]
> Q：llm spec 是否只写目标状态？
>
> A：是，只写目标状态就行了。

收敛影响：reference llm spec 也按目标态 authority 文档来写。

## 参考资料

- [节点实现](./node.py)
- [prompt 定义](./prompt.py)
