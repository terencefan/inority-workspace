---
name: checkin
description: Update every independent Git repository under a workspace to the latest remote default branch while staying on the current branch, then rebase the current branch onto that refreshed default branch. Use when the user asks to "checkin", "更新所有 git 仓库主分支", "批量 rebase 工作区仓库", or wants a workspace-wide safe pull-and-rebase pass without switching branches.
---

# Checkin

Use this skill when the user wants a workspace-wide Git sync pass that:

- discovers independent repositories under a scan root
- refreshes each repository's remote default branch from `origin`
- keeps the currently checked out branch unchanged
- rebases the current branch onto the latest default branch tip

This skill is for local synchronization only. It does not commit, push, or create review links.

## Dependencies

- Reuse `../inority/scripts/scan-git-repos.mjs` for repository discovery and excludes.
- Respect repository-local rules files if a repository uses them for Git safety or required generated files.

## Workflow

### 1. Discover Repositories

1. Treat the current working directory as the scan root unless the user gives another path.
2. Find independent Git roots recursively.
3. Exclude heavy or irrelevant directories during the scan:
   - `.git/`
   - `.codex/`
   - `.uv-cache/`
   - `.recycle/`
   - `.venv/`
   - `node_modules/`
   - `third_party/`

### 2. Preflight Each Repository

For each repository, collect:

- repository path
- current branch
- remote `origin` URL
- candidate default branch
- dirty file count

Mark the repository as blocked instead of writing when any of these is true:

- no usable `origin` remote
- detached `HEAD`
- dirty worktree
- default branch cannot be determined
- repository is already in a conflicted rebase or merge state

### 3. Refresh Default Branch Without Leaving the Current Branch

Process repositories serially.

1. Fetch `origin` with prune.
2. Determine the default branch in this order:
   - `refs/remotes/origin/HEAD`
   - `origin/main`
   - `origin/master`
   - local `main`
   - local `master`
3. If the current branch is not the default branch, fast-update the local default branch ref to `origin/<default>` without checking it out.
4. Keep the current branch checked out for the whole flow.

### 4. Rebase Current Branch

1. Rebase the current branch onto `origin/<default>`.
2. If the current branch is already the default branch, this still keeps the branch unchanged and simply fast-forwards or replays it onto the latest remote tip.
3. If the rebase stops on conflicts, stop the whole workspace pass immediately and report:
   - repository path
   - branch
   - conflicting command
   - whether the repository was left in a rebase state

Do not auto-resolve conflicts speculatively.

### 5. Report

Return a compact per-repository summary with:

- repository path
- current branch
- default branch
- action taken
- final status
- blocker reason when skipped

## Script

Prefer the bundled helper for deterministic execution:

- `scripts/checkin-workspace.mjs --table [scan-root]`
  - read-only preflight summary
- `scripts/checkin-workspace.mjs --apply --table [scan-root]`
  - execute the fetch and rebase flow serially

Use `--json` when another tool or script needs machine-readable output.

## Safety Rules

- Never switch repositories away from the branch they started on.
- Never write into a dirty repository unless the user explicitly asks for a stash-based workflow.
- Never push or commit as part of this skill.
- Stop on the first rebase conflict instead of spreading partial failures across many repositories.
- If the local default branch cannot be updated because it is checked out in another linked worktree, report that repository as blocked.
