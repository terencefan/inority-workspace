# Inority Reply

> 管理 inority 风格的 reply-format runtime，包括 host-aware 格式选择、hook 安装与卸载，以及相关脚本资源。  
> Governs the inority reply-format runtime, including host-aware format selection, hook install/uninstall, and the supporting scripts.

## 模块简介 | Overview

`inority-reply` 是 inority 体系里的回复格式与 hook 运行时 skill。它同时负责：

- reply-format 行为约束
- 按 host 选择 CLI / Markdown 模板
- Codex hook 的安装、卸载与重装

它不是 workspace 默认技能。只有在用户明确要求启用、修复或检查 reply-format 行为时才应加载。

## 职责边界 | Responsibilities

负责：

- reply-format hook 的安装与移除
- host interface 检测
- CLI / Markdown 回复模板选择
- native hook 包装器维护

不负责：

- workspace memory runtime 治理
- 非 reply-format 主题的通用工作流
- 在 README 或 skill 正文里复制 live reply template 内容

## 入口与公共接口 | Entrypoints

主入口：

- skill 文档：`SKILL.md`
- agent 元数据：`agents/openai.yaml`
- 安装脚本：`scripts/install.sh`
- 卸载脚本：`scripts/uninstall.sh`
- 重装脚本：`scripts/reinstall.sh`
- host 检测脚本：`scripts/detect-host-interface.sh`
- 模板选择脚本：`scripts/select-reply-format.sh`
- native hook 包装器：`scripts/native-hook-with-host-context.mjs`

常用命令：

```bash
bash scripts/install.sh
bash scripts/uninstall.sh
bash scripts/reinstall.sh
```

## 相关文件 | Related Files

| 路径 | 说明 |
| --- | --- |
| `SKILL.md` | `inority-reply` 的权威行为定义 |
| `README.md` | 当前目录的人类可读入口 |
| `agents/openai.yaml` | skill 展示名与调用元数据 |
| `references/install-surface.md` | hook install / uninstall 的边界说明 |
| `references/reply-format-cli.md` | CLI 场景下的回复模板 |
| `references/reply-format-md.md` | Markdown/编辑器场景下的回复模板 |
| `scripts/install-hooks.mjs` | hook 安装实现 |
| `scripts/uninstall-hooks.mjs` | hook 卸载实现 |
| `scripts/native-hook-with-host-context.mjs` | 按 host 注入回复上下文的 wrapper |
