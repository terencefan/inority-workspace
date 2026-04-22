#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="inority-handbook"
LEGACY_SERVICE_NAME="inority-runbook"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
WORKSPACE_ROOT="$(cd "${PROJECT_ROOT}/.." && pwd)"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
SERVICE_PATH="${SYSTEMD_USER_DIR}/${SERVICE_NAME}.service"
LEGACY_SERVICE_PATH="${SYSTEMD_USER_DIR}/${LEGACY_SERVICE_NAME}.service"

resolve_node_path() {
  if command -v node >/dev/null 2>&1; then
    command -v node
    return 0
  fi

  if [[ -s "${HOME}/.nvm/nvm.sh" ]]; then
    # Support nvm-managed Node.js in non-interactive WSL shells.
    # shellcheck disable=SC1090
    . "${HOME}/.nvm/nvm.sh" >/dev/null 2>&1
    if command -v node >/dev/null 2>&1; then
      command -v node
      return 0
    fi
  fi

  return 1
}

NODE_PATH="$(resolve_node_path || true)"
RG_PATH="$(command -v rg || true)"
SERVER_ENTRY_PATH="${PROJECT_ROOT}/build-server/server.js"
RG_ENVIRONMENT_LINE=""

if [[ -n "${RG_PATH}" ]]; then
  RG_ENVIRONMENT_LINE="Environment=HANDBOOK_RG_BIN=${RG_PATH}"
fi

if [[ -z "${NODE_PATH}" ]]; then
  echo "Node.js is not installed in WSL."
  echo "Install Node.js inside Ubuntu first, then rerun this script."
  exit 1
fi

echo "Building frontend with Vite..."
npm run build

if [[ ! -f "${SERVER_ENTRY_PATH}" ]]; then
  echo "Built server entry is missing."
  echo "Run npm run build successfully first, then rerun this script."
  exit 1
fi

mkdir -p "${SYSTEMD_USER_DIR}"

if systemctl --user list-unit-files "${LEGACY_SERVICE_NAME}.service" >/dev/null 2>&1; then
  systemctl --user disable --now "${LEGACY_SERVICE_NAME}.service" || true
fi

if [[ -f "${LEGACY_SERVICE_PATH}" ]]; then
  rm -f "${LEGACY_SERVICE_PATH}"
fi

cat > "${SERVICE_PATH}" <<EOF
[Unit]
Description=Inority Handbook
After=default.target
StartLimitIntervalSec=0

[Service]
Type=simple
WorkingDirectory=${PROJECT_ROOT}
ExecStart=${NODE_PATH} ${SERVER_ENTRY_PATH}
Restart=always
RestartSec=5
Environment=HANDBOOK_DOCS_ROOT=${WORKSPACE_ROOT}
Environment=HANDBOOK_DEFAULT_DOC=.codex/workspace.md
Environment=HANDBOOK_PORT=4177
Environment="HANDBOOK_GRAPHVIZ_FONT=Noto Sans CJK SC"
${RG_ENVIRONMENT_LINE}

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable "${SERVICE_NAME}.service" >/dev/null
systemctl --user restart "${SERVICE_NAME}.service"

echo "Installed ${SERVICE_NAME}.service"
systemctl --user --no-pager --lines=5 status "${SERVICE_NAME}.service"
echo
echo "For auto-start on WSL distro boot, run once with sudo:"
echo "  sudo loginctl enable-linger ${USER}"
