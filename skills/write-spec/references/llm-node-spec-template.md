# llm 节点 spec 模板

适用于主要任务是冻结单个 LLM 节点、agent 节点或 prompt 驱动节点的 system prompt、user prompt、context 装配、输入输出契约、本地 reconcile 和状态写回边界的场景。`llm 节点 spec` 默认写目标状态 authority contract，不承担“现状说明书”职责。

```md
# <主题>设计文档

> [!NOTE]
> 当前 spec 类型：llm 节点 spec

> 用一句话说明这个 LLM 节点负责什么判定、生成或路由决策，以及它冻结了哪些 prompt / context / contract 边界。

## 背景与现状

### 背景

说明为什么这个 LLM 节点需要独立 spec，而不能继续散落在代码、prompt 和测试里。

### 现状

只写当前为什么需要这份 authority spec，不展开实现细节罗列。

```dot
digraph CurrentNeed {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  scattered [label="代码 / prompt / 测试分散", fillcolor="#dbeafe"];
  drift [label="contract 易漂移", fillcolor="#fecaca"];
  spec [label="需要目标态 authority spec", fillcolor="#dcfce7"];

  scattered -> drift -> spec;
}
```

## 目标与非目标

### 目标

说明这份 spec 要冻结哪些 prompt、context、contract、state 语义和评审边界。

```dot
digraph TargetLlmNode {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  prompts [label="冻结 prompt", fillcolor="#fef3c7"];
  context [label="冻结 context", fillcolor="#dbeafe"];
  contract [label="冻结输出与本地规则", fillcolor="#dcfce7"];

  prompts -> context -> contract;
}
```

### 非目标

明确不在本轮 spec 里处理的其他节点、前端展示或整条工作流问题。

## 风险与红线

### 风险

- <风险项>

### 红线行为

> [!CAUTION]
> 不允许把未验证的上游事实写成既成 prompt 或 context contract。

## Prompt 设计

> 对 `llm 节点 spec`，prompt 是一级公民。这里必须显式包含 `system prompt` 和 `user prompt` 两个三级标题；validator 会按标题名直接校验。

### system prompt

> 这一节只写目标状态下，system prompt 应该如何冻结任务目标、证据边界、禁止项和输出形状。

给出目标状态 system prompt 原文示例。默认必须用 fenced code block 内嵌完整原文，不要只写摘要或转述；必要时再在 code block 后补充说明：

- 它负责什么
- 它禁止什么
- 它要求 LLM 返回什么

### user prompt

> 这一节只写目标状态下，user prompt 应该承载什么运行时证据。

给出目标状态 user payload 示例，并包含生产过程图。展示 `user_payload` JSON 时，默认给每个关键字段加行内注释，说明字段来源、用途、authority evidence 边界或可选性；不要给无注释的裸 JSON。

```dot
digraph UserPromptProduction {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  upstream [label="上游 state", fillcolor="#dbeafe"];
  compact [label="压缩 / 过滤 / 映射", fillcolor="#fef3c7"];
  payload [label="user_payload", fillcolor="#dcfce7"];
  llm [label="chat_json user prompt", fillcolor="#fecaca"];

  upstream -> compact -> payload -> llm;
}
```

### prompt contract

> 这一节回答“system prompt 和 user prompt 合起来，到底冻结了什么 prompt-level contract”。

只写目标状态下：

- system prompt 负责什么
- user prompt 负责什么
- 两者合起来要求什么输出 contract

## Context 设计

> 对 `llm 节点 spec`，context 是一级公民。这里回答“节点到底喂了什么证据，证据是怎么装配出来的”。

### 上游 context

说明目标状态下，节点应该从哪些上游 state 字段读取证据。

### context 装配

说明目标状态下，证据如何被压缩、筛选、去重和派生。

### context contract

用带行内注释的 JSON block 写清目标状态下真正进入 LLM 的 context 形状，以及哪些字段是 authority evidence、哪些字段只是示意或可选；不要只给无注释字段清单。

## 边界与契约

建议在这一章内部固定按下面顺序组织：

- `输出契约`
- `字段映射`
- `本地规则边界`
- `失败契约`

### 输出契约

只写目标输出 contract，尽量收敛为单一 authority object，并写清字段语义。

### 字段映射

| 上游来源 | prompt / context 字段 | 输出字段 | 语义说明 |
|---|---|---|---|
| `state.foo` | `user_payload.bar` | `result.baz` | <一句话说明> |

### 本地规则边界

说明目标状态下：

- 本地 reconcile 允许改什么
- 本地 reconcile 禁止改什么
- deterministic 规则覆盖顺序是什么

### 失败契约

说明目标状态下：

- 缺输入时怎么失败
- LLM 调用失败时怎么失败
- LLM 输出结构不合法时怎么失败
- 成功态和失败态哪些字段绝不能混用

## 验收标准

- [ ] 文档显式区分 `system prompt`、`user prompt`、context contract、输出 contract 和本地规则边界。
- [ ] `user prompt` 章节包含生产过程图。
- [ ] 评审者可以仅凭文档判断目标态 prompt、context、输出和失败路径是否稳定。

## 访谈记录

> [!NOTE]
> Q：这份 spec 是否只覆盖单个 LLM 节点？
>
> A：是，只覆盖单个 LLM 节点。

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
> A：要，不能再把 context 混在通用架构章节里。

收敛影响：把 llm spec 的 H2 主线改成 prompt / context / contract。

> [!NOTE]
> Q：llm spec 是否只写目标状态？
>
> A：是，只写目标状态就行了。

收敛影响：llm spec 不再默认保留“当前实现 / 兼容期约束”三视图。

## 参考资料

- [节点实现](./node.py)
- [prompt 定义](./prompt.py)
```
