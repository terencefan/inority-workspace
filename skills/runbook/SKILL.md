---
name: runbook
description: >-
  严格分阶段 runbook 的主入口 skill。适用于用户给出了草稿 runbook、零散步骤、
  运维需求或目标状态，需要主 agent 消除二义性、降低执行风险，并最终产出一份可供
  生产环境执行的 authority runbook（操作手册）的场景。主 skill 保持轻薄，规划态与
  执行态规则通过子文档按需加载。
---

# 运行手册主 skill

当用户给了 runbook 草稿、现场目标、迁移/变更需求，或者要求你整理出一份生产可执行操作手册时，使用这个 skill。

runbook 的职责不是重新定义规范、边界或目标，而是把已经明确的目标态落成一条“从现状走到目标”的可执行转化路径。

## 主入口职责

主 `runbook` skill 只保留这些职责：

- 判定当前任务是否属于 runbook workflow
- 判定主类型：`coding` / `operation` / `migration`
- 显式回报本轮已加载信息
- 在规划态装配 `plan` 子文档
- 在执行确认后装配 `solo` / `team` 子文档
- 在执行遇阻时把流程拉回规划态

不要把规划细则、phase 细则和执行编排细节全部堆回主 skill。

## 规划态默认加载

只要当前处于 `$runbook` 规划态，就默认加载：

- `references/planning/plan-mode.md`
- `references/<type>-runbook.md`
- `$inority-question`

只有在确实需要图时，才额外补 `$draw-dot`。

类型映射：

- `coding` -> `references/planning/coding-runbook.md`
- `operation` -> `references/planning/operation-runbook.md`
- `migration` -> `references/planning/migration-runbook.md`

## 已加载信息回报

每次进入规划态或发生加载集合变化时，主 rollout 都必须在主回复里显式回报：

- 当前判定的 runbook 类型
- 本次已加载的 skill / 子文档列表
- 每一项为什么要加载

如果额外加载了 `$draw-dot`，也必须说明本次图的类型，以及为什么它影响 authority 收敛。

## 执行态子文档

`runbook` 是 runbook 家族的唯一权威主 skill。

执行态与 phase 规则作为主 skill 下的按需加载子文档存在：

- `references/execution/solo.md`
- `references/execution/team.md`
- `references/recon/recon.md`
- `references/execution/execution.md`
- `references/execution/acceptance.md`

旧 `runbook-*` 目录保留为兼容壳；权威规则以本目录下这些子文档为准。

## 执行态切换

当 authority runbook 已达到可执行标准后：

- 主 rollout 必须先完成一轮独立的资源命名确认；这轮只确认 `## 资源命名` 表里的名称，不得同时询问 `solo` / `team`
- 资源命名确认前，主 rollout 必须先把 `## 资源命名` 表用 Markdown 表格原样展示给用户查看
- 资源命名确认提问固定使用 `确认资源命名？(Y/N)`；`Y` / `y` 表示确认，`N` / `n` 表示不确认
- 用户回答 `Y` / `y` 确认资源命名后，主 rollout 才能勾选“用户已确认本 runbook 中所有资源命名”
- 如果规划态本轮已经通过 `runctl validate`，但 authority 仍有执行 blocker，也必须先展示资源命名表并完成这轮命名确认；命名确认不等于执行授权，不能在同一轮混问 `solo` / `team`
- 资源命名确认完成且 authority runbook 仍达到可执行标准后，主 rollout 再单独向用户确认进入 `solo` 还是 `team`
- 用户确认 `solo` 后，加载 `references/execution/solo.md`
- 用户确认 `team` 后，加载 `references/execution/team.md`
- 如果执行途中出现失败、未通过、停止条件、新 blocker 或新事实，立即退出回规划态，并重新加载 `references/planning/plan-mode.md`

## 模板与回复格式

- authority runbook 的结构模板以 `references/assets/authority-runbook-template.md` 为准
- 主 rollout 的回复格式由工作区级 `.codex/USER.md` 统一管理
- 不要在本 skill 内重复定义另一套主回复格式

## 使用说明

真正的规划态规则请继续读取：

- `references/planning/plan-mode.md`

真正的执行态规则按需读取：

- `references/execution/solo.md`
- `references/execution/team.md`
- `references/recon/recon.md`
- `references/execution/execution.md`
- `references/execution/acceptance.md`
