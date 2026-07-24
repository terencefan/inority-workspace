# Checkin / 上班 Sync-Only Flow

Load this file only when the user explicitly says `checkin` or “上班”. Do not
load it for `$checkout`, “下班”, generic Git requests, pull, update, sync, or
rebase wording.

Checkin is local synchronization only. It must not commit, push, or create
review links.

## 1. Discover and Preflight

Use `../scripts/checkin-workspace.mjs --table [scan-root]` from this reference
directory, or resolve the script as `skills/checkout/scripts/checkin-workspace.mjs`.

For each independent repository, collect:

- path
- current branch
- `origin` URL
- candidate default branch
- dirty file count

Block repositories with:

- no usable `origin`
- detached `HEAD`
- dirty worktree
- unknown default branch
- an existing merge or rebase state

## 2. Apply Serially

Use `skills/checkout/scripts/checkin-workspace.mjs --apply --table [scan-root]`.

For each ready repository:

1. Fetch `origin` with prune.
2. Determine the default branch from `origin/HEAD`, `origin/main`,
   `origin/master`, local `main`, then local `master`.
3. Refresh the local default-branch ref without checking it out.
4. Rebase the current branch onto `origin/<default>`.
5. Keep the original branch checked out.

Stop the whole sync pass on the first rebase conflict. Report the repository,
branch, failing command, and whether a rebase remains in progress.

## 3. Report

Return a compact per-repository summary with path, current branch, default
branch, action, final status, and blocker reason.

## Safety

- Never switch away from the starting branch.
- Never write into a dirty repository unless the user explicitly requests a
  stash-based workflow.
- Never commit, push, or open a review artifact.
- Never auto-resolve a rebase conflict.
- If a linked worktree prevents updating the local default branch, report it as
  blocked.
