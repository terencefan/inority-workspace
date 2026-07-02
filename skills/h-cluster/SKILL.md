---
name: h-cluster
description: "Use when working with the H/h cluster: inspecting H cluster documentation, connecting to H cluster access nodes, uploading container images to the H registry, deploying or scaling services, checking jobs, nodes, queues, storage, network, container or Kubernetes-adjacent state, writing runbooks for H cluster operations, or debugging incidents that mention h 集群, H 集群, H cluster, h cluster, hpc, slurm, 作业队列, 镜像仓库, 部署, 扩缩容, 闲时服务, 计算节点, 登录节点, 共享存储, or cluster resource issues."
---

# H Cluster

Use this skill as the safe operating entry point for H cluster work. Treat the Feishu mindnote directory as the authority for topology, account, access, scheduler, storage, and operational procedures.

## Known Access Facts

- `h-dev` is the H cluster development machine / development entrypoint.

## Safety Index

- Prefer read-only reconnaissance before write, restart, scale, delete, quota, account, job, or deployment operations.
- Never print secrets, tokens, private keys, S3 credentials, kubeconfigs, or full credential-bearing command lines.
- Do not invent hostnames, namespaces, queues, partitions, credentials, mount paths, or escalation contacts.
- For operations that affect shared compute or active jobs, identify blast radius and rollback before execution.

## Reference Index

- `references/feishu-directory.md`: read when the task depends on H cluster topology, login path, hostnames, scheduler, storage layout, quotas, or official runbook details.
- `references/image-upload.md`: read when uploading Docker/container images to `registry.h.pjlab.org.cn`, debugging H registry auth/path/manifest errors, or preparing an image for idle service deployment.
- `references/browser-session.md`: read when reusing the local browser login session for H console inspection or carefully confirmed UI operations such as creating deployments.
- `references/deployment-service.md`: read when creating, updating, validating, or troubleshooting H deployment/modelset services through the console/API.
- `references/deployment-scale.md`: read when changing CPU/GPU/RAM/replica resources for an existing H deployment/modelset service.
- `references/rjob-scheduler.md`: read when designing or inspecting H rjob/vcjob batch pipelines, multi-task jobs, DAG/dependency assumptions, barrier jobs, or stage orchestration.

## Task Index

- `docs`: locate or summarize H cluster documentation.
- `access`: verify login path, account state, SSH, VPN, proxy, or environment prerequisites.
- `image-upload`: push images to the H registry or fix registry push failures.
- `idle-service`: prepare or deploy an idle inference service.
- `console-session`: reuse the local H console login session for read-only checks or explicitly confirmed browser UI actions.
- `deployment-service`: create or repair a normal/idle H deployment service and validate its endpoint.
- `deployment-scale`: update an existing H deployment's CPU/GPU/RAM/replica resources and validate rollout.
- `rjob-scheduler`: inspect or design rjob/vcjob batch execution, dependency, DAG, marker-based orchestration, and retry flows.
- `scheduler`: inspect jobs, queues, partitions, pending reasons, node allocation, or fairshare.
- `node`: inspect compute/login node health, GPU/CPU/memory pressure, disk, daemon state, or container runtime.
- `storage`: inspect shared filesystem, object storage, quota, inode pressure, path permissions, or throughput.
- `network`: inspect DNS, routing, ports, service reachability, proxy, or firewall symptoms.
- `runbook`: write or update a repeatable H cluster operation guide.
