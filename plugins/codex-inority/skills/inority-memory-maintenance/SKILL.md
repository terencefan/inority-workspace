---
name: inority-memory-maintenance
description: Use when installing, repairing, auditing, or reorganizing the codex-inority workspace memory runtime under `.codex/memory/`.
---

# Inority Memory Maintenance

This plugin-internal skill maintains the workspace memory runtime. The `codex-inority` plugin hook owns automatic discovery, loading, and prompt injection; this skill is invoked only for memory maintenance.

## Use This Skill When

- initializing or repairing `.codex/memory/`
- checking runtime entrypoints and legacy paths
- updating memory templates or install resources
- deciding whether durable content belongs in `SOUL.md`, `USER.md`, `WORKSPACE.md`, a specific skill, or nowhere

Do not load this skill for ordinary workspace tasks merely because memory was injected by the plugin.

## Runtime Contract

`.codex/memory/MEMORY.md` is the canonical runtime entrypoint. An initialized workspace contains:

- `MEMORY.md`
- `SOUL.md`
- `USER.md`
- `WORKSPACE.md`
- `credential.md`
- `credential.d/`
- `dairy/`

The installer links `SOUL.md` and `USER.md` to their maintained source files. All other runtime entries are workspace-local and are created only when missing.

## Memory Boundaries

- `SOUL.md`: the agent's stable operating style
- `USER.md`: the user's profile and personal preferences
- `WORKSPACE.md`: a concise ASCII project map and team-wide workspace preferences
- a domain skill: workflow, tool, cluster, product, or implementation rules
- `credential.md` / `credential.d/`: credential routing and local secret fragments
- `dairy/YYYY-MM-DD.md`: time-scoped notes

Prefer tightening or moving existing content over adding new memory categories. Do not duplicate skill rules in memory.

## Modes

### Install or Repair

- use `scripts/install.mjs`
- link only `SOUL.md` and `USER.md` to the maintained source directory
- create other runtime entries only when missing
- preserve populated local files
- report what was created or left untouched

### Audit

- use `scripts/check-workspace.mjs`
- check required entries, regular-file types, legacy entrypoints, `AGENTS.md` routing, and the three-file memory contract
- report stale paths or duplicated responsibilities without silently inventing new categories

### Placement

- classify content using the memory boundaries above
- if content belongs to a specific skill, update that existing skill instead of memory
- if content is neither stable nor reusable, do not promote it to durable memory

## Sibling Skills

- `inority-memory-reflect`: derive candidates from the current thread
- `inority-memory-distill`: distill and archive historical dairy notes

## Resources

- `scripts/install.mjs`
- `scripts/uninstall.mjs`
- `scripts/check-workspace.mjs`
- `templates/`
- `references/install-surface.md`

Keep this skill focused on maintenance. Automatic loading and reinjection remain plugin-hook responsibilities.
