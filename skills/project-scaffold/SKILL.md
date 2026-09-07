---
name: project-scaffold
description: Create or audit a repository governance skeleton with distinct README.md, DEVELOP.md, and AGENTS.md responsibilities. Use when starting a project, standardizing repository entry documents, adding a unified human development guide, or correcting duplicated user, contributor, and coding-agent instructions.
---

# Project Scaffold

Create repository entry documents with one authority per audience:

- `README.md`: project users; purpose, quick start, architecture map, and documentation links.
- `DEVELOP.md`: human developers; setup, change routing, tests, hooks, submission flow, and completion criteria.
- `AGENTS.md`: coding agents; mandatory execution constraints and safety redlines.

## Workflow

1. Inspect existing entry documents and repository commands before generating anything.
2. Preserve valid project-specific content. Never replace a non-empty existing entry document with a template.
3. For a new repository, run `scripts/init-project.mjs init --target <repo> --name <name>`.
4. For an existing repository, use the templates in `assets/governance/` as boundary references and edit the real files deliberately.
5. Run `scripts/init-project.mjs check --target <repo>` after changes.
6. Run the repository's own Markdown-link, documentation, and commit-hook validators. The scaffold check does not replace project gates.

## Rules

- Keep stable interface and domain semantics in project contracts, not in `DEVELOP.md` or `AGENTS.md`.
- Link from one authority to another instead of copying procedures.
- Do not put human onboarding steps in `AGENTS.md`.
- Do not put full contribution policy or agent redlines in `README.md`.
- Do not overwrite existing files automatically. A conflict requires a deliberate merge.
- Keep generated documents in the target repository; the templates in this skill are reusable starting points, not runtime authority.

## Assets

- `assets/governance/README.md.tmpl`
- `assets/governance/DEVELOP.md.tmpl`
- `assets/governance/AGENTS.md.tmpl`

The only template variable is `{{PROJECT_NAME}}`.
