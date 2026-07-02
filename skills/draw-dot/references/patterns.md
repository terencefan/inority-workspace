# DOT Patterns

Use these as starting points. Adapt labels and grouping to the real subject.

## Architecture Overview

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="#0b1220"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#e5e7eb", fillcolor="#0f172a"];
  edge [fontname="Noto Sans CJK SC", color="#64748b", fontcolor="#64748b"];

  user [label="用户 / 调用方", fillcolor="#1e3a8a"];

  subgraph cluster_entry {
    label="入口层";
    color="#64748b";
    fontcolor="#cbd5e1";
    gateway [label="API Gateway", fillcolor="#713f12"];
    web [label="Web / CLI", fillcolor="#713f12"];
  }

  subgraph cluster_core {
    label="核心域";
    color="#64748b";
    fontcolor="#cbd5e1";
    service_a [label="服务 A", fillcolor="#1e3a8a"];
    service_b [label="服务 B", fillcolor="#1e3a8a"];
  }

  subgraph cluster_data {
    label="数据层";
    color="#64748b";
    fontcolor="#cbd5e1";
    db [label="主数据库", fillcolor="#14532d"];
    cache [label="缓存", fillcolor="#14532d"];
    mq [label="消息队列", fillcolor="#14532d"];
  }

  user -> gateway;
  user -> web;
  gateway -> service_a;
  web -> service_b;
  service_a -> db;
  service_a -> cache;
  service_b -> mq;
}
```

## Request Or Data Flow

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="#0b1220"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#e5e7eb", fillcolor="#1e3a8a"];
  edge [fontname="Noto Sans CJK SC", color="#64748b", fontcolor="#64748b"];

  step_1 [label="接收请求"];
  step_2 [label="校验参数"];
  step_3 [label="读取状态"];
  step_4 [label="执行变更"];
  step_5 [label="返回结果"];

  step_1 -> step_2 -> step_3 -> step_4 -> step_5;
}
```

## State Machine

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="#0b1220"];
  node [fontname="Noto Sans CJK SC", shape=ellipse, style="filled", color="#64748b", fontcolor="#e5e7eb", fillcolor="#713f12"];
  edge [fontname="Noto Sans CJK SC", color="#64748b", fontcolor="#64748b"];

  pending [label="待处理"];
  running [label="执行中"];
  success [label="已完成"];
  failed [label="失败"];

  pending -> running [label="开始"];
  running -> success [label="成功"];
  running -> failed [label="失败"];
  failed -> pending [label="重试"];
}
```

## Current Vs Target

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="#0b1220"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#e5e7eb", fillcolor="#0f172a"];
  edge [fontname="Noto Sans CJK SC", color="#64748b", fontcolor="#64748b"];

  subgraph cluster_current {
    label="现状";
    color="#64748b";
    fontcolor="#cbd5e1";
    curr_entry [label="单入口服务", fillcolor="#1e3a8a"];
    curr_db [label="共享数据库", fillcolor="#14532d"];
    curr_ops [label="人工运维", fillcolor="#713f12"];
    curr_entry -> curr_db;
    curr_ops -> curr_entry;
  }

  subgraph cluster_target {
    label="目标";
    color="#64748b";
    fontcolor="#cbd5e1";
    tgt_gateway [label="统一入口", fillcolor="#713f12"];
    tgt_service_a [label="服务 A", fillcolor="#1e3a8a"];
    tgt_service_b [label="服务 B", fillcolor="#1e3a8a"];
    tgt_db_a [label="库 A", fillcolor="#14532d"];
    tgt_db_b [label="库 B", fillcolor="#14532d"];
    tgt_runbook [label="标准化 runbook", fillcolor="#0f172a"];
    tgt_gateway -> tgt_service_a -> tgt_db_a;
    tgt_gateway -> tgt_service_b -> tgt_db_b;
    tgt_runbook -> tgt_gateway;
  }
}
```

## Mindmap

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=TB, bgcolor="#0b1220"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#e5e7eb", fillcolor="#0f172a"];
  edge [fontname="Noto Sans CJK SC", color="#64748b", fontcolor="#64748b"];

  root [label="主题", fillcolor="#1e3a8a"];
  area_1 [label="维度一", fillcolor="#713f12"];
  area_2 [label="维度二", fillcolor="#713f12"];
  area_3 [label="维度三", fillcolor="#713f12"];

  leaf_11 [label="要点 1", fillcolor="#0f172a"];
  leaf_12 [label="要点 2", fillcolor="#0f172a"];
  leaf_21 [label="要点 1", fillcolor="#0f172a"];
  leaf_22 [label="要点 2", fillcolor="#0f172a"];
  leaf_31 [label="要点 1", fillcolor="#0f172a"];
  leaf_32 [label="要点 2", fillcolor="#0f172a"];

  root -> area_1;
  root -> area_2;
  root -> area_3;
  area_1 -> leaf_11;
  area_1 -> leaf_12;
  area_2 -> leaf_21;
  area_2 -> leaf_22;
  area_3 -> leaf_31;
  area_3 -> leaf_32;
}
```
