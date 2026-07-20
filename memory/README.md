# memory

Cross-environment reusable memory assets live in this directory.

## Scope

- `SOUL.md`: agent 的稳定行事风格
- `USER.md`: 用户个人偏好
- runtime `WORKSPACE.md`: 团队在当前工作区通用的偏好
- 具体 workflow、工具和领域规则由对应 skill 维护，不写入 memory
- public runtime-facing memory entrypoints are installed into target workspaces by
  `plugins/codex-inority/skills/inority-memory-maintenance/scripts/`

## Install Contract

- `SOUL.md` and `USER.md` are syncable assets and should be installed as copied
  regular files into the target workspace `.codex/memory/`
- `README.md` may also be installed as a copied regular compatibility entrypoint
  when a workspace still points agents here instead of `MEMORY.md`
- workspace-local sensitive files stay local and should not be versioned here as
  real content

The workspace entrypoint remains `../../.codex/memory/`, and reusable files should be copied there so the startup path stays stable without relying on symlinks.

Sensitive workspace-local memory content should stay outside this source directory
as real content:

- `WORKSPACE.md`
- `credential.md`：credential 总索引；按用途指向 `credential.d/*.yaml`
- `credential.d/`：分类保存的本地敏感 credential YAML
- `dairy/`
