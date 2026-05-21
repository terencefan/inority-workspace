# DOT Patterns

Use these as starting points. Adapt labels and grouping to the real subject.

## Architecture Overview

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="transparent"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  user [label="用户 / 调用方", fillcolor="#dbeafe"];

  subgraph cluster_entry {
    label="入口层";
    color="#94a3b8";
    fontcolor="#475569";
    gateway [label="API Gateway", fillcolor="#fef3c7"];
    web [label="Web / CLI", fillcolor="#fef3c7"];
  }

  subgraph cluster_core {
    label="核心域";
    color="#94a3b8";
    fontcolor="#475569";
    service_a [label="服务 A", fillcolor="#dbeafe"];
    service_b [label="服务 B", fillcolor="#dbeafe"];
  }

  subgraph cluster_data {
    label="数据层";
    color="#94a3b8";
    fontcolor="#475569";
    db [label="主数据库", fillcolor="#dcfce7"];
    cache [label="缓存", fillcolor="#dcfce7"];
    mq [label="消息队列", fillcolor="#dcfce7"];
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
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="transparent"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#dbeafe"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

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
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="transparent"];
  node [fontname="Noto Sans CJK SC", shape=ellipse, style="filled", color="#64748b", fontcolor="#0f172a", fillcolor="#fef3c7"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

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
  graph [fontname="Noto Sans CJK SC", rankdir=LR, bgcolor="transparent"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  subgraph cluster_current {
    label="现状";
    color="#94a3b8";
    fontcolor="#475569";
    curr_entry [label="单入口服务", fillcolor="#dbeafe"];
    curr_db [label="共享数据库", fillcolor="#dcfce7"];
    curr_ops [label="人工运维", fillcolor="#fef3c7"];
    curr_entry -> curr_db;
    curr_ops -> curr_entry;
  }

  subgraph cluster_target {
    label="目标";
    color="#94a3b8";
    fontcolor="#475569";
    tgt_gateway [label="统一入口", fillcolor="#fef3c7"];
    tgt_service_a [label="服务 A", fillcolor="#dbeafe"];
    tgt_service_b [label="服务 B", fillcolor="#dbeafe"];
    tgt_db_a [label="库 A", fillcolor="#dcfce7"];
    tgt_db_b [label="库 B", fillcolor="#dcfce7"];
    tgt_runbook [label="标准化 runbook", fillcolor="#f8fafc"];
    tgt_gateway -> tgt_service_a -> tgt_db_a;
    tgt_gateway -> tgt_service_b -> tgt_db_b;
    tgt_runbook -> tgt_gateway;
  }
}
```

## Mindmap

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=TB, bgcolor="transparent"];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded,filled", color="#64748b", fontcolor="#0f172a", fillcolor="#f8fafc"];
  edge [fontname="Noto Sans CJK SC", color="#94a3b8", fontcolor="#94a3b8"];

  root [label="主题", fillcolor="#dbeafe"];
  area_1 [label="维度一", fillcolor="#fef3c7"];
  area_2 [label="维度二", fillcolor="#fef3c7"];
  area_3 [label="维度三", fillcolor="#fef3c7"];

  leaf_11 [label="要点 1", fillcolor="#f8fafc"];
  leaf_12 [label="要点 2", fillcolor="#f8fafc"];
  leaf_21 [label="要点 1", fillcolor="#f8fafc"];
  leaf_22 [label="要点 2", fillcolor="#f8fafc"];
  leaf_31 [label="要点 1", fillcolor="#f8fafc"];
  leaf_32 [label="要点 2", fillcolor="#f8fafc"];

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
