# Write Spec

> 用于把粗糙需求、本地上下文和真实访谈收敛成可评审的 spec。  
> Turns rough requirements, local repo context, and real interview answers into a reviewable spec.

## 模块简介 | Overview

`write-spec` 是面向规格文档的写作 skill。它覆盖：

- product spec
- technical spec
- llm node spec
- change proposal
- API / interface spec
- implementation plan

它强调边界、contracts、红线行为、验收标准和真实访谈记录，并优先使用 diagram-driven 的写法。
它默认回答“目标状态应该是什么”，而不是把 spec 扩写成执行手册。

## 职责边界 | Responsibilities

负责：

- 判定 spec 类型并选择对应模板
- 用真实问答收敛边界
- 生成可评审的结构化 spec
- 明确稳定契约、风险、红线行为和验收标准
- 为多 spec 仓库维护 `docs/specs/README.md` 索引入口

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
- 目录总纲 spec 模板：`references/readme-spec-template.md`
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
| `references/llm-node-spec-template.md` | llm 节点 spec 模板 |
| `references/readme-spec-template.md` | 目录总纲 spec 模板 |
| `references/interview-record-template.md` | 访谈记录模板 |
| `references/validator-error-codes.yaml` | spec validator 错误码目录 |
| `scripts/specctl` | `specctl` CLI 入口 |

仓库级 spec 索引默认落在目标仓库的 `docs/specs/README.md`；它不是普通目录说明页，而是该目录下 spec 集合的总纲文档，默认也要符合 `specctl` 标准。详见 `SKILL.md` 的 `仓库 spec 入口` 章节。

- 当某份 spec 已降级为历史资料、兼容入口或废弃 authority 时，默认把它移到与主 spec 同级的 `deprecated/` 子目录，并同步更新索引与相对路径引用。

- `llm 节点 spec` 必须显式包含 `system prompt` 与 `user prompt` 章节，不能省略或合并命名。
- `llm 节点 spec` 的 `user prompt` 章节下必须带一张图，说明 `user prompt` 的生产过程。
