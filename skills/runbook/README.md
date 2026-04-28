# Runbook

> 严格分阶段的 authority runbook 规划主 skill，负责收敛问题、降低风险，并产出可执行的运行手册。  
> The authority runbook planning skill that converges ambiguity, reduces risk, and produces an executable runbook.

## 模块简介 | Overview

`runbook` 是运行手册规划主 skill。它处理草稿 runbook、零散步骤、目标状态和运维约束，把这些输入收敛成一份可执行的 authority runbook。

它只负责规划，不负责直接执行编号项，也不负责执行态验收。执行相关职责由 `runbook-solo`、`runbook-team` 以及各 phase 子 skill 承担。

按规划类型，`runbook` 只分为三种主类型：

- `coding`
- `operation`
- `migration`

如果主交付物是 slides / PPT / 品牌 H5，请改用独立的 `inority-slides` skill，不再通过 `runbook` 分流。

## 职责边界 | Responsibilities

负责：

- 识别 ambiguity / risk / 缺失前提
- 通过问答或只读侦察收敛规划边界
- 冻结执行路径、回滚边界和验收标准
- 维护 authority runbook 结构
- 通过 `runctl` 完成初始化、增量编辑、规范化和校验

不负责：

- 直接执行 `#### 执行`
- 直接执行 `#### 验收`
- 在现场修改系统状态
- 在 authority 未收敛前擅自进入执行态

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- runbook 控制入口：`scripts/runctl`
- 模板索引：`references/authority-runbook-template.md`
- 校验码表：`references/validator-error-codes.yaml`

常用命令：

```bash
scripts/runctl init <topic>-runbook.md --title "<主题>执行手册"
scripts/runctl validate <topic>-runbook.md
scripts/runctl normalize <topic>-runbook.md
```

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `runbook` 的权威规划规则 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/authority-runbook-template.md` | 模板索引与兼容入口 |
| `references/runbook-template.md` | `coding` / `operation` / `migration` 通用模板 |
| `references/runbook-coding.md` | coding 类型 runbook 的子文档 |
| `references/runbook-operation.md` | operation 类型 runbook 的子文档 |
| `references/runbook-migration.md` | migration 类型 runbook 的子文档 |
| `references/validator-error-codes.yaml` | `runctl validate` 的错误码与解释 |
| `scripts/runctl` | runbook 初始化、编辑、规范化、校验的统一入口 |
| `tests/` | `runctl` 子命令与规则的回归测试 |
