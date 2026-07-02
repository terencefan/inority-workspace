# H Deployment Scaling

Use this reference when changing resources for an existing H deployment/modelset service.

## Read Before Write

Always read the current deployment detail first:

```text
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}
```

Preserve all behavior fields unless the user explicitly asks to change them:

- `image`
- `command`
- `env_vars`
- `ports`
- `gateway`
- `is_idle`
- `is_inference`
- `quota_group`
- `rolling_update`
- probes and storage settings

## Resource Fields

Resource shape:

```json
{
  "instance_type": {
    "gpu_count": 0,
    "cpu_count": 4,
    "memory": 8
  },
  "instance_count": 1,
  "replicas": 1
}
```

`memory` is in GiB in the H deployment UI. `cpu_count` is CPU cores. Use `gpu_count: 0` for CPU-only services.

## Update

Submit an update to:

```text
PUT /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}
```

Send a full deployment payload, not only `instance_type`, unless the API documentation or frontend confirms partial updates are accepted. H updates can trigger a rolling update or require a stop/start for command changes, but resource changes should still be verified from the returned detail.

## Verification

After updating, poll:

```text
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}
GET /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}/replicas?page=1&pageSize=20
```

Confirm:

- `instance_type.cpu_count`, `instance_type.memory`, and `instance_type.gpu_count` match the requested target.
- Deployment state is `Running`.
- Replica count is healthy.
- A representative health endpoint still responds from the relevant network path, such as `h-dev` for H-internal service-domain validation.

## Stop/Start

If a configuration update is stored in deployment detail but the current replica clearly still uses the old runtime state, stop and start the deployment only when the user requested the change and the service is safe to restart.

Use:

```text
PUT /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}/stop
PUT /kapis/modelset.modelpp.cn/v1alpha1/tenants/{tenant}/projects/{project}/modelsets/{id}/start
```

Wait for `Stopped` before starting again, then re-run the normal verification loop.
