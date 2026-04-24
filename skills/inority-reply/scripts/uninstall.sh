#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CODEX_HOME="${HOME}/.codex"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex-home)
      CODEX_HOME="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  bash uninstall.sh [--codex-home /path/to/.codex]
EOF
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

INSTALL_ROOT="${CODEX_HOME}/inority-reply"
UNINSTALLER="${INSTALL_ROOT}/scripts/uninstall-hooks.mjs"

if [[ -f "${UNINSTALLER}" ]]; then
  node "${UNINSTALLER}" --codex-home "${CODEX_HOME}"
else
  node "${SCRIPT_DIR}/uninstall-hooks.mjs" --codex-home "${CODEX_HOME}"
fi

rm -rf "${INSTALL_ROOT}"

cat <<EOF
Uninstalled inority-reply hook package.
  codex_home: ${CODEX_HOME}
  removed_root: ${INSTALL_ROOT}
EOF
