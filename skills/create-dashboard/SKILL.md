---
name: create-dashboard
description: Create, update, repair, validate, publish, or remove operational and analytical dashboards in Grafana or Apache Superset. Use when a task mentions dashboards, Grafana, Superset, panels, charts, datasets, PromQL, SQL distributions, dashboard imports, folders, permissions, native filters, rendering errors, or browser-visible dashboard validation.
---

# Create Dashboard

Use one workflow for dashboard intent, safety, and acceptance, then load exactly
one backend reference for implementation details.

## Route the Backend

- Read [references/grafana.md](references/grafana.md) for Grafana dashboard JSON,
  Prometheus-compatible datasources, PromQL, folders, API imports, panels, and
  Grafana rendering.
- Read [references/superset.md](references/superset.md) for Superset databases,
  datasets, calculated columns, charts, QueryContext, native filters, dashboard
  layout, and Superset rendering.
- If a task genuinely spans both systems, treat them as separate delivery
  targets. Do not transfer identity, permission, persistence, or query assumptions
  between them.

## Shared Workflow

1. Discover the live endpoint, version, namespace or deployment, authentication
   path, metadata store, datasource, and nearest owning configuration.
2. Read existing dashboard identity and access state before mutation. Preserve
   the UID or slug, owner, folder, publication state, and permission inheritance
   unless the user requests a change.
3. Confirm the data contract before authoring. Inspect real fields, labels,
   types, time semantics, cardinality, and representative aggregate results.
4. Use the least-privileged data account. Dashboard readers should use a
   dedicated read-only datasource credential. Keep write credentials outside
   the dashboard runtime.
5. Build the smallest layout that answers the user's questions. Prefer clear
   dimensions, explicit units, stable filters, bounded high-cardinality lists,
   and consistent visual semantics.
6. Mutate through the backend's supported API or import path. Use an authorized
   application context only when the supported API cannot be used and the
   backend reference explicitly permits it.
7. Validate data queries, persisted metadata, access controls, and browser
   rendering as separate gates.
8. Update the nearest owning automation or configuration after a live change.
   Do not leave production state reproducible only from chat history or `/tmp`.

## Redlines

- Never print, commit, log, or place secrets in command arguments. Pass secrets
  through protected environment, stdin, mounted Secret, or an approved client.
- Never assume that a successful create/import response means the dashboard is
  usable. Required queries and the full dashboard must render successfully.
- Never validate only the datasource query while ignoring browser layout,
  plugin configuration, filters, access, and persisted identity.
- Never use an application RW account when a dedicated RO datasource account
  can answer the dashboard queries. Verify effective privileges from the same
  runtime connection used by the dashboard.
- Never invent missing data, metric names, dimensions, counts, or attribution.
  Mark unavailable data explicitly or omit the unsupported visual.
- Never silently move an existing dashboard, change its owner, publish it,
  unpublish it, or alter ACL inheritance.
- Never hand-edit backend metadata tables as the normal authoring path.

## Acceptance

A dashboard is complete only when all applicable checks pass:

- identity, title, owner, publication state, folder, and permissions match intent
- datasource connection uses the intended read-only identity
- every required panel or chart query succeeds against the real datasource
- expected dimensions and row/cardinality bounds are present
- filters resolve without cycles, stale references, or empty-value deadlocks
- persisted layout and plugin metadata satisfy the live backend version
- a browser rendering smoke test shows the full dashboard and required visuals
- the canonical URL resolves through the intended SSO or anonymous path
- live state has a durable owning artifact or automation path

Do not replace browser rendering with metadata assertions. The two gates catch
different failures.
