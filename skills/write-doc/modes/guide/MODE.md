# Guide Mode

适用于开发指南、使用指南、操作手册等面向接手人的 how-to 文档。调研事实清单走 report 模式，目录入口地图走 readme 模式，稳定契约走 spec/contract 模式。

## 模式职责

- 解释「怎么跑、怎么判读结果、出问题去哪查」，帮读者从零完成第一次操作并建立自诊路径。
- 固定骨架是首尾双锚加自由中段：`快速开始` 必须是第一个 H2，`参考资料` 必须收尾，中段章节按主题自由拆分。
- 文件名自由：可放仓库根目录或 docs/ 下任意 `.md`，建议全大写主题式命名（如 `E2E-TESTING.md`）。

## Validator

- 规则：`validator/guide-rules.json`（docType `开发指南`，`allowAnyH2` 首尾锚定 + `referenceSectionFlexible`）。
- 共享错误码 catalog 在 `modes/spec/validator/error-codes.yaml`；本模式不设专属 error-codes.yaml——mode 目录按字母序加载，guide 先于 spec，重复定义会被覆盖。

## 模板

- `templates/guide-template.md`，定稿前执行 `scripts/docctl validate <path>`。

## 写作规则

- `快速开始` 必须给真实可复制命令、前置条件与结果判读口径，不写抽象概述。
- 参考资料 entries 用 `- [名](路径)` 列表或 Markdown 表格；表格形态要求 header 行、`| --- |` 分隔行和至少一条含链接的数据行。
- authority 文档外链不复制正文；正文与 authority 冲突时以 authority 为准并回修本指南。
- 命令、路径、参数、期望 verdict 必须与仓库当前事实一致；发现漂移先核实再落笔。

## 已知限制

- `parseSections` 不识别 fenced code block：`参考资料` 之后不要放置含 `## ` 开头行的 code fence，否则该行会计入 H2 序列触发 E010。
