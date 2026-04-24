# inority-memory

> 管理 inority 风格的 workspace memory runtime，负责 install、repair、entrypoint cleanup 与长期记忆落点治理。  
> Govern the inority-style workspace memory runtime, including install, repair, entrypoint cleanup, and durable-memory placement.

## 模块简介 | Overview

`inority-memory` 是当前 workspace 的 memory runtime 主 skill。它负责判断 `.codex/memory/` 是否已经初始化，并处理 runtime 本身的治理工作：

- install：初始化或修复 memory runtime
- repair / audit：修复或复核 runtime 完整性
- placement governance：指导长期记忆写入目标

`inority-memory` is the primary runtime-governance skill for this workspace. It checks whether `.codex/memory/` is initialized and handles runtime-focused workflows:

- install: initialize or repair the memory runtime
- repair / audit: repair or verify runtime integrity
- placement governance: route durable memory to the correct home

运行时入口约定：

- `.codex/memory/README.md` 是 inority-memory 体系的 canonical runtime entrypoint
- workspace 的 `AGENTS.md` 应先读这个入口，再决定是否继续读取具体 memory 文件

Runtime entrypoint contract:

- `.codex/memory/README.md` is the canonical runtime entrypoint for the inority-memory system
- workspace `AGENTS.md` should point agents there before they read individual memory files

## 职责边界 | Responsibilities

负责：

- 管理 `.codex/memory/` 的运行时结构
- 维护 install / uninstall 资源
- 维护 runtime 检查资源
- 指导内容写入 `USER.md`、`SOUL.md`、`WORKSPACE.md`、`credential.yaml`
- 发现旧入口或非 inority 风格 memory 时给出迁移路径
- 遇到非 inority 风格 memory 时，明确建议使用 `inority-memory-migration`

不负责：

- reply hook 的格式策略与安装
- 非 memory 主题的 workspace skill 行为
- 直接把未经用户确认的候选经验写入长期记忆

Responsible for:

- managing the runtime structure under `.codex/memory/`
- maintaining install / uninstall resources
- maintaining runtime integrity-check resources
- routing content into `USER.md`, `SOUL.md`, `WORKSPACE.md`, and `credential.yaml`
- suggesting `inority-memory-migration` when foreign memory needs to be imported

Not responsible for:

- reply hook formatting or installation
- non-memory workspace skill behavior
- current-thread reflection workflows
- dairy backlog distillation workflows

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 安装脚本：`scripts/install.mjs`
- 卸载脚本：`scripts/uninstall.mjs`
- 完整性检查脚本：`scripts/check-workspace.mjs`

Primary entrypoints:

- skill spec: `SKILL.md`
- agent metadata: `agents/openai.yaml`
- install script: `scripts/install.mjs`
- uninstall script: `scripts/uninstall.mjs`

常用命令：

```bash
node scripts/install.mjs
node scripts/uninstall.mjs
node scripts/check-workspace.mjs
```

## 模式优先级 | Mode Priority

`inority-memory` 只保留 runtime 自身的两类工作：

| Priority | Mode | 触发条件 / Trigger |
| --- | --- | --- |
| 1 | `install` | `.codex/memory/` 缺失，或缺少必需运行时入口 |
| 2 | `normal governance` | 其余 runtime 治理、复核、迁移、放置判断场景 |

初始化所需的最低 runtime 入口：

- `.codex/memory/`
- `.codex/memory/USER.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/credential.yaml`
- `.codex/memory/dairy/`

Required runtime entrypoints for considering the workspace initialized:

- `.codex/memory/`
- `.codex/memory/USER.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/credential.yaml`
- `.codex/memory/dairy/`

## 依赖关系 | Dependencies

这个 skill 依赖：

- `.codex/memory/USER.md` 中的 reply-format 约束
- `references/install-surface.md` 中的安装面说明
- `templates/` 下的 runtime 模板
- workspace 本地 `.codex/memory/` 目录作为运行时落点

This skill depends on:

- reply-format rules from `.codex/memory/USER.md`
- install-surface documentation in `references/install-surface.md`
- runtime templates under `templates/`
- the workspace-local `.codex/memory/` directory as the runtime target

If the skill encounters non-inority-style memory during inspection, it should suggest `inority-memory-migration` instead of silently forcing the source into the current layout.

## 扩展方式 | Extension

如果要扩展 `inority-memory`，优先遵循下面的边界：

1. 新增 mode 时，先更新 `SKILL.md` 里的优先级和触发条件。
2. 需要运行时资产时，优先放进 `scripts/`、`templates/` 或 `references/`。
3. 需要新的长期记忆写入规则时，先更新 placement rules，而不是只在 README 里补说明。
4. 反思保持在 `inority-memory-reflect`，蒸馏保持在 `inority-memory-distill`，迁移逻辑保持在 `inority-memory-migration`。

When extending `inority-memory`, prefer these constraints:

1. If you add a new mode, update the priority and trigger rules in `SKILL.md` first.
2. If you add runtime assets, place them under `scripts/`, `templates/`, or `references/`.
3. If you add durable-memory routing rules, update placement / distillation rules instead of documenting them only in the README.
4. Keep reflection in `inority-memory-reflect`, distillation in `inority-memory-distill`, and migration behavior in `inority-memory-migration`.

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `inority-memory` 的权威行为定义，包含 mode priority、memory model 与输出约束 |
| `README.md` | 当前目录的人类可读入口，提供中英文概览 |
| `agents/openai.yaml` | skill 展示名、默认 prompt 与隐式调用策略 |
| `references/install-surface.md` | install / uninstall 行为与 runtime 落盘边界说明 |
| `scripts/install.mjs` | 跨平台初始化或修复 `.codex/memory/` runtime |
| `scripts/uninstall.mjs` | 跨平台清理受管理的 install 资产，不触碰本地私有 memory 内容 |
| `scripts/check-workspace.mjs` | 复核 `.codex/memory/` runtime 是否完整，并检查 `AGENTS.md` 是否仍引用旧入口 |
| `templates/runtime-memory-readme.md` | runtime 侧 `README.md` 模板 |
| `templates/WORKSPACE.template.md` | 本地 `WORKSPACE.md` 初始化模板 |
| `templates/credential.template.yaml` | 本地 `credential.yaml` 初始化模板 |
