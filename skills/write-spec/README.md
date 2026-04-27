# Write Spec

> 用于把粗糙需求、本地上下文和真实访谈收敛成可评审、可执行的 spec。  
> Turns rough requirements, local repo context, and real interview answers into a reviewable, executable spec.

## 模块简介 | Overview

`write-spec` 是面向规格文档的写作 skill。它覆盖：

- product spec
- technical spec
- change proposal
- API / interface spec
- implementation plan

它强调边界、假设、验收标准和真实访谈记录，并优先使用 diagram-driven 的写法。

## 职责边界 | Responsibilities

负责：

- 判定 spec 类型并选择对应模板
- 用真实问答收敛边界
- 生成可评审的结构化 spec
- 明确假设、约束、风险和验收标准

不负责：

- 用自问自答替代真实访谈
- 脱离本地仓库事实编造实现细节
- 在关键边界未收敛时提前宣称 spec 完成

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 模板索引：`references/template.md`
- product spec 模板：`references/product-spec-template.md`
- technical spec 模板：`references/technical-spec-template.md`
- interview record 模板：`references/interview-record-template.md`
- validator 错误码：`references/validator-error-codes.yaml`
- CLI：`scripts/specctl validate <path>`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `write-spec` 的工作流、访谈规则与文档结构约束 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/template.md` | spec 模板入口索引 |
| `references/product-spec-template.md` | product spec 模板 |
| `references/technical-spec-template.md` | technical spec 模板 |
| `references/interview-record-template.md` | 访谈记录模板 |
| `references/validator-error-codes.yaml` | spec validator 错误码目录 |
| `scripts/specctl` | `specctl` CLI 入口 |
