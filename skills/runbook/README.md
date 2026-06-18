# Runbook

> 严格分阶段的 authority runbook 主入口 skill，负责分流、装配与 authority 收口。  
> The main entry skill for strict staged authority runbooks. It owns routing, document loading, and authority convergence.

## 模块简介 | Overview

`runbook` 现在采用“轻主 skill + 按需子文档”结构：

- 主 `SKILL.md` 只保留入口、分流、装配和切换
- `references/planning/plan-mode.md` 承接规划态主体规则
- `references/execution/solo.md`、`references/execution/team.md` 与各 phase 子文档承接执行态规则

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- 规划态子文档：`references/planning/plan-mode.md`
- 类型子文档：
  - `references/planning/coding-runbook.md`
  - `references/planning/operation-runbook.md`
  - `references/planning/migration-runbook.md`
- 执行态子文档：
  - `references/execution/solo.md`
  - `references/execution/team.md`
  - `references/recon/recon.md`
  - `references/execution/execution.md`
  - `references/execution/acceptance.md`
- runbook 控制入口：`scripts/runctl`
- 模板索引：`references/assets/authority-runbook-template.md`
- 校验码表：`references/assets/validator-error-codes.yaml`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | 主入口骨架，负责分流与装配 |
| `references/planning/plan-mode.md` | 规划态主体规则 |
| `references/planning/coding-runbook.md` | coding 类型 runbook 子文档 |
| `references/planning/operation-runbook.md` | operation 类型 runbook 子文档 |
| `references/planning/migration-runbook.md` | migration 类型 runbook 子文档 |
| `references/execution/solo.md` | `solo` 执行控制面子文档 |
| `references/execution/team.md` | `team` 执行控制面子文档 |
| `references/recon/recon.md` | 只读侦察 phase 子文档 |
| `references/execution/execution.md` | 单 item 执行 phase 子文档 |
| `references/execution/acceptance.md` | 单 item 验收 phase 子文档 |
| `references/assets/authority-runbook-template.md` | authority 模板索引 |
| `references/assets/validator-error-codes.yaml` | `runctl validate` 的错误码与解释 |
| `scripts/runctl` | runbook 初始化、编辑、规范化、校验的统一入口 |
| `tests/` | `runctl` 子命令与规则的回归测试 |

