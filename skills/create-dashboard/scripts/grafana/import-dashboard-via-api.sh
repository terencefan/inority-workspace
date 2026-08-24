#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  import-dashboard-via-api.sh \
    --namespace observability \
    --pod grafana-xxxx \
    --username admin \
    --password-stdin \
    --json /abs/path/dashboard.json \
    --folder-uid existing-folder-uid

Imports a Grafana dashboard JSON through the selected Grafana pod using
POST /api/dashboards/db so the dashboard is persisted in Grafana's database.

Pass the dashboard's existing folder uid on updates. Use --allow-general only
when General is the intentionally verified target folder.
EOF
}

namespace=""
pod=""
username=""
password_stdin="false"
json_path=""
folder_uid=""
allow_general="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --namespace)
      namespace="${2:-}"
      shift 2
      ;;
    --pod)
      pod="${2:-}"
      shift 2
      ;;
    --username)
      username="${2:-}"
      shift 2
      ;;
    --password-stdin)
      password_stdin="true"
      shift
      ;;
    --json)
      json_path="${2:-}"
      shift 2
      ;;
    --folder-uid)
      folder_uid="${2:-}"
      shift 2
      ;;
    --allow-general)
      allow_general="true"
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$namespace" || -z "$pod" || -z "$username" || -z "$json_path" || "$password_stdin" != "true" ]]; then
  usage >&2
  exit 2
fi

IFS= read -r password
if [[ -z "$password" ]]; then
  echo "Password stdin is empty" >&2
  exit 2
fi

if [[ ! -f "$json_path" ]]; then
  echo "Dashboard JSON not found: $json_path" >&2
  exit 1
fi

if [[ -n "$folder_uid" && "$allow_general" == "true" ]]; then
  echo "--folder-uid and --allow-general are mutually exclusive" >&2
  exit 2
fi

if [[ -z "$folder_uid" && "$allow_general" != "true" ]]; then
  echo "Refusing an import without folder placement. Pass the existing --folder-uid or explicitly use --allow-general." >&2
  exit 2
fi

tmp_payload="$(mktemp /tmp/create-dashboard-grafana-import.XXXXXX.json)"
tmp_auth="$(mktemp /tmp/create-dashboard-grafana-auth.XXXXXX.conf)"
remote_suffix="${RANDOM}-$$"
remote_payload="/tmp/create-dashboard-grafana-import.${remote_suffix}.json"
remote_auth="/tmp/create-dashboard-grafana-auth.${remote_suffix}.conf"
cleanup() {
  rm -f "$tmp_payload" "$tmp_auth"
}
trap cleanup EXIT

python3 - "$json_path" "$tmp_payload" "$folder_uid" <<'PY'
import json
import sys

src = sys.argv[1]
dst = sys.argv[2]
folder_uid = sys.argv[3]

with open(src, "r", encoding="utf-8") as f:
    dashboard = json.load(f)

payload = {"dashboard": dashboard, "overwrite": True}
if folder_uid:
    payload["folderUid"] = folder_uid

with open(dst, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False)
PY

auth_header="$(printf '%s' "${username}:${password}" | base64 | tr -d '\n')"
umask 077
printf 'header = "Authorization: Basic %s"\n' "$auth_header" > "$tmp_auth"
unset password auth_header

kubectl cp "$tmp_payload" "${namespace}/${pod}:${remote_payload}"
kubectl cp "$tmp_auth" "${namespace}/${pod}:${remote_auth}"

kubectl exec -n "$namespace" "$pod" -- sh -lc \
  "status=0; chmod 600 '${remote_auth}' && curl -sS --config '${remote_auth}' \
  -H 'Content-Type: application/json' --data @'${remote_payload}' \
  http://127.0.0.1:3000/api/dashboards/db || status=\$?; \
  rm -f '${remote_auth}' '${remote_payload}'; exit \$status"
