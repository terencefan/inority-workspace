---
name: write-report
description: >-
  Write evidence-backed Markdown reports from a rough question, incident, dataset, system, run,
  repository, or operational situation. Use when the user asks to 写报告, 生成报告, 整理结论,
  输出分析报告, 写调研报告, 写侦察报告, 写排障报告, 写复盘报告, or needs a report that must
  be grounded in fresh read-only facts collected through `$runbook` with `runbook/references/recon/recon.md` before drafting.
---

# 报告写作工作流

本 skill 负责把用户问题转成一份可复核的 Markdown 报告。它必须先明确报告问题和证据边界；凡是需要现场事实、主机状态、服务状态、仓库状态、远端资源、日志、API、S3、Kubernetes、数据库或网页当前状态的报告，都要先使用 `$runbook` 并加载 `runbook/references/recon/recon.md` 做只读侦察，再写报告。

## 角色边界

- `$write-report` 是主控写作 skill，负责澄清目标、拆侦察问题、整合证据、撰写报告。
- `runbook/references/recon/recon.md` 只负责只读事实采集；不能修复、改配置、执行变更、验收或扩大 scope。
- 报告正文不能把未经侦察确认的推测写成事实。
- 如果用户已经给了完整证据，也仍要判断是否需要补一轮 `runbook/references/recon/recon.md`；当前状态可能变化时必须补证。
- 报告具有时效性，文件名和正文开头都必须带日期；日期必须放在最前面。

## 启动判断

先判断报告是否需要侦察：

- 需要侦察：涉及当前状态、故障、线上服务、主机、仓库、PR、数据集、S3、日志、API、监控、部署、性能、成本、安全、外部页面或任何可能变化的事实。
- 可以不侦察：用户只要求改写一份已完整给出的静态文本，且明确不需要验证事实。

如果需要侦察但缺少必要字段，先用一句话问清最小缺口：

- 报告问题：这份报告要回答什么？
- 环境边界：本机、某台主机、某个 repo、某个 URL、某个 run、某个数据集或某个服务。
- 只读边界：允许哪些只读动作，例如读文件、查日志、curl、kubectl get/logs、SQL 只读查询、S3 listing。
- 输出位置：直接回复，还是写到某个 `.md` 文件。用户没指定时，默认写到目标项目的 `docs/report/YYYY-MM-DD/` 日期目录，文件名使用 `<topic>.md`。

## 侦察编排

当需要 `runbook/references/recon/recon.md` 时，给 reconnaissance 子线一个窄 dispatch。每个 dispatch 必须包含：

- authority/report 目标路径：如果已有报告草稿或目标文件，给出路径；没有则写 `none`。
- 环境边界：只允许检查的主机、repo、URL、服务、数据集或资源。
- reconnaissance 问题：一个可回答的事实问题。
- 只读边界：明确允许的命令/查询类型。
- 返回格式：要求 `runbook/references/recon/recon.md` 使用五段 `范围`、`方法`、`事实`、`未确认项`、`对规划的影响`。

复杂报告可以拆多条独立 reconnaissance 问题，但每条都必须有独立边界。不要让一个 recon 子线泛化到未检查主机或未授权环境。

## 证据规则

- 优先使用本轮 `runbook/references/recon/recon.md` 的原始命令、关键输出、文件路径、时间戳、URL、run id、commit id 或对象路径。
- 对被排除的原因，报告里必须写明排除步骤和排除理由。
- 对无法确认的事实，写在 `未确认项`，不要藏在正文里。
- 对只检查了单机/单 repo/单 dataset 的结论，必须写明结论边界。
- 不粘贴密钥、token、cookie、AK/SK、完整凭据或敏感日志；必要时只写“已存在/未存在/匹配/未匹配”。

## 报告结构

默认写 Markdown，并使用以下结构。用户指定模板时以用户模板优先，但仍保留证据边界和未确认项。

```markdown
# YYYY-MM-DD <报告标题>

报告日期：YYYY-MM-DD

> <一句话结论>

## 侦察结论

> <最关键事实结论>

### 可复现方法

- <只读命令或查询>
- <输入路径 / URL / run id / commit id>

## 范围

- 检查对象：
- 时间范围：
- 环境边界：
- 未覆盖范围：

## 方法

- <本轮只读侦察动作>

## 事实

- <事实 1，带证据引用>
- <事实 2，带证据引用>

## 排除项

- <被排除原因>：排除步骤；排除理由。

## 未确认项

- <仍未确认的事实或风险>

## 建议

- <下一步建议，区分观察、执行、修复、验收>
```

## 写作要求

- 标题直接描述报告对象和问题，不写空泛标题。
- 报告标题必须以 `YYYY-MM-DD` 开头；报告文件必须放在同一天的 `docs/report/YYYY-MM-DD/` 目录下。
- 结论先行；长报告也要先给一句话结论。
- 当报告包含“现状 vs 替代方案”“方案 A vs 方案 B”“优劣势权衡”这类对比段落时，默认优先用红黄绿灯表达强弱：
  - `🟢` 表示当前更占优
  - `🟡` 表示中性或有权衡
  - `🔴` 表示当前更吃亏
- 红黄绿灯默认用于帮助快速扫读“优势/劣势/权衡”类对比，不要把整篇文档所有普通表格都染色；优先用于对比表、结论表和选型权衡段。
- 报告中涉及互斥分类分布时，默认使用 Mermaid `pie showData` 饼图呈现，并同时保留表格数据，便于 review 和 diff。
- 饼图只能用于互斥且总量口径清晰的分布，例如 extension-based modality、top extensions、状态占比、原因占比。多标签、可重叠、重复计数、采样可重复命中或同一对象可归入多个类别的统计不得画饼图，只能用表格或条形图，并说明计数口径。
- 使用 `侦察结论`，不要用 `关键结果` 作为主结论小节名。
- 每个主要 `侦察结论` 小节开头先给一句简洁 blockquote。
- 每个主要 `侦察结论` 小节都包含 `可复现方法`。
- 把事实、推断、建议分开；推断必须标明依据。
- 对用户要拿去评审的报告，优先写入目标项目 `docs/report/YYYY-MM-DD/` 下的 `.md` 文件，并在最终回复给出路径和验证方式。

## 完成回报

完成时简短说明：

- 报告路径或已直接输出。
- 使用了哪些 `runbook/references/recon/recon.md` 侦察问题。
- 关键结论。
- 未确认项和剩余风险。
- 是否需要后续执行态 runbook；不要在本 skill 内执行修复。
