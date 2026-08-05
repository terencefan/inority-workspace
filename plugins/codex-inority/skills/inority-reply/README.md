# inority-reply

This plugin-internal skill documents the host-aware reply contract used by
`codex-inority`.

The plugin root owns runtime activation:

- `hooks/hooks.json` registers `SessionStart` for `startup|resume|compact` and
  `UserPromptSubmit` for every prompt.
- `scripts/inority-context.mjs` injects memory and reply context.
- `references/` stores the CLI and Markdown templates.

There is no separate `CODEX_HOME/inority-reply` runtime and no skill-local hook installer.

## Current Format Contract

- CLI hosts use a borderless, aligned three-row table with ANSI-yellow
  `Goal / Ambiguity / Risk` labels in the left column.
- Codex Desktop and editor hosts use the fenced `text` template.
- Unknown hosts fall back to the Markdown-safe template.
- Host detection runs in the Node plugin hook and does not require `bash` or WSL.
