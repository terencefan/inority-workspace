# README Mode

适用于 `README.md` 风格文档。当前只保留两类：`Project README` 和 `Module README`。

## 模式职责

- 对 `Project README`，解释整个项目是什么、怎么启动、代码如何组织、相关文档从哪里进入。
- 对 `Module README`，解释目录边界、入口、公共接口、依赖关系和扩展方式。
- 帮读者快速理解“这个边界在做什么、不做什么、从哪里进入”。

## README 分类

先明确这份文档属于哪一类 README：

- Project README
- Module README

`spec 总纲` 和 `contract 总纲` 的 README 不属于当前模式，分别由 `spec` 模式和 `contract` 模式负责。

## 模板

- Project README：`templates/project-readme-template.md`
- Module README：`templates/module-readme-template.md`

## Validator

- Project README 规则：`validator/project-rules.json`
- Module README 规则：`validator/module-rules.json`
- 共享错误码：`validator/error-codes.yaml`

## Project README 规则

- 文件名固定为 `README.md`。
- 默认二级标题顺序固定为：`项目简介 / 开发与启动 / 架构设计 / 代码结构 / 部署拓扑 / 文档链接`。
- `代码结构` 优先使用 `路径 | 说明` 表格。
- `架构设计` 和 `部署拓扑` 如果存在图，优先使用 fenced `dot` / `graphviz` 图，并保持 dark-mode 友好。
- 当 README 已存在时，保留有效术语，只重写过时、误导或结构明显变弱的部分。

## Module README 规则

- 文件名固定为 `README.md`。
- 默认二级标题顺序固定为：`模块简介 / 职责边界 / 入口与公共接口 / 依赖关系 / 扩展方式 / 相关文件 / 参考资料`。
- `相关文件` 优先用表格表达。
- README 的定位是“某个文件夹的介绍”，不是 authority spec 总纲。
- 不要把大段 spec 正文复制进 README；README 更像入口地图。
- 如果目录已有更上层 README 或 spec，总是链接过去，而不是重复整份内容。
- 当一个章节描述多个文件、schema、产物或接口契约时，每个对象必须拆成独立小标题；例如 `文件内容契约` 下应分别写 `manifest.jsonl`、`meta.json`、`summary.json`，再配对应说明和 code block。

## 通用写作规则

- 优先使用本地仓库事实，不要发明不存在的结构。
- 把已确认事实和推断性建议分开写。
- 用具体路径、命令、入口、端口、endpoint、资源名替代抽象概述。
- 对依赖外部工具的 README，给出实际安装或使用命令，不要只提工具名。
- 如果 README 提到 `docker compose`，说明具体会拉起哪些服务，不要留下不透明依赖名。
- 如果仓库已经有文档中心，README 应作为地图而不是复制所有下游文档。

## README 质量门槛

一份好的 README 应该让读者能回答：

- 这份文档在讲什么？
- 它覆盖哪个边界？
- 从哪里开始？
- 主要入口、接口或命令是什么？
- 如果还要更深入，下一步该看哪里？
