---
name: inority
description: Base skill for shared inority workspace assets and helper scripts. Use when another inority skill needs common reusable resources such as repository scanners, shared templates, or cross-skill utility scripts, and keep those common assets here instead of duplicating them.
---

# Inority

Use this as the base skill for shared assets across `inority-workspace` skills.

This skill is not a user-facing workflow by default. Its main job is to hold reusable assets that multiple skills depend on.

## Use This Skill When

- another inority skill needs a shared helper script
- a utility should exist once and be reused by multiple skills
- common templates or references do not belong to one workflow-specific skill

## Current Shared Assets

- `scripts/scan-git-repos.mjs`
  - canonical workspace Git repository scanner
  - used by `checkout` for deterministic workspace discovery
  - should be reused by `checkin` and future workspace Git orchestration skills

## Rules

- Prefer moving cross-skill helpers here instead of copying scripts between skills.
- Keep workflow-specific policy in the calling skill, not in this base skill.
- When a shared script changes, preserve its output contract unless every dependent skill is updated in the same change.
