# Write Doc

> 用于把粗糙需求、本地上下文和真实访谈收敛成可评审的工程文档。  
> Turns rough requirements, local repo context, and real interview answers into reviewable engineering documents.

## 模块简介 | Overview

`write-doc` 现在按模式组织，而不是把所有规则平铺在一个大文件里。

每个模式目录都自包含三类资料：

- `MODE.md`：该模式的说明与工作流
- `templates/`：该模式专属模板
- `validator/`：该模式专属校验规则与错误码

主 skill 只做路由和共通纪律，具体章节、模板和校验口径都在 `modes/*` 下按需加载。

## 职责边界 | Responsibilities

负责：

- 判定当前任务属于 spec / contract / README / 调研报告 / RCA 哪种模式
- 把模式说明、模板和 validator 规则收敛到同一个模式目录
- 通过单入口 `docctl` 从各模式目录动态加载校验规则

不负责：

- 在主 skill 里重复维护每个模式的全部章节细节
- 让模板、validator 和模式说明长期分散漂移

## 入口与公共接口 | Entrypoints

- 主 skill：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 模式目录：`modes/spec/`、`modes/contract/`、`modes/readme/`、`modes/report/`、`modes/rca/`
- validator CLI：`scripts/docctl validate <path>`（`validate` 可省略）
- validator 实现：`scripts/commands/validate.mjs`
- DOT 专项校验：`../draw-dot/scripts/dotctl validate-markdown <path>`

## 依赖关系 | Dependencies

- 上游依赖
  `$inority-question` 用于真实问答收敛。
- 上游依赖
  `$draw-dot` 负责 Markdown 内嵌 DOT 图的样式 authority。
- 下游依赖
  `scripts/docctl` 会从 `modes/*/validator/` 汇总 doc type 规则和错误码。

## 扩展方式 | Extension

- 新增模式时，先创建 `modes/<mode>/SKILL.md`、`templates/`、`validator/rules.json` 和 `validator/error-codes.yaml`。
- 需要新增 doc type 时，优先放进最贴近的模式目录，不要回到主 skill 平铺。
- 如果只是补模板或补某类 validator 规则，直接改对应模式目录；只有跨模式纪律才回到主 `SKILL.md`。

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | 主入口，只保留模式路由和跨模式规则。 |
| `README.md` | 当前目录的人类可读入口。 |
| `agents/openai.yaml` | skill 展示名与调用元数据。 |
| `modes/spec/` | spec 相关模板、validator 和模式说明。 |
| `modes/contract/` | contract 相关模板、validator 和模式说明。 |
| `modes/readme/` | README 模式资料。 |
| `modes/report/` | 调研报告模式资料。 |
| `modes/rca/` | RCA 模式资料。 |
| `scripts/docctl` | 文档总校验 CLI；`dotctl validate-markdown` 仅负责 Markdown 内嵌 DOT 校验。 |
| `scripts/commands/validate.mjs` | 单入口 validator，运行时动态加载各模式规则。 |

## 参考资料 | References

- [spec mode](./modes/spec/MODE.md)
- [contract mode](./modes/contract/MODE.md)
- [readme mode](./modes/readme/MODE.md)
- [report mode](./modes/report/MODE.md)
- [rca mode](./modes/rca/MODE.md)
