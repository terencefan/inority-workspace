---
name: grafana-dashboard
description: Use when working on Grafana dashboards in the local observability stack or Kubernetes cluster. This skill covers creating or updating dashboard JSON, importing dashboards through the Grafana API so they persist in PostgreSQL, verifying visibility through Grafana search, and cleaning up dashboards whose titles match a naming rule such as a Galaxy Library prefix.
---

# Grafana Dashboard

Use this skill when the task is about Grafana dashboards rather than generic metrics collection.

## When To Use

- A dashboard JSON must be created, edited, imported, or removed.
- Grafana is running in Kubernetes and dashboard state should persist in PostgreSQL.
- File provisioning should not be the long-term source of truth.
- A dashboard needs to be recovered from JSON or from Grafana resource storage.

## Cluster Contract Discovery

Discover these values from the target environment instead of embedding one
organization's infrastructure in the skill:

- Grafana namespace, Deployment, Service, and external endpoint
- PostgreSQL Service and authentication Secret when Grafana uses PostgreSQL
- Grafana API credential Secret or credential-memory key
- the explicit kubeconfig or Kubernetes context for the target cluster

Treat PostgreSQL as the durable source of truth for:

- dashboard metadata
- users
- preferences
- datasource metadata

Do not rely on old `grafana.db` or `emptyDir` data surviving pod restarts.

## Preferred Workflow

1. Confirm Grafana is using PostgreSQL with `GF_DATABASE_*` env vars.
2. Discover working Grafana API credentials before import. A credential Secret
   may contain only the password, while the persisted PostgreSQL username can
   differ from Grafana defaults.
3. Prepare or edit a standard Grafana dashboard JSON.
4. For an existing dashboard, read and preserve its `folderUid` and permission baseline before import.
5. Import through Grafana's supported API, not by manually patching business repo files.
6. Verify the folder, permission baseline, rendered panels, and `/api/search` result.
7. If a cleanup rule exists, delete dashboards by title or UID from Grafana's supported API or from PostgreSQL only when necessary.

Prefer the bundled import script for normal imports.

## Remote Dashboard Import Rules

When the target exposes a supported external Grafana endpoint:

- Resolve the canonical endpoint, namespace, credential source, and explicit
  kubeconfig from project rules or credential memory.
- Import and update dashboards through the external Grafana API:
  - `POST ${GRAFANA_URL}/api/dashboards/db`
  - `GET ${GRAFANA_URL}/api/dashboards/uid/<uid>`
  - `GET ${GRAFANA_URL}/api/search?query=<term>`
- Do not use a Pod-internal path, `kubectl exec`, or port-forward as the normal dashboard import path when the external endpoint is available.
- Do not use the default Kubernetes context as evidence for remote-cluster work.
  Pass the discovered kubeconfig or context explicitly.
- If a dashboard is meant to be visible without login, verify anonymous access separately with unauthenticated external requests to both the dashboard API and `/api/search`.

## Preserve Folder and Permissions

Treat folder placement as part of an existing dashboard's identity. Grafana's
`POST /api/dashboards/db` defaults to General when `folderUid` is omitted. An
overwrite can therefore move a dashboard out of its original folder and change
its inherited access even though no permission API was called.

For every update to an existing dashboard:

1. Read `GET /api/dashboards/uid/<uid>` and record
   `meta.folderUid`, `meta.folderTitle`, and the current version.
2. Read `GET /api/dashboards/uid/<uid>/permissions` as a baseline when access
   matters.
3. Send the recorded non-empty `folderUid` in the import payload:

   ```json
   {
     "dashboard": {},
     "folderUid": "the-existing-folder-uid",
     "overwrite": true
   }
   ```

4. If the existing dashboard is in General, preserve that intentionally. Never
   infer General merely because folder discovery failed.
5. After import, assert that `meta.folderUid` is unchanged and compare the
   permission baseline.

Never call a dashboard or folder permission mutation endpoint unless the user
explicitly requests an ACL change. Moving a dashboard back to its recorded
folder is recovery of the existing inheritance relationship, not an
authorization to redesign permissions.

An API response with `status=success` is insufficient when `folderUid` in the
response is empty unexpectedly. Stop and restore the recorded folder before
claiming success.

## Dashboard Authoring Rules

Use Grafana field units for display semantics instead of baking units into panel titles or PromQL unless the user explicitly asks for a fixed unit conversion.

- Dynamic values and attribution:
  - Do not add hardcoded variables, constants, replica counts, node names, GPU counts, IPs, run IDs, deployment names, or resource identities unless the dashboard's fixed scope or an external contract requires them.
  - Prefer live metric labels, Grafana template variables, service discovery, and dynamic PromQL joins.
  - Hardcode only stable scope selectors that define the dashboard itself, such as `application="unipercept"` on a dashboard dedicated to that application.
  - Verify that a dynamic join preserves the required attribution granularity. A node-level join must not be presented as exact per-GPU or per-replica attribution.
  - Do not replace missing dynamic data with a guessed constant. Render `N/A`, omit the candidate panel, or add an explicit data-availability explanation.
  - Every fallback branch must preserve the primary metric's semantics. For example, do not use the existence of replica telemetry as a fallback for replica health.
