# <主题>设计文档

> [!NOTE]
> 当前 spec 类型：技术 spec

> 用一句话说明技术变更内容，以及它会影响哪些系统边界。

## 总览

### 背景

说明为什么需要这次变更，以及相关外部约束。

### 目标

说明这次改动要让系统达到什么状态。

```dot
digraph TargetState {
  rankdir=LR;
  graph [bgcolor="transparent", fontname="sans-serif"];
  node [fontname="sans-serif", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="sans-serif", color="#94a3b8", fontcolor="#94a3b8"];

  target_a [label="目标组件 A", fillcolor="#dbeafe"];
  target_b [label="目标组件 B", fillcolor="#fef3c7"];
  target_c [label="目标组件 C", fillcolor="#dcfce7"];

  target_a -> target_b -> target_c;
}
```

### 非目标

明确不打算解决的技术问题。

## 风险与红线

### 风险

- <风险项>

### 红线行为

> [!CAUTION]
> <明确不能突破的技术、数据、安全或运行边界>

## 边界与契约

### 稳定接口与调用边界

列出稳定的接口、输入输出、状态机、数据模型、ownership contract 或调用边界。

已确认的稳定前提直接写进这些块里；限制条件和禁做边界统一写到 `红线行为`。覆盖边界也可以按主题改成别的块名；重点是这整章仍然清楚表达边界和稳定契约。

## 架构总览

> 先建立端到端链路、组件关系或运行位置的整体模型。

必须放一张 fenced `dot` 图，并且这张图要同时体现：

- 架构组件的南北向层次
- `模块划分` 的东西向结构

```dot
digraph ArchitectureOverview {
  rankdir=TB;
  graph [bgcolor="transparent", fontname="sans-serif"];
  node [fontname="sans-serif", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="sans-serif", color="#94a3b8", fontcolor="#94a3b8"];

  subgraph cluster_ns {
    label="架构组件（南北向）";
    color="#94a3b8";
    fontcolor="#475569";
    external [label="外部入口层", fillcolor="#dbeafe"];
    gateway [label="接入 / 网关层", fillcolor="#fef3c7"];
    service [label="业务服务层", fillcolor="#dbeafe"];
    data [label="数据与基础设施层", fillcolor="#dcfce7"];
    external -> gateway -> service -> data;
  }

  subgraph cluster_ew {
    label="模块划分（东西向）";
    color="#94a3b8";
    fontcolor="#475569";
    moduleA [label="模块 A", fillcolor="#dbeafe"];
    moduleB [label="模块 B", fillcolor="#fef3c7"];
    moduleC [label="模块 C", fillcolor="#dcfce7"];
  }

  gateway -> moduleA [style=dashed];
  service -> moduleB [style=dashed];
  data -> moduleC [style=dashed];
}
```

> 当系统同时包含控制面和数据面时，优先按以下两个责任平面组织；不适用时再按真实层级替换。

### 控制面

#### <控制面逻辑层>

> [!NOTE]
> 职责：说明声明、协调、生命周期或策略职责。
>
> 具体组件：列出对应代码模块、API 资源、进程、Deployment、Service 或控制器。

说明控制面如何管理状态，以及它明确不处理哪些请求数据。

### 数据面

#### <数据面逻辑层>

> [!NOTE]
> 职责：说明请求、事件或数据的实际处理职责。
>
> 具体组件：列出对应代码模块、进程、Deployment、Service、Pod 或 Runtime。

说明数据路径、上下游连接和错误 ownership。同一组件兼具两个平面职责时，仅在这里描述其数据面部分。

## 模块划分

> 按东西向拆分模块、域或责任边界，说明系统在横向上如何组织。

### <模块一>

说明这个模块负责什么、与哪些上下游模块协作，以及它的边界是什么。

### <模块二>

说明这个模块负责什么、与哪些上下游模块协作，以及它的边界是什么。

### 方案设计

#### 接口与契约

说明 API、事件、配置或模块边界如何定义和变化。

#### 数据模型或存储变更

说明表结构、对象结构、索引、缓存或文件布局变化。

#### 失败处理与可观测性

说明异常路径、重试、日志、指标、追踪或告警策略。

#### 发布 / 迁移 / 兼容性

说明上线步骤、灰度方式、数据迁移和回滚策略。

## 方案对比

### <方案组一>对比

| 维度 | <方案 A> | <方案 B> |
|---|---|---|
| 首选结论 | 🟢 <推荐原因> | 🟡 <备选条件> |

> [!NOTE]
> 对比结论：<当前推荐方案、备选触发条件和不选择路径。>

## 验收标准

- [ ] ...
- [ ] ...

## 访谈记录

> [!IMPORTANT]
> 定稿前必须把以下占位内容替换为至少 5 轮真实用户问答。

> [!NOTE]
> Q：<第 1 轮真实问题>
>
> A：<第 1 轮真实回答>

收敛影响：<这轮问答改变的边界或决策>

> [!NOTE]
> Q：<第 2 轮真实问题>
>
> A：<第 2 轮真实回答>

收敛影响：<这轮问答改变的边界或决策>

> [!NOTE]
> Q：<第 3 轮真实问题>
>
> A：<第 3 轮真实回答>

收敛影响：<这轮问答改变的边界或决策>

> [!NOTE]
> Q：<第 4 轮真实问题>
>
> A：<第 4 轮真实回答>

收敛影响：<这轮问答改变的边界或决策>

> [!NOTE]
> Q：<第 5 轮真实问题>
>
> A：<第 5 轮真实回答>

收敛影响：<这轮问答改变的边界或决策>

## 参考资料

- 接口定义：`<path-to-api-contract>`
- 运维文档：`<path-to-runbook>`
