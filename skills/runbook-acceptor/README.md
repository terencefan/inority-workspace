# Runbook Acceptor

> runbook 工作流里的验收 phase skill，负责单个 item 的 `#### 验收` 与证据写回。  
> The acceptance-phase skill in the runbook workflow. It owns `#### 验收` for one item and writes acceptance evidence back.

## 模块简介 | Overview

`runbook-acceptor` 是 runbook 执行链路中的 acceptance 子 skill。它用于：

- `solo` 模式下主 rollout 对当前 item 做验收
- `team` 模式下 acceptance 子代理处理一个 item 的 `#### 验收`

它只负责验收，不负责只读侦察，也不负责执行变更。

## 职责边界 | Responsibilities

负责：

- 执行当前 item 的验收检查
- 明确通过 / 未通过结论
- 写回验收证据
- 在命中停止条件时向上汇报

不负责：

- 执行变更命令
- 重写 authority runbook
- 跨 item 处理多条执行路径

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook-acceptor` 的权威边界说明 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
