# Inority Memory Reflect

> 负责从当前线程或刚结束的修复中提炼可复用经验，并在用户确认前只输出 memory 候选。  
> Extracts reusable lessons from the current thread or a just-finished repair, but stops at candidate output until the user selects what to promote.

## 模块简介 | Overview

`inority-memory-reflect` 是 `inority-memory` 体系里的 reflection 子 skill。它处理“刚刚发生的事”，把当前线程里的可复用经验整理成 durable memory 候选，而不是直接写入长期记忆。

它适合当前任务收尾后的复盘，不适合处理历史 dairy backlog，也不负责 runtime install / repair。

## 职责边界 | Responsibilities

负责：

- 从当前线程提炼候选经验
- 约束输出为可复用、可迁移的 lesson candidate
- 为候选选择合适的 memory home
- 在用户确认前阻止直接写入长期记忆

不负责：

- `.codex/memory/` runtime 初始化或修复
- 历史 dairy 的 backlog 蒸馏
- 外部 memory 迁移

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- reflection 面说明：`references/reflect-surface.md`

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `inority-memory-reflect` 的权威边界说明 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/reflect-surface.md` | 当前线程 reflection 的输入、边界与输出约束 |
