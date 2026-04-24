# Runbook Team

> runbook 工作流里的 team 执行编排 skill，负责调度 reconnaissance / execution / acceptance 子线。  
> The team-execution orchestration skill in the runbook workflow. It coordinates reconnaissance, execution, and acceptance lanes.

## 模块简介 | Overview

`runbook-team` 用于 authority runbook 已经达到可执行标准、且用户明确选择 `team` 执行时的编排场景。它承担多子线控制面，而不是 runbook 规划本身。

它不是规划入口，也不是单个编号项的 executor / acceptor。

## 职责边界 | Responsibilities

负责：

- 调度 reconnaissance / execution / acceptance 子线
- 监督 team 执行节奏与边界
- 聚合各 lane 的结果与 blocker
- 在新事实出现时把流程送回规划态

不负责：

- authority 未收敛时强行进入 team 执行
- 代替子线吞掉具体执行或验收
- 绕过用户对 `team` 的显式确认

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook-team` 的激活条件与 team 编排约束 |
| `README.md` | 当前目录的人类可读入口 |
