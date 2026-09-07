# Superset Backend

Use this reference after `$create-dashboard` routes the task to Apache Superset.

## Discovery

Discover rather than assume:

- Superset version, namespace, Deployment, Service, Ingress, and canonical URL
- SSO or local authentication path and an authorized dashboard owner
- metadata database and persistence model
- target database, schema, table, SQLAlchemy driver, and network path
- existing Database, Dataset, Chart, and Dashboard objects with matching identity

Inspect Secret key names without printing values. Keep datasource credentials
separate from Superset's own metadata database credentials.

## Read-Only Datasource Contract

Use a dedicated login role for Superset queries. Store its connection material
in a Secret owned by the Superset namespace or deployment authority. Do not use
the pipeline or ingestion RW role.

Verify through the exact Superset Database connection:

- `current_user` equals the intended reader role
- `SELECT=true` on every exposed relation
- `INSERT`, `UPDATE`, and `DELETE` are false
- database or schema `CREATE` is false

Superset stores an encrypted connection URI in its metadata database. Creating
or rotating a Kubernetes Secret does not automatically update that URI. Update
and revalidate the Superset Database object when the credential changes.

## Mutation Path

Prefer Superset's supported REST import and CRUD APIs when an authorized API
session exists. If the deployment exposes only SSO and no service API identity,
an authorized operator may use `superset shell` inside the live application
context for deterministic metadata changes.

When using app context:

- pass the SQLAlchemy URI through stdin or a mounted Secret, never argv
- create or reuse objects idempotently by stable name and identity
- bind the intended owner explicitly
- call dataset metadata discovery and inspect the resulting columns
- commit only after all required objects and relationships are valid
- do not write Superset metadata tables with raw SQL

## Dataset and Chart Contract

Prefer physical columns when the source table already exposes the dimension.
Use dataset-level calculated columns for stable reusable dimensions such as a
year extraction or star bucket. Keep expressions compatible with the actual
database dialect and test them through Superset.

Persist both chart `params` and `query_context`. A chart that exists in metadata
but lacks a valid QueryContext may appear saved while remaining impossible to
validate or render consistently.

For an adhoc row-count metric, use a backend-valid representation. In Superset
5.0, a `SIMPLE` metric with `column=null` can fail server-side processing. Use
an existing COUNT metric or a validated SQL metric such as `COUNT(*)`.

Bound high-cardinality distributions such as repositories with an explicit row
limit and deterministic ordering. Use explicit buckets for wide numeric ranges
when that communicates the distribution more clearly than raw values.

## Dashboard Layout Contract

Derive the layout schema from the live Superset version or a working dashboard.
For Superset 5.0 v2 layouts:

- `ROOT_ID` owns `GRID_ID`
- GRID owns ROW components
- each ROW has `meta.background`, normally `BACKGROUND_TRANSPARENT`
- each CHART component binds `chartId`, `sliceName`, UUID, height, and width
- the Dashboard-to-Slice relationship contains every rendered chart
- remove orphan components that are not reachable from ROOT

Missing `ROW.meta.background` can crash the browser with
`Cannot read properties of undefined (reading 'background')` even when every
chart query succeeds. Treat this as a required layout invariant.

Keep `native_filter_configuration` consistent with actual filter components.
Do not leave a native filter referencing a removed dataset, column, or chart.
Test both the canonical URL and URLs carrying native filter state.

## Verification Gates

Run all gates independently:

1. **Datasource identity**: verify the effective database user and RO grants.
2. **Dataset metadata**: verify required physical and calculated columns.
3. **Query execution**: execute every Chart QueryContext as the real dashboard
   owner through an authenticated request context and require success.
4. **Dashboard binding**: verify owner, published state, slice IDs, and layout
   reachability.
5. **Layout invariants**: validate ROW background metadata, CHART bindings, and
   absence of orphan components. Run
   `scripts/superset/validate-layout.py <dashboard-or-position-json>` against an
   exported artifact before browser validation.
6. **Browser rendering**: load the dashboard after SSO, inspect console errors,
   and confirm every required visualization renders.
7. **External path**: verify the canonical URL reaches the expected SSO or
   anonymous flow. Distinguish service reachability from a caller missing the
   organization's internal CA.

Do not declare success from QueryContext results alone. Query execution cannot
detect malformed browser layout metadata.

## Failure Modes

- `g.user` missing in CLI validation: execute inside an authenticated Flask
  request context as the intended owner rather than bypassing RBAC.
- QueryContext is null: persist the backend-version-compatible context generated
  from chart form data before server-side replay.
- COUNT metric fails on a null column: replace it with a valid stored metric or
  validated `COUNT(*)` SQL metric.
- Browser reads `background` from undefined: inspect every ROW component and
  compare the whole layout against a working live dashboard.
- Dashboard redirects to login: verify the SSO path before treating the redirect
  as a dashboard failure.
- TLS verification fails only from an unmanaged CLI: verify the internal CA
  chain separately. Do not disable certificate validation in production clients.
