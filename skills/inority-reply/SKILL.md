---
name: inority-reply
description: Use when the user wants the inority reply-format behavior, host-aware reply formatting, or Codex hook installation and maintenance for reply formatting. This skill owns the hook install resources under `skills/inority-reply/` and should ensure the hook is installed before relying on its runtime behavior.
---

# Inority Reply

Use this skill for the inority-style reply-format system.

This skill owns both the reply-format workflow rules and the hook install resources that make the runtime formatting behavior active in Codex environments.

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

When this skill is explicitly invoked or clearly selected as the governing reply skill:

1. Check whether the hook is already installed in the target `CODEX_HOME`.
2. If the managed install root or hook registration is missing, install it before relying on hook-driven behavior.
3. If installation cannot run because of sandbox or permission limits, surface that immediately instead of pretending the hook is active.

Do not assume the hook is present just because this skill exists in `.codex/skills/`.

## Install Surface

- `skills/inority-reply/scripts/install.sh`
  Installs runtime files into the target `CODEX_HOME` and registers the managed hooks.
- `skills/inority-reply/scripts/uninstall.sh`
  Removes the installed runtime files and unregisters managed hooks.
- `skills/inority-reply/scripts/reinstall.sh`
  Reinstalls runtime files and refreshes the managed hook registration in the target `CODEX_HOME`.
- `skills/inority-reply/scripts/`
  Host detection, wrapper execution, and hook JSON patchers.
- `skills/inority-reply/references/`
  CLI and Markdown reply-format templates plus installer-facing docs.

## Runtime Model

The installed runtime root is `CODEX_HOME/inority-reply/`.

At runtime:

- `SessionStart` prepends host-aware reply rules plus the selected template
- `UserPromptSubmit` prepends a lightweight reminder pointing back to the rules file
- rules lookup prefers the nearest upward `.codex/memory/USER.md`, then falls back to `~/.codex/memory/USER.md`
- template lookup is relative to the installed package root

## Operational Rules

- Prefer `scripts/install.sh`, `scripts/uninstall.sh`, and `scripts/reinstall.sh` over manual hook editing.
- Keep the runtime templates in `references/` and sync them through the installer instead of duplicating them into `USER.md`.
- If the user asks to verify installation, check both the install root under `CODEX_HOME` and the managed entries in `hooks.json`.
- If the installed wrapper exists but points at stale paths, reinstall instead of hand-editing the generated runtime tree.

## Output Contract

When working under this skill:

- state whether the hook was already present or had to be installed
- name the target `CODEX_HOME`
- distinguish source files in `skills/inority-reply/` from installed runtime files under `CODEX_HOME/inority-reply/`

## Style Rules

- Keep explanation concise and operational.
- Treat hook installation as a concrete runtime prerequisite, not as implied metadata.
