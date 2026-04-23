# <Runbook Title>

## 背景与现状
### 背景
- <Why this work exists now>

### 现状
- <Fresh reconnaissance evidence from this turn>
- <Historical context only if explicitly labeled historical>

```dot
digraph current {
  rankdir=LR;
  graph [bgcolor="transparent", pad="0.2", nodesep="0.35", ranksep="0.45"];
  node [shape=box, style="rounded,filled", color="#5D7086", fontcolor="#E6EDF3", penwidth=1.2];
  edge [color="#7F8FA3", fontcolor="#C9D1D9"];

  node_a [label="Current component A", fillcolor="#375A7F"];
  node_b [label="Current component B", fillcolor="#375A7F"];
  node_c [label="Current storage", fillcolor="#3E6B57"];
  node_a -> node_b [label="current flow"];
  node_b -> node_c [label="current write"];
}
```

## 目标与非目标
### 目标
- <Desired end state>
- <Scope boundary and success definition>

```dot
digraph target {
  rankdir=LR;
  graph [bgcolor="transparent", pad="0.2", nodesep="0.35", ranksep="0.45"];
  node [shape=box, style="rounded,filled", color="#5D7086", fontcolor="#E6EDF3", penwidth=1.2];
  edge [color="#7F8FA3", fontcolor="#C9D1D9"];

  node_a [label="Target component A", fillcolor="#5A4F7A"];
  node_b [label="Target component B", fillcolor="#5A4F7A"];
  node_c [label="Target storage", fillcolor="#3E6B57"];
  node_a -> node_b [label="target flow"];
  node_b -> node_c [label="target write"];
}
```

### 非目标
- <Explicitly out of scope item>

## 风险与收益
### 风险
1. <Highest still-open objective risk at finalization time>
2. <Next still-open objective risk at finalization time>

### 收益
1. <Highest benefit>
2. <Next benefit>

## 红线行为
- <Strictly forbidden action>

## 访谈记录
### Q：<question text>
> A：<user answer with actual content only, no numeric-choice recap>

访谈时间：<required interview time>

<impact line 1>
<impact line 2>

### Q：<question text>
> A：<user answer with actual content only, no numeric-choice recap>

<impact line 1>

### Q：<question text>
> A：<user answer with actual content only, no numeric-choice recap>

<impact line 1>

### Q：<question text>
> A：<user answer with actual content only, no numeric-choice recap>

<impact line 1>

### Q：<question text>
> A：<user answer with actual content only, no numeric-choice recap>

<impact line 1>

## 思维脑图
```dot
digraph mindmap {
  rankdir=LR;
  graph [bgcolor="transparent", pad="0.2", nodesep="0.35", ranksep="0.5"];
  node [shape=box, style="rounded,filled", color="#5D7086", fontcolor="#E6EDF3", penwidth=1.2];
  edge [color="#7F8FA3"];

  brain [label="Mind", fillcolor="#7A5C46"];
  category_a [label="Category A", fillcolor="#375A7F"];
  category_b [label="Category B", fillcolor="#375A7F"];
  conclusion_a1 [label="Conclusion A1", fillcolor="#3E6B57"];
  conclusion_a2 [label="Conclusion A2", fillcolor="#3E6B57"];
  conclusion_b1 [label="Conclusion B1", fillcolor="#3E6B57"];
  conclusion_b2 [label="Conclusion B2", fillcolor="#3E6B57"];

  brain -> category_a;
  brain -> category_b;
  category_a -> conclusion_a1;
  category_a -> conclusion_a2;
  category_b -> conclusion_b1;
  category_b -> conclusion_b2;
}
``` 

## 执行计划
### 🟢 1. <step title>
> [!TIP]
> This step reads the current state and records evidence for the next action.

#### 执行
操作性质：只读
- <Exact commands or exact actions>
- <Expected artifact or state change>

#### 验收
- <Exact validation commands or exact checks>
- <Pass criteria>

### 🟡 2. <step title>
> [!WARNING]
> This step applies the target state idempotently and records whether a change was needed.

#### 执行
操作性质：幂等
- <Exact commands or exact actions>
- <Expected artifact or state change>

- Direct host network, disk, cgroup, and similar low-level configuration changes must use `操作性质：破坏性`, even when the command is repeatable.

#### 验收
- <Exact validation commands or exact checks>
- <Pass criteria>

## 执行记录
### 步骤 1 - <step title>
#### 执行
- <Execution evidence>

#### 验收
- <Acceptance evidence>

### 步骤 2 - <step title>
#### 执行
- <Execution evidence>

#### 验收
- <Acceptance evidence>

## 最终验收
- <Open a fresh, independent-context `$runbook-recon` subagent for runbook-level final acceptance>
- <Use only evidence newly collected by that recon subagent; do not reuse existing execution or acceptance evidence>
- <Completion evidence or release decision based on the fresh recon result>

## 参考文献
- [<Live evidence source>](</abs/path/to/file.md:1>)
- [<External source>](https://example.com)
