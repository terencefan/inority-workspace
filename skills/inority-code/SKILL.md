---
name: inority-code
description: Inority workspace coding conventions split by programming language. Use when writing, reviewing, refactoring, or generating code in Inority repositories, especially for Go/Golang module layout, module README requirements, constants.go/errors.go placement, package boundaries, pipeline stages, and main.go decomposition.
---

# Inority Code

Use this skill to apply Inority code organization conventions. Keep this file as the router; language-specific rules live in `references/`.

## Workflow

1. Identify the language or stack touched by the user request.
2. Read the matching language reference before editing code:
   - Go / Golang: `references/golang.md`
3. If no language reference exists yet, follow the repository's current conventions and add a concise new `references/<language>.md` only when the rule is expected to be reused.

## General Rules

- Prefer existing repository patterns over inventing new structure.
- Keep `main` entrypoints thin: parse inputs, assemble modules, handle top-level exit behavior.
- Put durable conventions in the relevant language reference, not in this router.
- When a module README is required, use `$write-doc` README mode and its `Module README` structure.
