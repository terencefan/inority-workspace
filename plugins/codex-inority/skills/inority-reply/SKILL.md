---
name: inority-reply
description: Use when the user wants the codex-inority host-aware reply behavior or needs to inspect and maintain its plugin hook.
---

# Inority Reply

Use this skill for the inority-style reply-format system.

This skill owns the reply-format workflow rules used by the `codex-inority` plugin hook.

This is not a workspace-default skill. Do not auto-load it for unrelated work.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate the full live reply template here; the runtime templates stay in this skill's `references/` directory.

## Use This Skill When

- the user wants the inority reply style enabled
- the user asks to install, uninstall, repair, or verify the reply-format hook
- the user wants host-aware CLI vs Markdown reply formatting
- the user asks where the reply templates or hook wrapper live
- the user wants to rename, package, or govern the reply-format install surface

## Loading Rule

- Load this skill only when the task explicitly involves reply formatting, reply hooks, `inority-reply`, or the runtime reply install surface.
- Do not load it just because the workspace uses the inority reply style by default.

## Activation Rule

The plugin's default `hooks/hooks.json` owns activation. Verify the plugin is installed and
start a new thread before relying on newly changed hook behavior.

## Plugin Surface

- `../../hooks/hooks.json`: SessionStart and UserPromptSubmit registration.
- `../../scripts/inority-context.mjs`: memory and reply-context injection.
- `references/`: CLI and Markdown reply-format templates.

## Runtime Model

At runtime:

- `SessionStart` runs for `startup`, `resume`, and `compact`, then prepends loaded
  memory, host-aware reply rules, and the selected template
- `UserPromptSubmit` rereads and prepends the complete core-memory payload and
  selected reply template on every prompt
- rules lookup follows the memory root discovered by the plugin
- template lookup is relative to the plugin root
- Codex Desktop and editor hosts resolve to the Markdown template
- unknown hosts resolve to the Markdown-safe template
- host detection runs inside the Node hook without relying on `bash` or WSL

## Operational Rules

- Keep templates in `references/` instead of duplicating them into `USER.md`.
- If the user asks to verify installation, check `codex plugin list`, the plugin hook output, and a new thread.
- Prefer a fenced `text` block when Markdown hosts render alignment inconsistently.

## Output Contract

When working under this skill:

- state whether `codex-inority` is installed
- distinguish plugin source from the cached installed plugin

## Style Rules

- Keep explanation concise and operational.
- Treat hook installation as a concrete runtime prerequisite, not as implied metadata.
