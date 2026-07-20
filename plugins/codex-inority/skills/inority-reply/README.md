# inority-reply

This plugin-internal skill documents the host-aware reply contract used by
`codex-inority`.

The plugin root owns runtime activation:

- `hooks.json` registers `SessionStart` and `UserPromptSubmit`.
- `scripts/inority-context.mjs` injects memory and reply context.
- `references/` stores the CLI and Markdown templates.

There is no separate `CODEX_HOME/inority-reply` runtime and no skill-local hook installer.

## Current Format Contract

- CLI hosts use the three-line `Goal / Ambiguity / Risk` text header.
- Codex Desktop and editor hosts use the fenced `text` template.
- Unknown hosts fall back to the Markdown-safe template.
- Host detection runs in the Node plugin hook and does not require `bash` or WSL.
