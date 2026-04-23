# inority-workspace

> 这个仓库是当前 workspace 的 Codex 资产源代码仓，不是单一产品服务；这里维护可复用的 skills、memory、Codex 安装资产，以及本地 handbook。

## 项目简介

`inority-workspace` 的职责是把“需要长期维护、又不应该直接散落在运行时 `.codex/` 目录里”的内容集中管理起来，再按边界同步到真正的运行入口。

这个仓库当前主要承载四类内容：

- workspace-local 的 Codex skills
- 跨环境可复用的 memory 文件
- 需要安装到 `~/.codex/` 或项目 `.codex/` 的 Codex 运行时资产
- 本地 handbook 站点及其 runbook 文档

它更像一个“工作区控制面源码仓”，而不是一个带统一构建入口的应用 monorepo。

## 开发与启动

这个仓库现在可以优先从根目录统一使用 npm 管理；只有在排障、补脚本或调试单个子模块时，才需要下钻到子目录。

先安装根目录依赖：

```bash
cd /home/fantengyuan/workspace/inority-workspace
npm install
```

这个 `npm install` 会安装 root workspace 元数据，并把 `handbook/` 的依赖一并装好。

常用根级入口：

```bash
npm run codex:install
npm run codex:uninstall
npm run handbook:dev
npm run handbook:build
```

如果某个安装脚本需要额外参数，用 npm 的 `--` 透传：

```bash
npm run codex:install:workspace-memory -- --workspace-root /path/to/workspace
npm run codex:install:reply-format-hook -- --codex-home /path/to/.codex
```

这个仓库没有单一的业务型根级启动命令，通常按下面几类入口工作：

### 1. 修改和维护 skills / memory

直接编辑本仓库里的源文件，再按既有约定把入口链接回运行时目录：

- skills 入口保持在 `../.codex/skills/`
- memory 入口保持在 `../.codex/memory/`

原则上：

- skills 逐个目录链接，不要整棵 `skills/` 一次性软链出去
- memory 逐个文件链接，保持 `.codex/memory/` 的稳定入口

### 2. 安装 Codex 运行时资产

当前已沉淀的安装型资产包括：

- reply-format hook
- workspace memory 安装包

```bash
npm run codex:install:reply-format-hook
npm run codex:install:workspace-memory
```

其中 `SOUL.md` / `USER.md` 会以软链接方式安装到目标 workspace 的
`.codex/memory/`，因为它们属于可同步资产；`WORKSPACE.md` / `credential.yaml`
和 `dairy/` 仍保持本地私有。

卸载：

```bash
npm run codex:uninstall:reply-format-hook
npm run codex:uninstall:workspace-memory
```

默认会安装到 `~/.codex/reply-format-hook/`，并更新 `~/.codex/hooks.json` 中对应的 hook 注册。

### 3. 启动本地 handbook

```bash
npm run handbook:dev
```

生产式本地运行：

```bash
npm run handbook:build
npm run handbook:start
```

## 架构设计

> 先把“源码位置”和“运行时入口”分开理解，再看每一类资产如何被消费。

这个仓库里的内容大多不是直接被 Codex 读取的最终入口，而是“源代码/源文档”。真正的运行时入口通常在两类位置：

- workspace 级入口：`../.codex/...`
- 用户级入口：`~/.codex/...`

当前关系可以概括为：

```dot
digraph G {
  rankdir=LR;
  graph [bgcolor="transparent"];
  node [shape=box, style="rounded"];

  repo [label="inority-workspace\n源码与可维护资产"];
  skills [label="skills/\n工作流与执行规范"];
  memory [label="memory/\n可复用记忆源文件"];
  codex [label="codex/\n可安装的 Codex 运行时资产"];
  handbook [label="handbook/\n本地文档站点"];

  workspaceCodex [label="../.codex/\nworkspace 运行时入口"];
  userCodex [label="~/.codex/\n用户级运行时入口"];
  reader [label="Codex / OMX / 本地使用者"];

  repo -> skills;
  repo -> memory;
  repo -> codex;
  repo -> handbook;

  skills -> workspaceCodex [label="逐项链接"];
  memory -> workspaceCodex [label="逐文件链接"];
  codex -> userCodex [label="install.sh / uninstall.sh"];
  handbook -> reader [label="本地 HTTP 站点"];
  workspaceCodex -> reader;
  userCodex -> reader;
}
```

对维护者来说，关键边界是：

- 想改 skill 行为，改这里的 `skills/` 源码，不要只改运行时链接目标
- 想改长期 memory，改这里的 `memory/` 源文件，不要只改临时副本
- 想加可安装能力，放到 `codex/`，并提供清晰的 install / uninstall 面
- 想补文档或 runbook 入口，优先放在 `handbook/`

## 代码结构

| 路径 | 说明 |
|------|------|
| `skills/` | workspace-local 的 Codex skills 源码目录，每个 skill 独立维护自己的 `SKILL.md`、脚本和参考资料 |
| `memory/` | 跨环境可复用的 memory 源文件，例如 `SOUL.md`、`USER.md` |
| `codex/` | 需要安装到 `~/.codex/` 或项目 `.codex/` 的运行时资产，目前已有 `reply-format-hook/` 和 `workspace-memory/` |
| `handbook/` | 本地 handbook 站点代码、运行脚本以及 `runbook/` 文档目录 |
| `handbook/runbook/` | 执行型 runbook 文档入口，供 handbook 站点和实际运维流程消费 |

## 部署拓扑

> 这个仓库本身不作为独立服务部署；真正的“落点”是 workspace `.codex`、用户 `~/.codex` 和本地 handbook 进程。

当前真实拓扑分三类：

1. `skills/` 和 `memory/`
   以源码形式保存在本仓库，通过软链接或稳定入口映射到 `../.codex/`。
2. `codex/`
   以安装包形式保存在本仓库，通过安装脚本把运行时文件写入 `~/.codex/`，例如 reply-format hook。
3. `handbook/`
   作为本地开发服务器运行，默认从 workspace 根目录读取 Markdown 内容并对外提供浏览入口。

这意味着：

- 根 README 负责说明“去哪里改”
- 根级 `package.json` 负责统一提供安装、卸载和 handbook 运行入口
- `../.codex` 和 `~/.codex` 负责“实际怎么生效”
- 各子目录 README 负责“具体边界内怎么用”

## 文档链接

- [memory 说明](./memory/README.md)
- [handbook 说明](./handbook/README.md)
- [reply-format hook 说明](./codex/reply-format-hook/README.md)
- [workspace memory 说明](./codex/workspace-memory/README.md)
