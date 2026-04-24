# Inority Reply Install Surface

Central source for the host-aware inority reply hook.

## Layout

- `scripts/`: host detection, hook wrapper, and hook JSON patchers
- `references/`: CLI and Markdown reply-format templates
- `install.sh`: install runtime files into a target `CODEX_HOME`
- `uninstall.sh`: remove the installed runtime files and unregister hook entries
- `reinstall.sh`: uninstall then install to refresh runtime files and hook registration

## Install

```bash
bash ./install.sh
```

Optional flags:

- `--codex-home /path/to/.codex`

Default install target is `~/.codex/inority-reply/`.

## Uninstall

```bash
bash ./uninstall.sh
```

Optional flags:

- `--codex-home /path/to/.codex`

## Reinstall

```bash
bash ./reinstall.sh
```

Optional flags:

- `--codex-home /path/to/.codex`

## Runtime behavior

- `SessionStart`: prepend host-aware reply rules plus the selected template
- `UserPromptSubmit`: prepend a lightweight reminder that points back to the rules file
- `oh-my-codex` native hook passthrough is optional; if present, `inority-reply` merges its own context on top, and if absent, `inority-reply` still works on its own
- Rules file lookup order:
  - nearest upward `.codex/memory/USER.md` from the current working directory
  - `~/.codex/memory/USER.md`
- Template lookup is always relative to the installed package root
- Editor-hosted environments such as VS Code and Cursor should use the Markdown template
