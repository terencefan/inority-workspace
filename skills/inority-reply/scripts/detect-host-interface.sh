#!/usr/bin/env bash
set -euo pipefail

# Detect the likely host interface for the current Codex session.
# Output is one of:
#   - md
#   - cli
#   - unknown

has_editor_signal() {
  [[ -n "${VSCODE_IPC_HOOK_CLI-}" ]] \
    || [[ -n "${VSCODE_GIT_IPC_HANDLE-}" ]] \
    || [[ -n "${VSCODE_PID-}" ]] \
    || [[ -n "${CURSOR_TRACE_ID-}" ]] \
    || [[ -n "${CURSOR_TRACE_FILE-}" ]] \
    || [[ -n "${TERM_PROGRAM-}" && ( "${TERM_PROGRAM}" == "vscode" || "${TERM_PROGRAM}" == "cursor" ) ]]
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

if has_editor_signal; then
  printf 'md\n'
  exit 0
fi

if has_terminal_signal; then
  printf 'cli\n'
  exit 0
fi

printf 'unknown\n'
