# Runbook Executor

> runbook 工作流里的执行 phase skill，负责单个编号项的 `#### 执行`、证据留存与停止边界。  
> The execution-phase skill in the runbook workflow. It owns `#### 执行` for one numbered item, along with execution evidence and stop boundaries.

## 模块简介 | Overview

`runbook-executor` 是 runbook 执行链路中的 execution 子 skill。它用于：

- `solo` 模式下主 rollout 承担当前 item 的执行 phase
- `team` 模式下 execution 子代理处理单个编号项

它只负责执行，不负责规划、不负责验收，也不负责只读 reconnaissance。

## 职责边界 | Responsibilities

负责：

- 执行当前编号项的 `#### 执行`
- 留存执行证据
- 在命中停止条件时立即停下并向上汇报
- 维持 authority 指定的执行路径

不负责：

- 重写 authority runbook
- 擅自换路径或修法
- 直接完成 `#### 验收`

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 执行模板：`references/execute-template.md`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook-executor` 的权威执行边界 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/execute-template.md` | 执行 phase 的模板与写回约束 |
