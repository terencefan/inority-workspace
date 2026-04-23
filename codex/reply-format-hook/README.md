# Reply Format Hook

Central source for the host-aware reply-format hook.

## Layout

- `scripts/`: host detection, hook wrapper, and hook JSON patchers
- `references/`: CLI and VS Code reply-format templates
- `install.sh`: install runtime files into a target `CODEX_HOME`
- `uninstall.sh`: remove the installed runtime files and unregister hook entries

## Install

```bash
bash ./install.sh
```

Optional flags:

- `--codex-home /path/to/.codex`

Default install target is `~/.codex/reply-format-hook/`.

## Uninstall

```bash
bash ./uninstall.sh
```

Optional flags:

- `--codex-home /path/to/.codex`

## Runtime behavior

- `SessionStart`: prepend host-aware reply rules plus the selected template
- `UserPromptSubmit`: prepend a lightweight reminder that points back to the rules file
- Rules file lookup order:
  - nearest upward `.codex/memory/USER.md` from the current working directory
  - `~/.codex/memory/USER.md`
- Template lookup is always relative to the installed package root
