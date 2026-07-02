# H Cluster Feishu Directory

Authoritative directory:

https://aicarrier.feishu.cn/mindnotes/ECWzbrfiSmioKIncgJ1clP9gnhe#mindmap

## How to Use

- Treat this mindnote as the source of truth for H cluster structure and procedures.
- Before operational work, extract the relevant node from this mindnote or use Feishu CLI/document tooling when available.
- Record the exact section title or node path used as evidence in the answer or runbook.
- If the mindnote content is unavailable, tell the user that the Feishu directory could not be read and proceed only with already-known local facts.

## Information to Extract

When available, capture only the subset needed for the task:

- Access path: VPN, bastion/login node, account assumptions, SSH config, environment modules.
- Scheduler: scheduler type, queue/partition names, job inspection commands, submission commands, kill/cancel policy.
- Nodes: node groups, GPU/CPU model, labels, maintenance state, health check commands.
- Storage: shared filesystem paths, object storage endpoints, quota commands, cleanup policy.
- Network: service domains, proxy settings, firewall boundaries, DNS expectations.
- Operations: escalation contacts, maintenance windows, rollback steps, incident templates.

## Local Notes Policy

- Do not copy large Feishu content into this skill.
- If a frequently used, non-sensitive command pattern becomes stable, add a short reference file under `references/` and link it from `SKILL.md`.
- Keep secrets and credentials out of this repository.
