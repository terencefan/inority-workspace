# memory

Cross-environment reusable memory assets live in this directory.

## Scope

- `SOUL.md`: agent 的稳定行事风格
- `USER.md`: 用户个人偏好
- runtime `WORKSPACE.md`: 由目标工作区的 authority 仓库维护，不进入本目录
- 具体 workflow、工具和领域规则由对应 skill 维护，不写入 memory

## Install Contract

- `SOUL.md` 和 `USER.md` 是跨环境复用的 Git authority 文件。
- 目标工作区 `.codex/memory/` 使用相对软链接指向本目录中的 authority
  文件，不复制内容，不维护第二份来源。
- `WORKSPACE.md` 由目标工作区自己的 authority 仓库维护，并从
  `.codex/memory/` 建立软链接。
- workspace-local sensitive files 保留在 `.codex/memory/`，不得进入本目录
  或 Git。

当前工作区标准链接为：

```text
.codex/memory/USER.md -> ../../inority-workspace/memory/USER.md
.codex/memory/SOUL.md -> ../../inority-workspace/memory/SOUL.md
.codex/memory/WORKSPACE.md -> ../../opendatalab-skills/memory/WORKSPACE.md
```

以下 workspace-local sensitive memory 作为本地真实文件保留：

- `credential.md`：credential 总索引；按用途指向 `credential.d/*.yaml`
- `credential.d/`：分类保存的本地敏感 credential YAML
- `dairy/`
