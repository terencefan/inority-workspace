---
name: runbook
description: >-
  严格分阶段 runbook 的规划主 skill。适用于用户给出了草稿 runbook、零散步骤、
  运维需求或目标状态，需要主 agent 消除二义性、降低执行风险，并最终产出一份可供
  生产环境执行的 authority runbook（操作手册）的场景。这个 skill 只负责规划、
  澄清、结构化和定稿，不负责执行态落地。
---

# 运行手册规划主 skill

当用户给了 runbook 草稿、现场目标、迁移/变更需求，或者要求你整理出一份生产可执行操作手册时，使用这个 skill。

本 skill 只负责规划，不负责直接执行编号项，也不负责执行态验收。执行相关职责由 `$runbook-solo`、`$runbook-team`、`$runbook-executor`、`$runbook-acceptor` 承担。

如果用户要产出的主交付物是 PPT、slide deck、品牌 H5 或 handbook 可嵌入 slides 项目，不要继续把它塞进 `runbook`。直接改用 `$inority-slides`。

## Scope

本 skill 负责：

- 读懂用户给出的 runbook、草稿、目标或约束
- 识别 ambiguity / risk / 缺失前提
- 通过提问或只读侦察补足关键事实
- 冻结唯一执行路径
- 明确非目标、停止条件、回滚边界和验收路径
- 产出或修订 authority runbook

本 skill 不负责：

- 重新定义本应由 spec 固化的规范、边界或目标
- 直接执行 `#### 执行`
- 直接执行 `#### 验收`
- 在现场变更系统状态
- 在 authority 未收敛时抢跑实施

## 类型分流

`runbook` 只允许按下面三种类型分流：

1. `coding`
2. `operation`
3. `migration`

进入正文规划前，主 rollout 必须先判定当前 runbook 属于哪一种主类型，再按需加载对应子文档：

- `coding` -> `references/runbook-coding.md`
- `operation` -> `references/runbook-operation.md`
- `migration` -> `references/runbook-migration.md`
- 如果 authority 需要真正输出 Graphviz DOT 图，也可以按需加载 `$draw-dot`

加载规则：

- 默认只加载一个主类型子文档，不要无差别把全部子文档都读进来
- 每次加载子文档时，都要显式说明当前判型、加载了哪个子文档、为什么加载
- authority runbook 的 H1 标题下面必须紧跟一个 `> [!NOTE]`，写出当前模式：
  - `> 当前模式：\`coding\``
  - `> 当前模式：\`operation\``
  - `> 当前模式：\`migration\``

## 执行态切换

当 authority runbook 已经达到可执行标准后：

- 默认动作不是直接结束，而是先向用户确认这次进入 `solo` 还是 `team`
- 用户确认 `solo` 后，切到 `$runbook-solo`
- 用户确认 `team` 后，切到 `$runbook-team`
- 如果执行途中出现新的 blocker / 新事实 / 验收失败，必须立刻退出执行态，回到 `$runbook` 规划态

## 规划原则

- 先判断用户给的是 authority 草稿、只有目标和约束的需求描述，还是一份已经半执行的 runbook
- 如果输入主体是 spec，先把它当成目标态约束，再用本轮真实证据冻结 `### 现状`
- 只要还存在 materially different 的候选路线，就不要把 runbook 写成已拍板
- 编号步骤必须保持单一主动作；不要把两件 materially different 的事绑在一个步骤里
- 不要把未决选择伪装成“确认 X”“核定 X”这种编号项；应先提问或补只读侦察
- 如果 runbook 处于 `执行中` 或 `状态冲突`，不要直接接着跑，必须先做只读侦察，确认最后一个可信完成边界

## 10% Gate

在真正定稿 authority runbook 之前，必须把下面两项都压到 `10%` 或以下：

- `ambiguity`
- `risk`

只要任一项高于 `10%`，就不要宣称 runbook 已可执行。此时只能继续做两件事之一：

1. 问用户一个简洁规划问题
2. 启动 `$runbook-recon` 做只读补证

## 何时必须提问

出现下面任一情况时，必须先问用户：

- 有多个 viable 方案，且会改变后续执行或回滚形状
- 非目标边界不清楚
- 成功定义或验收路径不清楚
- 回滚边界会影响生产风险
- 用户给的 runbook 与最新现场事实冲突
- 用户给的 runbook 同时保留多个 materially different 路线

提问规则：

- 进入提问/澄清/确认路线/消歧义阶段时，统一加载 `$inority-question`
- authority 定稿前，必须累计至少 `5` 条真实的用户访谈记录

## 工具约束

统一使用 `scripts/runctl` 维护 authority runbook：

```bash
scripts/runctl init <topic>-runbook.md --title "<主题>执行手册"
scripts/runctl validate <topic>-runbook.md
scripts/runctl normalize <topic>-runbook.md
```

凡是模板和 validator 已能稳定检测的禁写项与格式细节，例如禁用章节名、问答简写、脑图字体、占位签名、anchor / jump-link 形状，以及 `## 执行计划` / `## 执行记录` 的对齐关系，统一以脚本报错为准；不要在 skill 正文里再维护一套并行禁写清单。

## 规划输出要求

最终 authority runbook 必须做到：

- 全文只有一条已拍板的执行路径
- `## 背景与现状` 同时包含 `### 背景` 与 `### 现状`
- `## 目标与非目标` 同时包含 `### 目标` 与 `### 非目标`
- `## 风险与收益` 只保留当前仍客观存在的风险
- `## 思维脑图` 基于真实访谈记录与侦察证据生成
- `## 执行计划` 每个编号项都包含 `#### 执行` 与 `#### 验收`
- `coding` 模式首项是 `保证工作区干净`
- `operation` / `migration` 模式首项是 `冻结现场`
- `## 执行记录` 与 `## 执行计划` 一一对齐
- `## 最终验收` 独立存在，并集中管理最终验收 checkbox
- `## 回滚方案` 明确回滚边界与回滚动作
- `## 访谈记录` 至少 `5` 条真实问答
- `## 外部链接` 只保留与当前 authority 直接相关的上游 / 下游 / 旁路文档

## 完成判定

只有满足下面这些条件，才可以把 runbook 规划任务报告为完成：

- `ambiguity <= 10%`
- `risk <= 10%`
- authority runbook 已存在或已被更新
- authority 含有至少 `5` 条真实用户访谈记录
- authority 中不存在 materially different 的多路径并列
- 目标、非目标、红线、回滚、验收路径都清楚
- `scripts/runctl validate <topic>-runbook.md` 返回 `0`

如果 authority 已可进入执行态，默认收口动作不是直接宣告结束，而是：

1. 向用户确认这次走 `solo` 还是 `team`
2. 收到选择后立刻切入对应执行态
