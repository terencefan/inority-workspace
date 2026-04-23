#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HOST_INTERFACE="$("${SCRIPT_DIR}/detect-host-interface.sh")"

CLI_TEMPLATE="${PACKAGE_ROOT}/references/reply-format-cli.md"
VSCODE_TEMPLATE="${PACKAGE_ROOT}/references/reply-format-vscode.md"

usage() {
  cat <<'EOF'
Usage:
  select-reply-format.sh [--path|--host]

Behavior:
  default  Print the selected template contents
  --path   Print the selected template path
  --host   Print the detected host interface
EOF
}

resolve_template_path() {
  case "${HOST_INTERFACE}" in
    cli)
      printf '%s\n' "${CLI_TEMPLATE}"
      ;;
    vscode)
      printf '%s\n' "${VSCODE_TEMPLATE}"
      ;;
    *)
      printf '%s\n' "${CLI_TEMPLATE}"
      ;;
  esac
}

MODE="content"
if [[ $# -gt 1 ]]; then
  usage >&2
  exit 1
fi

if [[ $# -eq 1 ]]; then
  case "$1" in
    --path)
      MODE="path"
      ;;
    --host)
      MODE="host"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      usage >&2
      exit 1
      ;;
  esac
fi

case "${MODE}" in
  host)
    printf '%s\n' "${HOST_INTERFACE}"
    ;;
  path)
    resolve_template_path
    ;;
  content)
    cat "$(resolve_template_path)"
    ;;
esac
