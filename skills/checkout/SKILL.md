---
name: checkout
description: Sweep a workspace for dirty independent Git repositories, prepare end-of-day commits, open PRs or MRs on each supported forge, and return a review link summary. Use when the user asks to "checkout", "checkout 下班", "遍历当前工作区的所有 git 目录", "把几个仓库都提交并发 PR", "扫一遍工作区并给我 review 链接", or wants a single workflow that discovers in-scope repos and publishes them repo by repo.
---

# Checkout After Work

## Overview

Use this skill to turn a multi-repository workspace into a controlled end-of-day publish flow.

This skill is a workspace orchestrator, not a replacement for repository-local Git rules. It discovers independent repositories, classifies which ones are publishable, asks for one explicit publish confirmation because the workflow leaves the machine, then commits and opens review links repo by repo.

Its Git baseline should match `$checkin`:

- fetch the latest remote default branch
- refresh local default-branch context
- keep the repository on its current working branch
- rebase the current branch onto the latest default branch tip

The difference from `$checkin` is what happens after that sync step: `checkout` stages, commits, pushes, and opens the PR or MR.

## Dependencies

Load these helpers instead of re-inventing their behavior:

- `$inority-question`
  - Use for any clarification, scope narrowing, or publish confirmation round.
  - Keep it to one concise question per round.
- `$git`
  - Use for workspace repo discovery, repo status summaries, repository-local rules, current-branch rebase preparation, commit preparation, and GitLab-style MR workflows.
- `github:yeet`
  - Prefer for GitHub repositories after scope is confirmed and the repo is ready to publish.
- `$pjlab-gitee`
  - Use for `gitee.pjlab.org.cn` repositories when a PR must be created on the enterprise Gitee instance.

## Workflow

### 1. Discover Independent Repositories

Treat the current working directory as the scan root unless the user gives another root.

- Prefer `../inority/scripts/scan-git-repos.mjs` for deterministic workspace scanning.
- Default output mode should be JSON for machine-friendly triage; use `--table` when you want a quick human audit.
- Find independent Git roots recursively.
- Exclude heavy or irrelevant directories during workspace scans:
  - `node_modules/`
  - `.venv/`
  - `third_party/`
  - `.recycle/`
  - `.codex/plugins/`
- Build one row per repository with:
  - path
  - domain: classify by remote address style such as `github`, `gitlab`, or `gitee`
  - remote host
  - current branch
  - dirty file count
  - suggested skill for branch or commit preparation based on the remote style
  - proposed action: `skip`, `ask`, `publish`

### 2. Classify and Triage

For every dirty repository:

- Read repository-local rules before planning a commit.
- Inspect `git status --short`, diff summary, current branch, and remote URL.
- Determine the forge:
  - GitHub
  - GitLab
  - enterprise Gitee
  - unsupported / no remote
- Decide whether the repo is safe to publish now.

Stop and mark the repository as `ask` instead of auto-publishing when any of these is true:

- the worktree mixes unrelated changes and scope is unclear
- the repository has merge conflicts or a detached HEAD
- the repository has no usable remote
- the forge is unsupported by available tooling
- the repository is already on a branch whose intent conflicts with the new change scope
- confidence in the commit message or branch name is low

Do not split one repository into multiple PRs by default. Keep the currently selected repository scope in a single PR unless the user explicitly asks to split it.

### 3. Ask for One Publish Confirmation

Because this workflow commits, pushes, and creates external review artifacts, it must pause once before any write leaves the machine.

Use `$inority-question` to show:

- which repositories will be published
- which repositories will be skipped
- which repositories still need a decision
- one concise confirmation question

If ambiguity is above the workspace threshold, do not proceed until the user answers.

### 4. Publish Repository by Repository

Process repositories serially. Do not run concurrent Git write flows in the same workspace wave.

For each approved repository:

1. Refresh the repository default branch according to local rules.
2. Inspect the current branch's review status before deciding whether to reuse it.
   - If the current branch backs an open PR or MR for the same scope, you may keep using it.
   - If the current branch backs a PR or MR that is already merged or closed, do not push new work to that branch.
   - In that merged or closed case, create a fresh review branch from the latest default branch tip first, then cherry-pick or squash the intended scope onto it before publishing.
3. Keep the current working branch checked out only when it is still the intended live review branch.
   - If the repository is still on `main` or `master`, stop and ask the user before proceeding instead of publishing directly from the default branch.
4. Rebase the publish branch onto the latest default branch tip before staging or publishing.
   - If the rebase hits conflicts or any other blocker, stop that repository immediately and ask the user before proceeding.
5. Stage only the intended files.
6. Create one intentional commit for that repository's selected scope.
7. Run the most relevant available checks when they are obvious and cheap enough.
8. Push the branch.
9. Create the PR or MR using the forge-specific path:
   - GitHub: prefer `github:yeet`
   - GitLab: follow `$git` commit workflow and create the MR in the same pass
  - enterprise Gitee: use `$pjlab-gitee`
     - If enterprise Gitee token auth does not verify and the browser session is missing or expired, stop and give the user the login URL first; continue only after the browser login is refreshed.
10. After the PR or MR is created successfully, remain on the current working branch unless a repository-local rule explicitly requires another landing state.

If a repository hits a conflict or publish blocker mid-flight, stop that repository, record the blocker, and continue only with other repositories that are independent and still safe to process.

### 5. Return a Review Bundle

End with a compact per-repository summary that the user can review quickly.

Include:

- repository path
- remote repo or forge
- branch
- commit id and message
- PR or MR link
- verification run
- final worktree state
- skipped or blocked repositories and exact reasons

Prefer a flat list or table that the user can open one by one.

If every in-scope repository has been fully processed for this checkout wave, end with one short celebratory message that includes a fireworks emoji.

## Safety Rules

- Never push directly to `main` or `master`.
- Never push new work onto a branch whose previous PR or MR is already merged or closed; start a fresh branch from the latest default branch instead.
- Never silently stage unrelated changes.
- Never auto-publish a repository whose scope is unclear.
- Never skip repository-local workflow rules.
- If the repository is still on its default branch and publishing would require a new branch, stop and ask the user instead of improvising a branch strategy.
- If rebasing onto the default branch hits any conflict or blocker, stop and ask the user instead of resolving it speculatively.
- Never treat "all dirty repos" as approval to leave the machine; still perform the single explicit publish confirmation round.
- If a repository cannot produce a PR or MR link, say so explicitly instead of pretending the workflow succeeded.
- After a successful publish, leave the repository on the rebased working branch unless repository-local rules explicitly require otherwise.
