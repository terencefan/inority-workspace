# H Deployment Service Operations

Use this reference when creating, updating, validating, or troubleshooting H deployment/modelset services. Read `browser-session.md` first when the operation depends on the user's H console login state.

## API Shape

The deployment console uses the modelset API:

```text
/kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets
```

For service details and updates:

```text
/kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}
```

Do not guess field names from the response alone. The H frontend form submits snake_case keys such as `quota_group`, `is_idle`, `is_inference`, `env_vars`, `instance_type`, `rolling_update`, `container_port`, and `host_port`. If direct API calls fail, drive the console form or capture the frontend request body from the browser session.

## Normal CPU Service Checklist

Before creating or updating a deployment, verify:

- Deployment mode: normal deployment uses `is_idle: false`.
- Inference mode: set `is_inference: false` for a plain service. If this is wrong, the backend may try to create service access keys and fail with `accesskey creation failed`.
- Quota group: CPU groups usually have quota labels indicating `machine-type` or `machine_type` as `CPU`.
- Image: use the exact registry path visible in the deployment image selector.
- Command: keep image defaults unless H requires an explicit command.
- Env vars: preserve existing values when updating. For `nginx-reverse-proxy`, set `PROXY_PASS`; a placeholder can be used only for health checks.
- Ports: ensure container port and external service port match the process actually listening in the container.
- Gateway: enable it when public service-domain access is expected.

## Image Selector Gotcha

When using browser automation, setting the visible image field is not always enough. The custom `ImageSelector` component may leave the actual form field empty, causing the API request to create a deployment with `image: ""`.

Mitigation:

- Prefer selecting the image through the UI component or capture the submitted request body before trusting the created resource.
- After creation, immediately read the deployment detail and verify the `image` field.
- If `image` is empty, update the deployment with the correct image before validating the endpoint.

## Reverse Proxy Nginx Notes

The `nginx-reverse-proxy` image depends on the nginx Docker entrypoint to run scripts under `/docker-entrypoint.d/`. If H startup command overrides bypass the entrypoint, nginx may keep the default site and listen on port 80 while the service routes to 8000.

For this image, use:

```bash
/docker-entrypoint.sh nginx -g 'daemon off;'
```

If using a placeholder upstream, set:

```text
PROXY_PASS=http://127.0.0.1:1
```

This makes `/healthz` usable for deployment validation, while `/` will fail until a real upstream is configured.

## Validation

Read service and replica state:

```text
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}/replicas?page=1&pageSize=20
```

Expected stable state:

- Deployment `status` is `Running`.
- `ready_replicas` equals `total_replicas`.
- Replica status is `Running` and latest condition is `Ready`.

Endpoint validation should match the network path:

- From the H login node, public service domains may be reachable even when the local workstation cannot access them.
- For `nginx-reverse-proxy`, verify `http://{public_domain}/healthz`; HTTPS may fail depending on the service-domain entry and network path.
- If gateway reaches the service but returns an upstream connection error, check whether the container process is listening on the configured `container_port`.

## Logs

Use the modelset logs endpoint to inspect startup behavior:

```text
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}/logs/query_range?replica={replica_id}&start={unix_seconds}&end={unix_seconds}
```

If only early worker-init logs appear, widen the time range and return only the tail. For nginx, look for entrypoint output and the configured listen port. A running replica can still be unusable if the command launched nginx on a different port than the service route.
