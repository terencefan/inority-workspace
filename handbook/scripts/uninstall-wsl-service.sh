#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="inority-handbook"
LEGACY_SERVICE_NAME="inority-runbook"
SYSTEMD_USER_DIR="${XDG_CONFIG_HOME:-${HOME}/.config}/systemd/user"
SERVICE_PATH="${SYSTEMD_USER_DIR}/${SERVICE_NAME}.service"
LEGACY_SERVICE_PATH="${SYSTEMD_USER_DIR}/${LEGACY_SERVICE_NAME}.service"

if systemctl --user list-unit-files "${SERVICE_NAME}.service" >/dev/null 2>&1; then
  systemctl --user disable --now "${SERVICE_NAME}.service" || true
fi

if [[ -f "${SERVICE_PATH}" ]]; then
  rm -f "${SERVICE_PATH}"
fi

if systemctl --user list-unit-files "${LEGACY_SERVICE_NAME}.service" >/dev/null 2>&1; then
  systemctl --user disable --now "${LEGACY_SERVICE_NAME}.service" || true
fi

if [[ -f "${LEGACY_SERVICE_PATH}" ]]; then
  rm -f "${LEGACY_SERVICE_PATH}"
fi

systemctl --user daemon-reload

echo "Removed ${SERVICE_NAME}.service"
