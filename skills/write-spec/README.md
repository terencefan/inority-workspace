# Write Spec

> 用于把粗糙需求、本地上下文和真实访谈收敛成可评审的 spec。  
> Turns rough requirements, local repo context, and real interview answers into a reviewable spec.

## 模块简介 | Overview

`write-spec` 是面向 spec / contract 文档的写作 skill。它覆盖：

- product spec
- technical spec
- llm node spec
- change proposal
- API / interface spec
- implementation plan
- standalone contract document

它强调边界、contracts、红线行为、验收标准，并区分“spec 负责方案叙事、contract 负责稳定契约”；contract 默认放在与 `spec/` 平级的 `contract/` 目录，目录总纲 README 走单独格式规则。
它默认回答“目标状态应该是什么”，而不是把 spec 扩写成执行手册。

## 职责边界 | Responsibilities

负责：

- 判定本次应产出 spec、contract，还是两者配套
- 选择对应模板或 contract 结构
- 用真实问答收敛边界
- 生成可评审的结构化 spec
- 明确稳定契约、风险、红线行为和验收标准
- 为多 spec 仓库维护 `docs/spec/README.md` 目录总纲入口
- 为多 contract 仓库维护 `docs/contract/README.md` 目录总纲入口

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
- llm 节点 spec 模板：`references/llm-node-spec-template.md`
- interview record 模板：`references/interview-record-template.md`
- directory overview 模板：`references/directory-overview-readme-template.md`
- contract 模板：`references/contract-template.md`
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
| `references/llm-node-spec-template.md` | llm 节点 spec 模板 |
| `references/interview-record-template.md` | 访谈记录模板 |
| `references/directory-overview-readme-template.md` | 目录总纲 README 模板 |
| `references/contract-template.md` | contract 文档模板 |
| `references/validator-error-codes.yaml` | spec validator 错误码目录 |
| `scripts/specctl` | `specctl` CLI 入口 |

仓库级 spec 总纲默认落在目标仓库的 `docs/spec/README.md`；它是 `目录总纲 spec`，使用 README 专用规则走 `specctl validate`。详见 `SKILL.md` 的 `仓库 spec 入口` 章节。

- `llm 节点 spec` 必须显式包含 `system prompt` 与 `user prompt` 章节，不能省略或合并命名。
- `llm 节点 spec` 的 `user prompt` 章节下必须带一张图，说明 `user prompt` 的生产过程。
