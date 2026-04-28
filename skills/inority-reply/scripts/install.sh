#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/resolve-codex-home.sh"

CODEX_HOME="$(resolve_codex_home)"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --codex-home)
      CODEX_HOME="$2"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage:
  bash install.sh [--codex-home /path/to/.codex]

Default target:
  nearest upward .codex from the current working directory,
  otherwise <workspace-root>/.codex for the workspace that contains this inority-workspace repo
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
SCRIPTS_DIR="${INSTALL_ROOT}/scripts"
REFERENCES_DIR="${INSTALL_ROOT}/references"
RUNTIME_JSON="${INSTALL_ROOT}/runtime.json"

OMX_NATIVE_HOOK="${HOME}/.npm-global/lib/node_modules/oh-my-codex/dist/scripts/codex-native-hook.js"
if [[ -n "${OMX_NATIVE_HOOK_OVERRIDE-}" ]]; then
  OMX_NATIVE_HOOK="${OMX_NATIVE_HOOK_OVERRIDE}"
elif command -v npm >/dev/null 2>&1; then
  NPM_ROOT="$(npm root -g 2>/dev/null || true)"
  if [[ -n "${NPM_ROOT}" && -f "${NPM_ROOT}/oh-my-codex/dist/scripts/codex-native-hook.js" ]]; then
    OMX_NATIVE_HOOK="${NPM_ROOT}/oh-my-codex/dist/scripts/codex-native-hook.js"
  fi
fi
HAS_OMX_NATIVE_HOOK=false
if [[ -f "${OMX_NATIVE_HOOK}" ]]; then
  HAS_OMX_NATIVE_HOOK=true
fi

mkdir -p "${SCRIPTS_DIR}" "${REFERENCES_DIR}"

rm -f "${REFERENCES_DIR}/reply-format-vscode.md"

install -m 0755 "${SCRIPT_DIR}/detect-host-interface.sh" "${SCRIPTS_DIR}/detect-host-interface.sh"
install -m 0755 "${SCRIPT_DIR}/select-reply-format.sh" "${SCRIPTS_DIR}/select-reply-format.sh"
install -m 0755 "${SCRIPT_DIR}/native-hook-with-host-context.mjs" "${SCRIPTS_DIR}/native-hook-with-host-context.mjs"
install -m 0755 "${SCRIPT_DIR}/install-hooks.mjs" "${SCRIPTS_DIR}/install-hooks.mjs"
install -m 0755 "${SCRIPT_DIR}/uninstall-hooks.mjs" "${SCRIPTS_DIR}/uninstall-hooks.mjs"
install -m 0644 "${SKILL_ROOT}/references/reply-format-cli.md" "${REFERENCES_DIR}/reply-format-cli.md"
install -m 0644 "${SKILL_ROOT}/references/reply-format-md.md" "${REFERENCES_DIR}/reply-format-md.md"

if [[ "${HAS_OMX_NATIVE_HOOK}" == "true" ]]; then
  cat > "${RUNTIME_JSON}" <<EOF
{
  "omxNativeHook": "${OMX_NATIVE_HOOK}",
  "installedFrom": "${SKILL_ROOT}",
  "installedAt": "$(date -Iseconds)"
}
EOF
else
  cat > "${RUNTIME_JSON}" <<EOF
{
  "installedFrom": "${SKILL_ROOT}",
  "installedAt": "$(date -Iseconds)"
}
EOF
fi

node "${SCRIPTS_DIR}/install-hooks.mjs" \
  --codex-home "${CODEX_HOME}" \
  --wrapper-path "${SCRIPTS_DIR}/native-hook-with-host-context.mjs"

cat <<EOF
Installed inority-reply hook package.
  codex_home: ${CODEX_HOME}
  install_root: ${INSTALL_ROOT}
  hooks_file: ${CODEX_HOME}/hooks.json
  omx_native_hook: ${OMX_NATIVE_HOOK}
  omx_native_hook_enabled: ${HAS_OMX_NATIVE_HOOK}
EOF
