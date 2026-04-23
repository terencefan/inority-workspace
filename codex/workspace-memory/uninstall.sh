#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="${SCRIPT_DIR}"
DEFAULT_WORKSPACE_ROOT="$(cd "${PACKAGE_ROOT}/../../.." && pwd)"
SOURCE_MEMORY_DIR="$(cd "${PACKAGE_ROOT}/../../memory" && pwd)"
TEMPLATES_DIR="${PACKAGE_ROOT}/templates"

WORKSPACE_ROOT="${DEFAULT_WORKSPACE_ROOT}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace-root)
      WORKSPACE_ROOT="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  bash uninstall.sh [--workspace-root /path/to/workspace]
EOF
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

MEMORY_DIR="${WORKSPACE_ROOT}/.codex/memory"
MANIFEST_PATH="${MEMORY_DIR}/.inority-memory-install.env"

BACKUP_SOUL=""
BACKUP_USER=""
BACKUP_README=""
if [[ -f "${MANIFEST_PATH}" ]]; then
  # shellcheck disable=SC1090
  source "${MANIFEST_PATH}"
fi

restore_or_remove() {
  local target_path="$1"
  local expected_source="$2"
  local backup_path="$3"

  if [[ -L "${target_path}" ]] && [[ "$(readlink -f "${target_path}")" == "$(readlink -f "${expected_source}")" ]]; then
    rm -f "${target_path}"
    if [[ -n "${backup_path}" && -e "${backup_path}" ]]; then
      mv "${backup_path}" "${target_path}"
    fi
  fi
}

restore_or_remove "${MEMORY_DIR}/SOUL.md" "${SOURCE_MEMORY_DIR}/SOUL.md" "${BACKUP_SOUL-}"
restore_or_remove "${MEMORY_DIR}/USER.md" "${SOURCE_MEMORY_DIR}/USER.md" "${BACKUP_USER-}"
restore_or_remove "${MEMORY_DIR}/README.md" "${TEMPLATES_DIR}/runtime-memory-readme.md" "${BACKUP_README-}"

rm -f "${MANIFEST_PATH}"

cat <<EOF
Uninstalled workspace memory package.
  workspace_root: ${WORKSPACE_ROOT}
  memory_dir: ${MEMORY_DIR}
  preserved_local_only_files: WORKSPACE.md credential.yaml dairy/
EOF
