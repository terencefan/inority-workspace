# Sync / 上班 Flow

Load this file when the user selects `sync` mode with `$checkout sync`, `sync`,
“上班”, or an explicit request to synchronize each repository's main branch
into its current branch. Do not load it for plain `$checkout` or “下班”.

Sync is local synchronization only. It must not commit, push, or create
review links.

## Repository-Specific Deployment Mirrors

The generic local-only rule does not waive a deployment-mirror contract defined
by the selected repository's own rules. When such a contract exists:

- treat the repository rules as the authority for the mirror host, checkout
  path, target branch, and required synchronization method
- inspect a dirty mirror before changing it and preserve intended remote work
- require the workstation branch, remote branch, and deployment mirror to end
  at the same commit when the contract requires exact mirroring
- do not extend that exception to repositories that have no explicit mirror
  contract

## 1. Discover and Preflight

Use `../scripts/sync-workspace.mjs --table [scan-root]` from this reference
directory, or resolve the script as `skills/checkout/scripts/sync-workspace.mjs`.

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

## 2. Protect Local Default-Branch Work

After fetching each repository, inspect the local default branch before moving
it. If it has commits not present in `origin/<default>`, or its checked-out
worktree has uncommitted changes:

- mark that repository as `needs-checkout`
- create a fresh non-default branch for the local default-branch work
- route that repository through checkout mode, including its publish
  confirmation
- retry sync only after checkout succeeds

Never force-update a local default branch that contains unpublished work.

## 3. Apply Concurrently

Use `skills/checkout/scripts/sync-workspace.mjs --apply --table [scan-root]`.

Process independent repositories concurrently. Group worktrees by their Git
common directory and process worktrees in the same repository serially.

For each ready repository or worktree:

1. Fetch `origin` with prune.
2. Determine the default branch from `origin/HEAD`, `origin/main`,
   `origin/master`, local `main`, then local `master`.
3. Refresh the local default-branch ref without checking it out.
4. Rebase the current branch onto `origin/<default>`.
5. Keep the original branch checked out.

Stop only the affected repository group on its first rebase conflict. Allow
other independent repository groups to finish. Report the repository, branch,
failing command, and whether a rebase remains in progress.

## 4. Report

Return a compact per-repository summary with path, current branch, default
branch, action, final status, and blocker reason.

## Safety

- Never switch away from the starting branch.
- Never write into a dirty repository unless the user explicitly requests a
  stash-based workflow.
- Never commit, push, or open a review artifact.
- Never auto-resolve a rebase conflict.
- If a linked worktree prevents updating the local default branch, report it as
  blocked and continue independent repositories.
