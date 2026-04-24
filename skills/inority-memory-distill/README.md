# Inority Memory Distill

> 负责把历史 dairy note 蒸馏成 durable memory 候选，并在用户选择前保持只输出候选、不直接写入长期记忆。  
> Distills historical dairy notes into durable-memory candidates and stops at candidate output until the user chooses what to promote.

## 模块简介 | Overview

`inority-memory-distill` 是 `inority-memory` 体系里的 backlog 蒸馏子 skill。它面向 `.codex/memory/dairy/` 中已经落盘的历史 note，把单篇或最旧 note 处理成可提升到 `USER.md`、`SOUL.md`、`WORKSPACE.md` 或 `credential.yaml` 的候选项。

它只处理历史 dairy backlog，不负责：

- 初始化 `.codex/memory/`
- 修复 runtime entrypoints
- 对当前线程做 reflection

## 职责边界 | Responsibilities

负责：

- 选择或定位要处理的 dairy note
- 在未指定目标时回退到最旧的 dairy note
- 抽取 durable memory 候选
- 按 memory home 对候选分类
- 在用户确认前阻止直接写入长期记忆

不负责：

- `.codex/memory/` install / repair
- 当前线程 reflection
- 迁移外部 memory

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 最旧 dairy 选择脚本：`scripts/find-oldest-dairy.mjs`
- 蒸馏面说明：`references/distill-surface.md`

常用命令：

```bash
node scripts/find-oldest-dairy.mjs
```

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `inority-memory-distill` 的权威行为定义 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/distill-surface.md` | backlog 蒸馏的输入、输出与边界说明 |
| `scripts/find-oldest-dairy.mjs` | 定位最旧 dairy note 的辅助脚本 |
