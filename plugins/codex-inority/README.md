# Codex Inority

`codex-inority` combines workspace memory loading and host-aware reply contracts
as a Codex plugin.

Bundled skills:

- `inority-memory-maintenance`: install, repair, audit, and placement governance
- `inority-memory-reflect`: current-thread candidate reflection
- `inority-memory-distill`: historical dairy-note distillation
- `inority-reply`: host-aware reply-contract maintenance

## Runtime contract

- `SessionStart` runs after `startup`, `resume`, and `compact`, then discovers
  the nearest `.codex/memory/MEMORY.md`.
- It reads and injects `MEMORY.md`, `USER.md`, `SOUL.md`, `WORKSPACE.md`,
  `credential.md`, plus the nearest project `PROJECT.md` when present.
- It records the loaded file list and a SHA-256 digest in the injected context.
- `UserPromptSubmit` rereads and reinjects the complete core-memory payload,
  loaded-file list, SHA-256 digest, and reply template on every prompt. This is
  intentionally redundant so context compaction cannot leave only a stale hint.
- The `compact` session-start matcher immediately restores the same contract in
  the newly compacted context, before the next reply is generated.
- Secret-bearing `credential.d/*.yaml` files are never loaded automatically.

The plugin fails visibly when no memory entrypoint can be discovered; it never
claims memory was loaded based on a reminder alone.
