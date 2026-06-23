# RCA Mode

适用于统一的事故分析复盘文档。

## 模式职责

- 严格区分已观察事实、工程推断和未证实假设。
- 记录已排除路径、当前结论、仍未证实部分和可复现方法。
- 产出的是分析文档，不是执行态 runbook。

## 覆盖范围

`RCA` 不再区分内部类型。默认一份文档同时承载：

- 事故分析
- 故障边界收敛
- 已排除原因沉淀
- 复盘 / postmortem
- 后续改进项的分析上下文

本模式不负责：

- 把 remediation 执行本身作为主任务
- 编写生产 runbook
- 编写宽泛架构 spec

## 模板

- `templates/rca-template.md`

## Validator

- 规则：`validator/rules.json`
- 错误码：`validator/error-codes.yaml`
- 当前统一经 `scripts/docctl validate <path>` 校验；不再单独维护 `rcactl`，但 RCA 结构纪律保持不变。

## 文件与标题

- 文件名默认使用 `<topic>-rca.md`。
- RCA 标题不要求以“设计文档”结尾。
- 类型说明固定为 `当前文档类型：RCA`。

## 默认章节

- 默认二级标题顺序固定为：`背景 / 现象与影响 / 调查范围与方法 / 侦察结论 / 已排除的故障原因 / 当前结论 / 仍未证实的部分 / 复现步骤 / 建议的下一步 / 参考资料`。

## 取材规则

- 优先读取足够本地上下文，避免空泛归纳：日志、命令输出、probe 结果、相关 runbook / incident doc、以及会影响分析结论的相邻配置或拓扑文档。
- 先把事实与解释分层，再写正文：
  - confirmed evidence
  - excluded causes
  - current hypotheses
  - open questions
- 优先写清 fault boundary，不要做 sweeping claims。
- 如果证据不能证明根因，就坦白停在最高置信层级，不要过度外推。

## 写作规则

- 优先 evidence-first，不要先写结论再补想象中的证据。
- 必须显式区分：已观察事实、工程推断、未证实假设。
- 只要本轮排除了某个方向，就要写进 `已排除的故障原因`，不能只留在聊天或命令输出里。
- 每个被排除的原因都要同时写：排查 / 复现步骤，以及为什么这一步足以缩小故障域。
- `侦察结论` 下如果拆三级标题，每个子结论开头默认先放一句 blockquote，总结该小节已经收敛出的结论。
- `侦察结论` 的每个关键子结论默认补 `可复现方法`，写清进入路径、命令形状、重复次数和预期现象。
- `当前结论` 只能写到证据真正支持的层级；如果证据只支持故障域，不要假装已经证实根因。
- 如果只检查了单机、单路径或单环境，明确写出这个边界。
- 当主机名、VIP、后端别名或环境名容易混淆时，可以增加 alias table 帮助读者对齐对象。
- 复现步骤只覆盖当前相关故障面；不要把健康检查和失败检查混在一起而不解释原因。
- 如果加图，图也要 evidence-aware：
  - 标出 confirmed failing path
  - 标出 healthy control path
  - 把 candidate fault domain 和 proven fault point 分开
- `参考资料` 使用 Markdown 链接 bullet。

## RCA 质量门槛

一份好的 RCA 应该让读者能回答：

- 到底坏了什么？
- 哪些证据证明了这一点？
- 哪些原因已经被排除？
- 哪些还只是 hypothesis？
- 另一位工程师如何复现？
- 下一位 owner 应该继续查哪条路径？
