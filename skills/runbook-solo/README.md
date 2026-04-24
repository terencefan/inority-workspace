# Runbook Solo

> runbook 工作流里的 solo 执行主控 skill，负责串行调度 execution / acceptance 子线推进整份 authority runbook。  
> The solo-execution orchestrator in the runbook workflow. It serially drives execution and acceptance lanes across a converged authority runbook.

## 模块简介 | Overview

`runbook-solo` 用于 authority runbook 已经收敛且用户明确选择 `solo` 执行时的主 rollout。它承担单主控推进整份 runbook 的职责，并显式装配：

- `runbook-executor`
- `runbook-acceptor`

如果执行过程中需要 reconnaissance，必须先退回 `runbook` 规划态，再按需调用 `runbook-recon`。

## 职责边界 | Responsibilities

负责：

- 串行推进 authority runbook
- 在 item 级别调度 execution / acceptance
- 维持 `solo` 执行态的控制面节奏
- 在 blocker 出现时退出回规划态

不负责：

- 代替 `runbook` 完成规划收敛
- 在同一 lane 内吞掉 reconnaissance
- 擅自切换成 `team` 模式

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook-solo` 的激活条件与控制面规则 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
