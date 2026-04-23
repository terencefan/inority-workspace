#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="${SCRIPT_DIR}"

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
  bash install.sh [--codex-home /path/to/.codex]
EOF
      exit 0
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

INSTALL_ROOT="${CODEX_HOME}/reply-format-hook"
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

if [[ ! -f "${OMX_NATIVE_HOOK}" ]]; then
  echo "failed to locate OMX native hook at ${OMX_NATIVE_HOOK}" >&2
  echo "set OMX_NATIVE_HOOK_OVERRIDE if oh-my-codex is installed in a non-default location" >&2
  exit 1
fi

mkdir -p "${SCRIPTS_DIR}" "${REFERENCES_DIR}"

install -m 0755 "${PACKAGE_ROOT}/scripts/detect-host-interface.sh" "${SCRIPTS_DIR}/detect-host-interface.sh"
install -m 0755 "${PACKAGE_ROOT}/scripts/select-reply-format.sh" "${SCRIPTS_DIR}/select-reply-format.sh"
install -m 0755 "${PACKAGE_ROOT}/scripts/native-hook-with-host-context.mjs" "${SCRIPTS_DIR}/native-hook-with-host-context.mjs"
install -m 0755 "${PACKAGE_ROOT}/scripts/install-hooks.mjs" "${SCRIPTS_DIR}/install-hooks.mjs"
install -m 0755 "${PACKAGE_ROOT}/scripts/uninstall-hooks.mjs" "${SCRIPTS_DIR}/uninstall-hooks.mjs"
install -m 0644 "${PACKAGE_ROOT}/references/reply-format-cli.md" "${REFERENCES_DIR}/reply-format-cli.md"
install -m 0644 "${PACKAGE_ROOT}/references/reply-format-vscode.md" "${REFERENCES_DIR}/reply-format-vscode.md"

cat > "${RUNTIME_JSON}" <<EOF
{
  "omxNativeHook": "${OMX_NATIVE_HOOK}",
  "installedFrom": "${PACKAGE_ROOT}",
  "installedAt": "$(date -Iseconds)"
}
EOF

node "${SCRIPTS_DIR}/install-hooks.mjs" \
  --codex-home "${CODEX_HOME}" \
  --wrapper-path "${SCRIPTS_DIR}/native-hook-with-host-context.mjs"

cat <<EOF
Installed reply-format hook package.
  codex_home: ${CODEX_HOME}
  install_root: ${INSTALL_ROOT}
  hooks_file: ${CODEX_HOME}/hooks.json
EOF
