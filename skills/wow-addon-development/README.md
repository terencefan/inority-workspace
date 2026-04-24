# WoW Addon Development

> 用于 World of Warcraft 插件的开发、调试、重构、兼容性检查与维护文档整理。  
> Use this skill for World of Warcraft addon development, debugging, refactoring, compatibility review, and maintenance-facing documentation.

## 模块简介 | Overview

`wow-addon-development` 面向 WoW addon 的 Lua / XML / TOC 代码库。它覆盖：

- `.toc` 加载顺序
- SavedVariables 与运行时状态
- 事件驱动 UI 逻辑
- Retail / Classic 兼容性
- 大文件 Lua 重构与模块抽取

它把 WoW addon 视为严格依赖加载顺序和事件流的应用，而不是普通脚本堆。

## 职责边界 | Responsibilities

负责：

- 阅读和解释 addon 结构
- 调试 Lua / XML / SavedVariables 问题
- 评估兼容性与 Blizzard API 封装
- 做低风险重构和维护型文档整理

不负责：

- 把运行时问题简化成单纯语法问题
- 忽略 `.toc` / 事件 / SavedVariables 的真实边界

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 文件模式参考：`references/file-patterns.md`
- SavedVariables / 事件参考：`references/savedvariables-and-events.md`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `wow-addon-development` 的工作流与排障顺序 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/file-patterns.md` | 常见 addon 文件模式与边界 |
| `references/savedvariables-and-events.md` | SavedVariables 与事件流参考 |
