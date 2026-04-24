# Skill README Template

> 用一句中文概括这个 skill 的职责。  
> Summarize the skill responsibility in one English sentence.

## 模块简介 | Overview

`<skill-name>` 是 `<所属体系或用途>` 里的 `<skill 类型>`。它主要处理：

- `<覆盖面 1>`
- `<覆盖面 2>`
- `<覆盖面 3>`

如果这个 skill 有明确的激活条件、默认模式或非默认加载规则，也在这里简短说明。

## 职责边界 | Responsibilities

负责：

- `<职责 1>`
- `<职责 2>`
- `<职责 3>`

不负责：

- `<非职责 1>`
- `<非职责 2>`
- `<非职责 3>`

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- `<脚本 / 模板 / reference 入口 1>`
- `<脚本 / 模板 / reference 入口 2>`

常用命令：

```bash
<command 1>
<command 2>
```

如果该 skill 没有稳定 CLI，就删掉这个代码块。

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `<该 skill 的权威行为定义>` |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | `<展示名、prompt 或调用元数据>` |
| `<path>` | `<说明>` |
| `<path>` | `<说明>` |

## 使用说明 | Notes

- 优先写“这个 skill 是什么、解决什么问题”，不要把 `SKILL.md` 全量重写一遍。
- 只列出当前目录真实存在的入口、脚本、模板和 references。
- README 面向人类阅读；`SKILL.md` 仍是机器执行的权威来源。
- 若 skill 没有 `agents/`、`scripts/` 或 `references/`，就不要保留空占位。
