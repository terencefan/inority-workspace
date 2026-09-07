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
- 将所有 runbook 统一归类为 `operation`
- 显式回报本轮已加载信息
- 在规划态装配 `plan` 子文档
- 确保 runbook 依赖的脚本、manifest、模板、校验器和回滚辅助资产与 authority 同批落盘
- 在执行确认后装配 `solo` / `team` 子文档
- 在执行遇阻时把流程拉回规划态

不要把规划细则、phase 细则和执行编排细节全部堆回主 skill。

## 规划态默认加载

只要当前处于 `$runbook` 规划态，就默认加载：

- `references/planning/plan-mode.md`
- `references/planning/operation-runbook.md`
- `$inority-question`

规划态不得只交付 Markdown：凡执行步骤引用或隐含依赖的脚本、配置、manifest、Secret 模板、校验器和回滚辅助文件，都必须在 authority 定稿前落到 runbook 相邻 `assets/`（或项目既有的明确资源目录），被 `## 参考资料` 直接链接，并通过对应静态校验。纯单行、无复用价值且无需模板化的只读命令可以保留内联。

脚本落盘不等于前置制品已准备。runbook 依赖的容器镜像、离线安装包、Helm chart、模型、固件或其他外部 artifact，必须在定稿前实际下载/镜像/上传到目标可达的正式存储，冻结 digest 或 checksum，并从目标消费路径验证可读取。若客观权限阻塞，runbook 必须保持不可执行状态并明确记录缺失制品，不能用“已有准备脚本”宣称完成。

只有在确实需要图时，才额外补 `$draw-dot`。

当用户允许通过飞书向范腾远确认，或持续 goal / runbook 需要异步选择、安全审批时，按需加载
`../lark-message/references/feishu-direct-confirmation.md`，并同时使用 `$lark-message`。不要把 goal
持续性误当作后台回调 listener 永久存活。

当用户要求把执行内容修订同步给范腾远时，这是一条跨规划态与执行态的强制恢复门禁：每次修订
会改变待执行命令、参数、顺序、目标、scope、停止条件、回滚或验收语义，都必须先用
`$lark-message` 向范腾远发送 Card 2.0，取得并写回送达凭证后才能恢复执行。纯排版、错别字、
链接修复或不改变执行语义的表述调整不触发通知。

迁移、切流和状态搬运场景仍归入 `operation`，不再建立独立类型。

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

- 主 rollout 先向用户确认进入 `solo` 还是 `team`
- 用户确认 `solo` 后，加载 `references/execution/solo.md`
- 用户确认 `team` 后，加载 `references/execution/team.md`
- 用户对 `solo` / `team` 的确认同时授权主 rollout 按所选模式编排该 runbook 明确要求的 phase 子代理；全部编号项通过后，必须直接启动强制的独立只读最终 recon，不得仅因需要新开 subagent 再向用户请求一次授权。该授权不扩大现场变更范围，也不能替代破坏性动作、外部写入或新增执行路径本身所需的确认。
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
