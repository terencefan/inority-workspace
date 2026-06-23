---
name: write-doc
description: 用于编写或整理产品 spec、技术 spec、LLM 节点 spec、contract、README、调研报告与 RCA。用户提到“写 spec”“写 contract”“写 README”“写报告”“写 RCA”“写故障分析”“写排障总结”或需要一份可评审 Markdown 文档时使用。
---

# Write Doc

把粗糙意图、本地仓库事实和真实用户问答收敛成可评审的工程文档。

主 skill 只负责：

- 判定本次要进入哪个文档模式。
- 加载对应 `modes/<mode>/MODE.md`。
- 执行跨模式共通纪律，例如真实问答、仓库事实优先、validator 优先、必要时维护总纲入口。

## 模式路由

按主交付物进入对应模式：

- spec：`modes/spec/MODE.md`
  适用于 `产品 spec`、`技术 spec`、`LLM 节点 spec`、`spec 总纲`。
- contract：`modes/contract/MODE.md`
  适用于稳定接口、表结构、事件 payload、schema 与 `contract 总纲`。
- readme：`modes/readme/MODE.md`
  适用于 `Project README` 和 `Module README`。
- report：`modes/report/MODE.md`
  适用于调研、侦察、现状分析、对比结论与排障总结。
- rca：`modes/rca/MODE.md`
  适用于统一的事故分析复盘文档。

## 默认协作面

进入 `$write-doc` 时，默认同时使用：

- `$write-doc`
- `$inority-question`
- 已判定模式下的 `modes/<mode>/MODE.md`

只有确实需要结构图、关系图、架构图或 Graphviz 片段时，额外使用 `$draw-dot`。DOT 的布局、节点配色、cluster 样式和 dark-mode 适配由 `$draw-dot` 统一负责，`$write-doc` 只定义图里必须表达什么。

## 跨模式共通规则

1. 先判定模式，再读取对应模式目录里的 `MODE.md`、template 和 validator 规则；不要在主 skill 里硬背每种模式的章节细节。
2. 优先使用仓库事实，不用泛化措辞替代真实代码、接口、表、事件、目录边界。
3. 正文定稿前，用真实用户问答收敛歧义、路径和验收含义；不要自问自答。
4. 若涉及稳定接口、数据库表契约、状态 schema、事件 payload 或跨模块 I/O，默认同时进入 `contract` 模式，把稳定契约独立成 `-contract.md` 文件，再在 spec 正文里引用。
5. 定稿前优先运行 `scripts/docctl validate <path>`；当模式说明、模板示例和 validator 不一致时，以 validator 为准。
6. 新建、重命名、拆分、合并或废弃 authority spec / contract 后，按对应模式规则同步更新 `docs/spec/README.md` 或 `docs/contract/README.md`；`README` 模式不负责这两类总纲。
7. 如果用户在本轮给出可复用的写作偏好，结束前更新主 skill 或对应模式目录下的说明文件。
