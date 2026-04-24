# Runbook Recon

> runbook 工作流里的 reconnaissance skill，负责规划阶段补证或执行态下的严格只读侦察。  
> The reconnaissance skill in the runbook workflow, used for planning-time evidence gathering and strictly read-only investigation during execution.

## 模块简介 | Overview

`runbook-recon` 是 runbook 体系里的只读侦察子 skill。它用于：

- 规划阶段补足事实与证据
- `solo` 模式下主 rollout 处理只读 reconnaissance
- `team` 模式下 reconnaissance 子代理按主机或环境边界收集事实

它必须保持只读，不能漂移成执行、修复或验收 lane。

## 职责边界 | Responsibilities

负责：

- 按边界收集只读证据
- 做 SSH / 配置 / 服务 / 网络的只读检查
- 执行工具原生 dry-run / plan / diff 等 no-op 预演
- 输出有边界的、带原始证据的 reconnaissance 结论

不负责：

- 执行任何变更
- 做现场修复
- 擅自扩 scope 到未分配的问题
- 把单机事实泛化成全局结论

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook-recon` 的只读边界与进度契约 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
