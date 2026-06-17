# Trace Spec 总纲设计文档

> [!NOTE]
> 当前 spec 类型：目录总纲 spec

> 这份总纲 spec 负责说明 trace 目录下当前主线、专题分组、历史兼容与推荐阅读顺序。

## 背景与现状

### 背景

当前目录已经同时存在根 spec、专题 spec 与历史兼容文档，需要一份目录级总纲来收口阅读路径与 authority 边界。

### 现状

当前目录下的主线、专题和历史兼容关系还需要通过 README 总纲统一说明。

```dot
digraph CurrentState {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  root [label="当前根 spec", fillcolor="#dbeafe"];
  topic [label="当前专题 spec", fillcolor="#fef3c7"];
  legacy [label="当前历史兼容 spec", fillcolor="#fecaca"];

  root -> topic;
  topic -> legacy [style=dashed];
}
```

## 目标与非目标

### 目标

这份 README 要把目录内的 spec 集合组织成清晰的总纲，而不是只做文件列表。

```dot
digraph TargetState {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="Noto Sans CJK SC"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  root [label="根 spec", fillcolor="#dbeafe"];
  topics [label="专题 spec", fillcolor="#fef3c7"];
  deprecated [label="deprecated", fillcolor="#fecaca"];

  root -> topics;
  topics -> deprecated [style=dashed];
}
```

### 非目标

这份 README 不替代任何单份专题 spec，也不展开执行步骤。

## 根 spec

### 当前根 spec

- `codex-claude-online-trace-spec.md` 冻结当前会话 trace authority。

### 缺口与待建项

- 当前没有新的根 spec 缺口；如后续切换主线，需要先在这里更新。

## 专题 spec

### 当前专题分组

- `litellm-canary-deployment-spec.md`：说明 LiteLLM companion deployment 边界。
- `codex-claude-offline-trace-data-plane-spec.md`：说明 trace 数据面与离线导出目标态。

### deprecated 分组

- `deprecated/` 下的文档只保留历史兼容语义，不再承担当前 authority。

## 推荐阅读顺序

先读根 spec，再读专题 spec，最后只在需要时回看 deprecated 文档。

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

- 目录下相关 runbook
- 仓库根 README

## 访谈记录

> Q：这个 README 只是目录说明，还是要当总纲 spec？
>
>
> A：要当总纲 spec。

收敛影响：`README.md` 需要按独立 spec 处理，而不是普通索引页。

> Q：总纲 README 要不要继续走 `specctl`？
>
>
> A：要，而且要单独的 validator。

收敛影响：需要给 README 总纲引入独立 validator 规则。

> Q：README 总纲是否需要单独 template？
>
>
> A：要。

收敛影响：需要新增 `readme-spec-template.md`。

> Q：README 总纲主要覆盖什么？
>
>
> A：覆盖这个文件夹下面的 spec 总纲。

收敛影响：README 应重点说明根 spec、专题 spec、deprecated 和阅读顺序。

> Q：README 总纲是否替代专题 spec 本体？
>
>
> A：不替代。

收敛影响：README 只负责目录级总纲，不复写单份专题 contract。

## 参考资料

- [根 spec](./codex-claude-online-trace-spec.md)
- [仓库 README](../README.md)
