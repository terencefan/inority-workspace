# Inority 记忆迁移

> 负责把外部或旧系统的 memory 理解后迁移进 inority 体系。  
> Responsible for understanding and migrating external or legacy memory into the inority system.

## 模块简介 | Overview

`inority-memory-migration` 是 `inority-memory` 的迁移专用 companion skill。它不负责 install / reflect / distill，而是专门处理“外部 memory 如何导入当前体系”的问题。

`inority-memory-migration` is the migration-specific companion skill to `inority-memory`. It does not own install / reflect / distill; it owns how foreign memory should be imported into the current system.

默认来源模型：

- 迁移来源优先是“其他工作区的 `.codex/` 目录”
- 重点理解其中非 `inority-memory` 体系的 `.md` 文件，例如 `user.md`、`memory.md`、`workspace.md`、`credential.md`
- 其中 `.codex/memory/` 目录下的日期 note 视作 dairy 来源
- dairy 迁移按日期写入 `.codex/memory/dairy/YYYY-MM-DD.md`，若同日期已存在则合并内容，不生成 `.migrated-*` 文件名

## 职责边界 | Responsibilities

负责：

- 识别来源 memory 是否为非 inority 风格
- 先理解来源内容，再生成迁移计划
- 在用户确认前阻止实际写入
- 规划来源文件到 `USER.md` / `SOUL.md` / `WORKSPACE.md` / `credential.yaml` / `dairy/` 的映射
- 提供并维护 `migrate` 命令
- 在迁移前说明备份和写入边界

不负责：

- `.codex/memory/` runtime 初始化
- 当前线程 reflection
- dairy distill

## 入口与公共接口 | Entrypoints

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 迁移脚本：`scripts/migrate.mjs`
- 扫描脚本：`scripts/scan-md.mjs`

默认流程：

1. 模型理解来源 memory
2. 生成 `1-backup.mjs`
3. 生成 `2-migrate.mjs`
4. 输出迁移计划并等待用户确认
5. 用户确认后，先执行 `1-backup.mjs`，再执行 `2-migrate.mjs`

确认格式：

- `Y`：执行当前计划
- `N`：取消当前计划

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | 迁移 skill 的权威边界说明 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名、默认 prompt 与显式调用策略 |
| `scripts/migrate.mjs` | 跨平台迁移命令实现 |
| `scripts/scan-md.mjs` | 扫描 legacy `.codex/*.md` 和日期 note 的来源入口 |