- Stat panels:
  - Default to `stat + sparkline` for user-facing stat cards.
  - Treat plain `stat` without a trend as the exception; only use it when the user explicitly asks for a static card or when a trend would be misleading.
  - In Grafana terms this means `type: stat` with `options.graphMode: area`.
  - The query should support trend rendering:
    - Prefer a range query with the panel reducer showing the latest value.
    - If the latest value is unstable or a range expression becomes awkward, use a two-query pattern: one range query for the sparkline and one instant query for the displayed aggregate.
  - Keep pressure / usage / throughput / rate cards visually consistent within the same row. Do not mix some cards with sparklines and some without unless the difference is intentional.
- Capacity / storage values:
  - Keep PromQL in raw bytes metrics such as `sum(ceph_cluster_total_bytes)`.
  - Set `fieldConfig.defaults.unit` to `decbytes`.
  - Let Grafana put `GB` / `TB` after the rendered value.
  - Panel titles should be semantic, e.g. `Raw Total`, `Raw Used`, `Used Capacity Trend`; do not write `Bytes`, `GB`, or `TB` in the title.
- Ratios that are naturally `0..1`:
  - Keep PromQL as a ratio, e.g. `used / total`.
  - Set `fieldConfig.defaults.unit` to `percentunit`.
  - Set decimals explicitly, usually `2`, when the card is user-facing.
- Throughput counters:
  - Use live verified `_total` counter names in `rate(...)`.
  - Do not use unverified short names such as `ceph_pool_rd`, `ceph_pool_wr`, `ceph_pool_rd_bytes`, or `ceph_pool_wr_bytes`.
- GPU power:
  - Use absolute watt thresholds for inference-service GPU power panels.
  - Treat values below `200 W` as near-idle / almost no active task and render them with Grafana color `dark-red`.
  - Use the standard threshold steps `dark-red` below `200 W`, `red` from `200 W`, `yellow` from `320 W`, `light-green` from `352 W`, `green` from `480 W`, and `dark-green` from `600 W`.
- Candidate panels:
  - If a metric name is not yet verified in the live datasource, mark the panel as candidate or omit it from required acceptance.
  - Never fake a MON/MGR/PG state panel with static text while treating it as a verified metric panel.

Before declaring a dashboard done, verify:

- dashboard API returns the target uid and expected title
- an updated dashboard remains in its original `folderUid`
- the permission baseline is unchanged unless the user explicitly requested an ACL change
- dashboard JSON contains the required row/panel titles
- all required PromQL expressions return `status=success` through the real datasource proxy
- required panels and the full dashboard pass a rendering smoke test
- anonymous viewer access works when required
- `/api/search` can find the dashboard

## Auth Discovery

Prefer this sequence before importing:

```bash
kubectl get pod -n <grafana-namespace> -l <grafana-label-selector>
kubectl get secret -n <grafana-namespace> <grafana-credential-secret>
kubectl exec -n <grafana-namespace> deploy/<grafana-deployment> -- \
  curl -sS -u <candidate-user>:<password> <grafana-api-base>/api/user
```

Notes:

- Do not assume the username is `admin`.
- If a default username returns `Unauthorized`, discover the persisted
  administrator identity from the owning configuration instead of guessing.
- If `POST /api/dashboards/db` returns `Access denied`, confirm the same credentials succeed against `/api/user` and that `isGrafanaAdmin` is true.

## Standard Import

```bash
bash ~/.codex/skills/grafana-dashboard/scripts/import_dashboard_via_api.sh \
  --namespace <grafana-namespace> \
  --pod <grafana-pod> \
  --username <verified-user> \
  --password <verified-password> \
  --json /abs/path/dashboard.json \
  --folder-uid <recorded-existing-folder-uid>
```

The script:

- copies the JSON payload into the running Grafana pod
- refuses imports with unspecified placement; use `--allow-general` only for an
  intentionally verified General-folder target
- wraps it with the dashboard, `overwrite: true`, and the requested `folderUid`
- imports it through `POST /api/dashboards/db`

## Verification

Use one or more of:

```bash
kubectl exec -n <grafana-namespace> deploy/<grafana-deployment> -- \
  curl -sS -u <verified-user>:<verified-pass> <grafana-api-base>/api/search
```

```bash
kubectl exec -n <grafana-namespace> <postgres-pod> -- \
  env PGPASSWORD=<pass> psql -U <user> -d <database> \
  -c "select uid, title, slug from dashboard order by id desc limit 20;"
```

