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
  bash install.sh [--workspace-root /path/to/workspace]
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
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "${MEMORY_DIR}" "${MEMORY_DIR}/dairy" "${MEMORY_DIR}/dairy/archive"

backup_file() {
  local target="$1"
  local backup_var_name="$2"
  if [[ -e "${target}" || -L "${target}" ]]; then
    local backup_path="${target}.bak.${TIMESTAMP}"
    mv "${target}" "${backup_path}"
    printf -v "${backup_var_name}" '%s' "${backup_path}"
  else
    printf -v "${backup_var_name}" '%s' ""
  fi
}

link_managed_file() {
  local source_path="$1"
  local target_path="$2"
  local backup_var_name="$3"

  if [[ -L "${target_path}" ]] && [[ "$(readlink -f "${target_path}")" == "$(readlink -f "${source_path}")" ]]; then
    printf -v "${backup_var_name}" '%s' ""
    return
  fi

  backup_file "${target_path}" "${backup_var_name}"
  ln -s "${source_path}" "${target_path}"
}

BACKUP_SOUL=""
BACKUP_USER=""
BACKUP_README=""

link_managed_file "${SOURCE_MEMORY_DIR}/SOUL.md" "${MEMORY_DIR}/SOUL.md" BACKUP_SOUL
link_managed_file "${SOURCE_MEMORY_DIR}/USER.md" "${MEMORY_DIR}/USER.md" BACKUP_USER
link_managed_file "${TEMPLATES_DIR}/runtime-memory-readme.md" "${MEMORY_DIR}/README.md" BACKUP_README

if [[ ! -e "${MEMORY_DIR}/WORKSPACE.md" && ! -L "${MEMORY_DIR}/WORKSPACE.md" ]]; then
  install -m 0644 "${TEMPLATES_DIR}/WORKSPACE.template.md" "${MEMORY_DIR}/WORKSPACE.md"
fi

if [[ ! -e "${MEMORY_DIR}/credential.yaml" && ! -L "${MEMORY_DIR}/credential.yaml" ]]; then
  install -m 0644 "${TEMPLATES_DIR}/credential.template.yaml" "${MEMORY_DIR}/credential.yaml"
fi

cat > "${MANIFEST_PATH}" <<EOF
INSTALLED_AT='$(date -Iseconds)'
WORKSPACE_ROOT='${WORKSPACE_ROOT}'
MEMORY_DIR='${MEMORY_DIR}'
MANAGED_SOUL_SOURCE='${SOURCE_MEMORY_DIR}/SOUL.md'
MANAGED_USER_SOURCE='${SOURCE_MEMORY_DIR}/USER.md'
MANAGED_README_SOURCE='${TEMPLATES_DIR}/runtime-memory-readme.md'
BACKUP_SOUL='${BACKUP_SOUL}'
BACKUP_USER='${BACKUP_USER}'
BACKUP_README='${BACKUP_README}'
EOF

cat <<EOF
Installed workspace memory package.
  workspace_root: ${WORKSPACE_ROOT}
  memory_dir: ${MEMORY_DIR}
  managed_files: SOUL.md USER.md README.md
  local_only_files: WORKSPACE.md credential.yaml dairy/
EOF
