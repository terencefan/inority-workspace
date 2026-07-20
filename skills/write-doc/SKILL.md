---
name: write-doc
description: 用于编写或整理产品 spec、技术 spec、LLM 节点 spec、contract、README、benchmark、调研报告与 RCA，并支持在 Markdown 中编写可渲染的数学或统计公式。用户提到“写 spec”“写 contract”“写 README”“写压测报告”“写 benchmark”“写报告”“写公式”“写统计方法”“写 RCA”“写故障分析”“写排障总结”或需要一份可评审 Markdown 文档时使用。
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
- benchmark：`modes/benchmark/MODE.md`
  适用于性能压测、固定数据集基线、历史基线对比、实验组统计显著性与回退护栏决策。
- report：`modes/report/MODE.md`
  适用于调研、侦察、现状分析、非压测型对比结论与排障总结。
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
5. 定稿前使用 `$write-doc` skill 自带的 validator；统一执行 `scripts/docctl validate <path>`（`validate` 可省略），这里的 `scripts/docctl` 指 `inority-workspace/skills/write-doc/scripts/docctl`。对应规则与错误码统一来自当前 mode 目录下的 `validator/` 资产。若该 skill 自带 validator 当前无法运行，再退回到模板/模式规则 + 代码事实交叉校验，并在结果里明确说明“未运行 validator”及原因。Markdown 内嵌 DOT 的专项校验命令属于 `$draw-dot` 的 `dotctl validate-markdown <path>`。
6. 新建、重命名、拆分、合并或废弃 authority spec / contract 后，按对应模式规则同步更新 `docs/spec/README.md` 或 `docs/contract/README.md`；`README` 模式不负责这两类总纲。
7. 如果用户在本轮给出可复用的写作偏好，结束前更新主 skill 或对应模式目录下的说明文件。
8. 文档需要数学、统计或性能计算公式时，完整读取 `references/formulas.md` 并遵循其中的语法选择、符号定义和渲染验收规则；不要把公式截图当作正文公式。

## Validator 入口回归规则

- 症状：Windows 上直接执行 `node validate.mjs <path>` 可能无输出且返回 0，造成假通过。
- 根因：用字符串拼接的 `file://` URL 与 Windows 反斜杠入口路径比较，二者永远不相等，`main()` 未运行。
- 修复：用 `fileURLToPath(import.meta.url)` 与 `path.resolve(process.argv[1])` 比较规范化文件路径。
- 防复发：validator 成功必须输出 `document ok:`；测试同时断言合法文档有成功标记、非法文档返回非零和错误码，不能只看退出码。
