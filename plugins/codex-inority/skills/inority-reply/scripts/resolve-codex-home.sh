#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REPO_ROOT="$(cd "${SKILL_ROOT}/../.." && pwd)"
DEFAULT_WORKSPACE_ROOT="$(cd "${REPO_ROOT}/.." && pwd)"

find_workspace_codex_home() {
  local probe="${PWD}"
  while true; do
    if [[ -d "${probe}/.codex" ]]; then
      printf '%s\n' "${probe}/.codex"
      return 0
    fi

    if [[ "${probe}" == "/" ]]; then
      break
    fi
    probe="$(dirname "${probe}")"
  done

  printf '%s\n' "${DEFAULT_WORKSPACE_ROOT}/.codex"
}

resolve_codex_home() {
  if [[ $# -gt 0 && -n "${1}" ]]; then
    printf '%s\n' "${1}"
    return 0
  fi

  find_workspace_codex_home
}

