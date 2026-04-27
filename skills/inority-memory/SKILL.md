---
name: inority-memory
description: Use when the user wants to govern the inority-style workspace memory runtime. Covers install/repair, `.codex/memory/` structure, entrypoint cleanup, durable-memory placement, migration hints, and the skill-local runtime resources under `skills/inority-memory/`.
---

# Inority Memory

Use this skill for the inority-style workspace memory system.

This skill governs the runtime memory model under `.codex/memory/`. Install and uninstall mechanics live in this skill's resource files and should not dominate the main workflow text.

This is the workspace-default runtime-governance skill for the inority memory system. Unless the task clearly has nothing to do with workspace memory structure or entrypoints, prefer loading this skill by default.

Follow workspace reply-format rules from `.codex/memory/USER.md`. Do not duplicate local reply-template policy here.

Treat `.codex/memory/MEMORY.md` as the canonical runtime entrypoint for the
inority-memory system. Workspace `AGENTS.md` should point agents there first,
and `MEMORY.md` defines the follow-on loading order for the rest of
`.codex/memory/`.

## Use This Skill When

- the workspace does not have an initialized `.codex/memory/` runtime yet
- the user asks where memory should live inside `.codex/memory/`
- the user wants to clean up duplicate memory entrypoints
- the user asks how this memory runtime is organized
- the user needs install, repair, audit, or placement guidance for the runtime

## Default Loading Rule

- Load this skill by default for workspace work unless the task clearly stays outside memory structure, runtime governance, or durable-memory placement.
- If another task-specific memory skill is also needed, keep `inority-memory` as the governing runtime and placement reference rather than dropping it.

## Runtime Modes

### Install Mode

Enter install mode if `.codex/memory/` is missing or missing required runtime entrypoints.

Treat these as the required runtime entrypoints for considering the workspace initialized:

- `.codex/memory/`
- `.codex/memory/MEMORY.md`
- `.codex/memory/USER.md`
- `.codex/memory/SOUL.md`
- `.codex/memory/WORKSPACE.md`
- `.codex/memory/credential.yaml`
- `.codex/memory/dairy/`

If only syncable files are missing, prefer repairing the runtime in place rather than broad migration.

In install mode:

- create or repair the runtime entrypoints under `.codex/memory/`
- use the install resources from this skill when they match the task
- preserve existing local-only files rather than overwriting them
- report which entrypoints were created, linked, repaired, or left untouched

Install mode makes the runtime usable first. Do not bundle reflection or dairy distillation into the same step. Those workflows now live in sibling skills:

- `inority-memory-reflect`
- `inority-memory-distill`

### Normal Governance Mode

If install mode does not apply, stay in normal runtime-governance mode.

Use this mode for:

- explaining the runtime model
- routing durable content to the correct memory home
- auditing or cleaning up duplicate entrypoints
- verifying `.codex/memory/` integrity
- pointing non-inority layouts to `inority-memory-migration`

## Migration Hint Rule

If you discover memory content that does not already follow the inority layout or entrypoints, do not silently reshape it in place.

Instead:

- call out that the source appears non-inority-style
- suggest using `inority-memory-migration` or its `migrate` command to import it into the current system
- prefer explicit source mapping over heuristic guessing when the layout is unclear

## Memory Model

Treat `.codex/memory/MEMORY.md` as the runtime entrypoint and
`inority-workspace/` as the maintained source for reusable assets.

`MEMORY.md` owns the loading order and boundaries for the rest of
`.codex/memory/`. `AGENTS.md` should not duplicate that detailed sequence.

### Durable Files

- `.codex/memory/MEMORY.md`
  Workspace-local runtime-facing memory index and loading-order contract for the memory system.
- `.codex/memory/USER.md`
  Personal preferences, reply contracts, collaboration defaults, and durable user-specific workflow choices.
- `.codex/memory/SOUL.md`
  Enduring agent operating principles and reusable repair patterns.
- `.codex/memory/WORKSPACE.md`
  Workspace-local structure, navigation, environment rules, and cross-project conventions.
- `.codex/memory/credential.yaml`
  Local-only secret names, locations, and usage hints. Never store plaintext secret values in repo-tracked sources.

### Time-scoped Files

- `.codex/memory/dairy/YYYY-MM-DD.md`
  Daily notes, recent discoveries, transient context, and short-horizon follow-ups.
- `.codex/memory/dairy/archive/`
  Already-processed daily notes that were distilled or intentionally archived.

## Sibling Skills

- `inority-memory-reflect`: current-thread reflection and lesson-candidate generation
- `inority-memory-distill`: historical dairy-note distillation and archive flow

When the user explicitly asks for one of those workflows, use the sibling skill directly instead of re-embedding the workflow here.

## Placement Rules

- user preference or reply-style contract -> `USER.md`
- agent operating principle or reusable repair pattern -> `SOUL.md`
- workspace structure, project index, local navigation, environment rule -> `WORKSPACE.md`
- secret names, variable names, paths to secrets, usage hints -> `credential.yaml`
- day-specific progress, temporary findings, near-term follow-up -> `dairy/YYYY-MM-DD.md`

Prefer merging and tightening over dumping whole files verbatim. If one source mixes durable and time-scoped material, split it across the correct targets.

## Resource Files

- `skills/inority-memory/scripts/install.mjs`
- `skills/inority-memory/scripts/uninstall.mjs`
- `skills/inority-memory/templates/`
- `skills/inority-memory/references/install-surface.md`

Use these resource files when the task explicitly involves installation, uninstallation, template-backed bootstrap, or runtime integrity checks. Keep those mechanics out of the main runtime reasoning unless the task is specifically about them.

## Output Contract

When working under this skill, make the result easy to audit:

- name the source files or memory slices you used
- state whether you used install mode or normal governance mode
- state the destination memory homes for moved content
- call out any remaining duplicate or legacy entrypoints

## Style Rules

- Keep memory entries compact and operational.
- Prefer stable categories and bullets over long narrative prose.
- Keep secrets out of reusable sources.
- Keep the runtime model primary and treat install/uninstall as supporting resources.
