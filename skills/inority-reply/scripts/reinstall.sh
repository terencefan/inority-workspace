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
  bash reinstall.sh [--codex-home /path/to/.codex]
EOF
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

bash "${SCRIPT_DIR}/uninstall.sh" --codex-home "${CODEX_HOME}"
bash "${SCRIPT_DIR}/install.sh" --codex-home "${CODEX_HOME}"

cat <<EOF
Reinstalled inority-reply hook package.
  codex_home: ${CODEX_HOME}
EOF
