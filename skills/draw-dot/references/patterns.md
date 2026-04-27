# DOT Patterns

Use these as starting points. Adapt labels and grouping to the real subject.

## Architecture Overview

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=LR];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded"];
  edge [fontname="Noto Sans CJK SC"];

  user [label="用户 / 调用方"];

  subgraph cluster_entry {
    label="入口层";
    gateway [label="API Gateway"];
    web [label="Web / CLI"];
  }

  subgraph cluster_core {
    label="核心域";
    service_a [label="服务 A"];
    service_b [label="服务 B"];
  }

  subgraph cluster_data {
    label="数据层";
    db [label="主数据库"];
    cache [label="缓存"];
    mq [label="消息队列"];
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
  graph [fontname="Noto Sans CJK SC", rankdir=LR];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded"];
  edge [fontname="Noto Sans CJK SC"];

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
  graph [fontname="Noto Sans CJK SC", rankdir=LR];
  node [fontname="Noto Sans CJK SC", shape=ellipse];
  edge [fontname="Noto Sans CJK SC"];

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
  graph [fontname="Noto Sans CJK SC", rankdir=LR];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded"];
  edge [fontname="Noto Sans CJK SC"];

  subgraph cluster_current {
    label="现状";
    curr_entry [label="单入口服务"];
    curr_db [label="共享数据库"];
    curr_ops [label="人工运维"];
    curr_entry -> curr_db;
    curr_ops -> curr_entry;
  }

  subgraph cluster_target {
    label="目标";
    tgt_gateway [label="统一入口"];
    tgt_service_a [label="服务 A"];
    tgt_service_b [label="服务 B"];
    tgt_db_a [label="库 A"];
    tgt_db_b [label="库 B"];
    tgt_runbook [label="标准化 runbook"];
    tgt_gateway -> tgt_service_a -> tgt_db_a;
    tgt_gateway -> tgt_service_b -> tgt_db_b;
    tgt_runbook -> tgt_gateway;
  }
}
```

## Mindmap

```dot
digraph G {
  graph [fontname="Noto Sans CJK SC", rankdir=TB];
  node [fontname="Noto Sans CJK SC", shape=box, style="rounded"];
  edge [fontname="Noto Sans CJK SC"];

  root [label="主题"];
  area_1 [label="维度一"];
  area_2 [label="维度二"];
  area_3 [label="维度三"];

  leaf_11 [label="要点 1"];
  leaf_12 [label="要点 2"];
  leaf_21 [label="要点 1"];
  leaf_22 [label="要点 2"];
  leaf_31 [label="要点 1"];
  leaf_32 [label="要点 2"];

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
