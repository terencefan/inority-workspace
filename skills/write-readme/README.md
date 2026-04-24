# Write README

> 用于把粗糙需求或本地仓库上下文整理成可评审的 README 或 README 风格文档。  
> Turns rough requirements or local repository context into a reviewable README or README-style document.

## 模块简介 | Overview

`write-readme` 是面向 README 文档的写作 skill。它覆盖：

- 仓库根 README
- 模块或子目录 README
- API README
- docs index
- 部署 / 拓扑导向 README

它优先依赖本地仓库事实，而不是泛化的模板化文案。

## 职责边界 | Responsibilities

负责：

- 判定 README 类型并选择对应模板
- 读取现有 README 与必要上下文
- 产出可评审、边界清晰的 README 文档
- 在部署、接口、拓扑类场景下优先写现实状态

不负责：

- 把所有 README 都写成同一种形状
- 脱离仓库现状编造架构或运行方式

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- README 模板索引：`references/template.md`
- 项目 README 模板：`references/project-readme-template.md`
- API README 模板：`references/api-readme-template.md`
- 模块 README 模板：`references/module-readme-template.md`
- docs index 模板：`references/docs-index-readme-template.md`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `write-readme` 的工作流与写作规则 |
| `README.md` | 当前目录的人类可读入口 |
| `references/template.md` | 模板入口索引 |
| `references/project-readme-template.md` | 项目级 README 模板 |
| `references/api-readme-template.md` | API README 模板 |
| `references/module-readme-template.md` | 模块 README 模板 |
| `references/docs-index-readme-template.md` | 文档索引 README 模板 |
