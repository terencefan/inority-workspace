# H rjob Scheduler Notes

Use this reference when the task involves H rjob/vcjob batch pipelines, multi-task jobs, dependency assumptions, DAG design, barrier jobs, or stage orchestration.

## Current Evidence

- H cluster local notes record that the development-machine + kubeconfig path covers `vcjob` / Volcano tasks, Pods, and image operations.
- On `h-dev`, the batch entrypoint found in July 2026 is `/usr/local/bin/rjob`.
- `rjob --help` exposes actions: `submit`, `patch`, `stop`, `delete`, `list`, `get`, `logs`, `events`, `clone`, and `download-logs`.
- `rjob submit --help` supports single-task and multi-task jobs, replicas, resource requests, mounts, auto-restart, gang-start, task affinity / anti-affinity, and related batch-task controls.
- `brainpp.rjob.struct.Task` contains a `dependsOn` field documented as task dependency, and serializes it into the task spec.
- The current `rjob submit` CLI help and argument parser do not expose a `depends-on`, `dependency`, `dag`, or `workflow` option.

## Known Quota Groups

These quota groups were observed in the `ailab-sciversealign` H project context. Treat them as local working knowledge, not a global H cluster inventory.

| Quota group | Observed type / behavior | rjob usage guidance |
|---|---|---|
| `sciversealign_cpu` | Present as `KUBEBRAIN_QUOTA_GROUP` in the `h-dev` workspace environment. A write-path rjob submit rejected it with `rjob can only use GPU/CPU workload quotagroup, but sciversealign_cpu is workspace type`. A later minimal single-task `predict_only` returned OK, but that does not override the write-path type rejection. | Do not use directly for rjob submission. Treat failures here as quota-group type mismatch before treating them as lack of compute resource. |
| `sciversealign_gpu` | Workload quota group accepted by rjob API. A 0-GPU / 1-CPU test rjob with task-level `dependsOn` was accepted, but queued with `insufficient group quota: cpu : 3073/3072 memory : 32222.4Gi/32221.4Gi`. Minimal single-task `predict_only` returned OK, so use actual rjob events for final judgment. | Can submit rjobs, including 0-GPU CPU-style tests, but avoid using it for CPU pipeline work while actual events show CPU/memory quota overfull. Re-check current events/quota before relying on it. |
| `sciversealign_cpu_task` | CPU workload quota group accepted by rjob API. A 0-GPU / 1-CPU test rjob with `task-b dependsOn task-a` submitted and started scheduling. It then stayed in queue with `pod group is not ready, 1 Pending, 2 minAvailable`, which points to `dependsOn` plus gang scheduling semantics rather than a quota exhaustion message. Minimal single-task `predict_only` returned OK. | Preferred known CPU rjob quota group for small CPU tests in this project. Do not interpret the `dependsOn` POC stall as "no resources"; use independent rjobs or marker/barrier orchestration for sequential stages. |

If a new quota group is discovered, verify it with a minimal dry-run or read-only quota check before documenting it here. Do not infer workload capability from the name alone.

Resource-state rule of thumb for these three groups:

- They are not all "out of resources".
- `sciversealign_cpu` is primarily a group-type problem for rjob.
- `sciversealign_gpu` had observed CPU/memory quota exhaustion in actual rjob events.
- `sciversealign_cpu_task` is the preferred CPU workload group; the observed multi-task dependency stall is a gang scheduling/dependency interaction, not direct proof of quota exhaustion.

## Interpretation

Treat H `rjob` as an H-platform wrapper around a Volcano-style batch job system, not as native Kubernetes `Job` and not as a general workflow/DAG engine.

Important boundaries:

- Kubernetes native `Job` does not provide `dependsOn` or DAG semantics.
- H `rjob` can express multi-task batch jobs and Volcano-style scheduling features.
- H `rjob` should not be assumed to support dependencies between separate rjob submissions.
- The internal `Task.dependsOn` field suggests task-level dependency may exist in the underlying schema, but it is not a stable CLI contract unless validated through Python SDK/raw spec and platform documentation.
- A tested `Task.dependsOn` rjob can serialize and submit, but the observed two-task POC produced a Volcano-style `minAvailable=2` gang scheduling condition while the dependent task had no replica created. Do not use this as the default sequential-stage mechanism unless the gang behavior can be controlled and re-verified.

## Design Guidance

For multi-stage pipelines, default to this pattern:

1. Submit each stage as an independent rjob or rjob array.
2. Use a barrier rjob to summarize upstream shard status.
3. Use shared storage markers such as `_SUCCESS`, `_FAILED`, `error.json`, and `_STAGE_SUCCESS` as business-state authority.
4. Let downstream rjobs check marker files before consuming upstream output.
5. Use platform scheduling for resources, queues, replicas, and retries, not as the only business-completion source.

For a six-stage image-processing pipeline, prefer:

```text
prepare-manifest
  -> image-quality
  -> image-quality-barrier
  -> full-quality
  -> repair
  -> report
```

Do not write an H-cluster design that depends on cross-rjob DAG unless one of these has been verified for that exact environment:

- official H documentation says cross-rjob dependency is supported;
- `rjob` CLI exposes a stable dependency option;
- a tested Python SDK/raw spec path can submit and observe `Task.dependsOn` safely;
- a platform workflow product is explicitly available and approved for the workload.

## Verification Commands

Use read-only checks first:

```bash
ssh h-dev 'source /etc/profile.d/ssh-init.sh >/dev/null 2>&1 || true; rjob --help'
ssh h-dev 'source /etc/profile.d/ssh-init.sh >/dev/null 2>&1 || true; rjob submit --help'
ssh h-dev 'grep -RInE "depend|dependsOn|dag|workflow" /usr/local/lib/python3.10/dist-packages/brainpp/rjob 2>/dev/null | sed -n "1,160p"'
```

Do not submit probe jobs just to inspect capability unless the user explicitly approves a write-path test and the target quota group / namespace / cleanup behavior is confirmed.