If `/api/search` is empty after a manual PostgreSQL change, prefer re-importing through the Grafana API instead of hand-writing unified resource rows.

For panel-level verification, do not stop at "dashboard imported successfully". Also verify the actual datasource behavior:

```bash
kubectl exec -n <grafana-namespace> deploy/<grafana-deployment> -- \
  curl -sS -u <verified-user>:<verified-pass> -G \
    <grafana-api-base>/api/datasources/proxy/uid/<datasource-uid>/api/v1/query \
    --data-urlencode 'query=<promql>'
```

Use this when a panel is blank but other dashboards still have data. It helps separate:

- broken dashboard PromQL
- empty series in the selected time range
- bad variable interpolation
- datasource/backend failures

## Cleanup Rules

If the user wants dashboards removed by naming convention, first list them:

```bash
curl -sS -u <verified-user>:<verified-pass> \
  "<grafana-api-base>/api/search?query=<title-prefix>"
```

When dashboards were created through the supported API, prefer deleting them through Grafana UI or API. Use direct PostgreSQL deletes only when the dashboard exists only in unified resource tables or the user explicitly wants low-level cleanup.

## Current Guidance

- Do not store business dashboard JSON in application repos by default.
- Prefer importing dashboards into Grafana so PostgreSQL persists them.
- Keep cluster-specific operational notes in docs, not in business service code.

## Failure Modes

- `Access denied` from `/api/dashboards/db`: the authenticated user is not allowed to create dashboards.
- `Unauthorized` from `/api/user`: the password may be correct but the username is wrong for the persisted Grafana database state.
- Dashboard exists in PostgreSQL resource tables but is invisible in UI: it was inserted in the wrong format or bypassed the supported API path.
- Search returns empty after import attempt: verify authenticated `/api/user`, then inspect Grafana logs and the `dashboard` table.
- Pod restart loses a dashboard: Grafana is still using SQLite or `emptyDir` instead of PostgreSQL.

## Dashboard Lessons

### Verify live metric names before trusting the spec

Do not assume the histogram or counter name in the spec still matches live data. In this cluster a dashboard used `api_request_duration_bucket`, but the live metric was `api_request_duration_milliseconds_bucket`. The result was that every P95 panel looked blank even though request data existed.

Before debugging panel layout, verify the live datasource has the metric:

```bash
kubectl exec -n <grafana-namespace> deploy/<grafana-deployment> -- \
  curl -sS -u <verified-user>:<verified-pass> \
    <grafana-api-base>/api/datasources/proxy/uid/<datasource-uid>/api/v1/label/__name__/values
```

If needed, query the exact candidate metrics directly and compare results.

### Treat blank panels as a query-semantics problem first

When a panel is blank, check whether the PromQL returns:

- a real series with values
- an empty vector
- `NaN`

These behave differently in Grafana and require different fixes:

- empty vector: often needs `or on() vector(0)` or a join against an existing base series
- `NaN`: often means the histogram/rate window has insufficient samples
- real series but blank panel: check panel options, transformations, or variable state

### For success-rate trends, empty error series can erase the whole line

If success rate is modeled as `1 - error_rate`, a naive query like:

```promql
1 - sum by (caller) (rate(error_metric[5m])) / sum by (caller) (rate(total_metric[5m]))
```

can disappear entirely when the error side has no series. In that case, join a zero-valued base derived from the total series so callers with no errors still render as `1`.

### For stat cards, match query mode to the intended visual

There are now two supported `Stat` patterns:

- default: `stat + sparkline`
- exception: plain `stat` without trend

Guidance:

- For `stat + sparkline`, use a range query or a range + instant two-query pattern so the panel can show both the latest value and a trend.
- For plain `stat`, prefer:
  - `instant: true`
  - `range: false`
- If a range query makes the panel go blank or unstable, first test whether the expression is better split into:
  - one range query for the sparkline
  - one instant query for the displayed value

Do not keep a plain stat card only because it is easier to query. The default visual for user-facing stats is still `stat + sparkline`.

### Avoid variable dependency cycles

Do not create mutual dependencies between variables such as:

- `api` filtered by `$method`
- `method` filtered by `$api`

This can cause one variable to resolve to empty first and blank the whole dashboard. Keep variable dependencies one-directional whenever possible.

### Display-name variables must still align with metric label values

If Prometheus stores `caller` as a stable ID, the Grafana variable value must still be that ID even if the dropdown text shows a human-friendly display name. Use:

- `__value` = stable ID used in metrics
- `__text` = display name shown in the UI

If the variable value is switched to display name while the metric label still stores ID, every panel filtered by `caller=~"$caller"` will go blank.

### When some callers show `NaN` in P95, it does not always mean the dashboard is broken

For histogram-based P95 panels, `NaN` usually means that caller had insufficient samples in the current rate window. Distinguish this from:

- no histogram metric at all
- wrong metric name
- broken label filters

Use direct datasource queries before changing the dashboard.
