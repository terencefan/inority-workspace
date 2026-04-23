#!/usr/bin/env bash
set -euo pipefail

# Detect the likely host interface for the current Codex session.
# Output is one of:
#   - vscode
#   - cli
#   - unknown

has_vscode_signal() {
  [[ -n "${VSCODE_IPC_HOOK_CLI-}" ]] \
    || [[ -n "${VSCODE_GIT_IPC_HANDLE-}" ]] \
    || [[ -n "${VSCODE_PID-}" ]] \
    || [[ -n "${TERM_PROGRAM-}" && "${TERM_PROGRAM}" == "vscode" ]]
}

has_terminal_signal() {
  [[ -t 0 ]] \
    || [[ -t 1 ]] \
    || [[ -n "${TERM-}" ]] \
    || [[ -n "${COLORTERM-}" ]] \
    || [[ -n "${TERM_PROGRAM-}" ]] \
    || [[ -n "${WT_SESSION-}" ]] \
    || [[ -n "${TMUX-}" ]]
}

if has_vscode_signal; then
  printf 'vscode\n'
  exit 0
fi

if has_terminal_signal; then
  printf 'cli\n'
  exit 0
fi

printf 'unknown\n'
