---
name: checkout
description: Run either an end-of-day workspace publish flow or a workspace sync flow that fetches each repository's main branch and rebases the current branch onto it. Use publish mode for "checkout", "checkout 下班", workspace-wide commit/PR requests, or review-link sweeps. Use sync mode when the user says "$checkout sync", "sync", or “上班”.
---

# Checkout Workspace Flow

## Overview

Use this skill as the single workspace entry point for two distinct modes:

- `checkout` / 下班: discover dirty repositories, commit changes, and open review links.
- `sync` / 上班: fetch the latest default branch in each repository and synchronize it into the current branch, processing independent repositories concurrently and worktrees of one repository serially.

## Mode Selection

Choose the mode before any repository write:

- Enter **sync mode** when the user explicitly includes `sync` or “上班”.
- Treat requests such as “同步各仓库主分支到当前分支” as sync mode when they invoke this skill.
- Otherwise, when this skill triggers from `checkout`, “下班”, commit-all, or PR sweep wording, use **checkout mode**.
- Never mix both modes in one run unless the user explicitly requests both.

When the request selects `sync` mode, read
[`references/sync.md`](references/sync.md) completely and follow it.
Otherwise, do not load that file; continue directly with checkout mode below.

## Dependencies

Load these helpers instead of re-inventing their behavior:

- `$inority-question`
  - Use for any clarification, scope narrowing, or publish confirmation round.
  - Keep it to one concise question per round.
- `$git`
  - Use for workspace repo discovery, repo status summaries, repository-local rules, current-branch rebase preparation, commit preparation, and GitLab-style MR workflows.
- `github:yeet`
  - Prefer for GitHub repositories after scope is confirmed and the repo is ready to publish.
- The available enterprise-Gitee PR skill
  - Use it for enterprise Gitee repositories when a PR must be created.
- `$lark-message`
  - After each PR or MR is created and verified, notify 范腾远 by direct message using the trusted recipient route.

## Enterprise Gitee Session Authorization

Treat invocation of this checkout skill as standing user authorization to reuse
the existing local Chrome login session for enterprise Gitee operations
required by the approved checkout wave:

- inspect repository metadata, branch rules, and existing PR state
- create the approved PR
- verify the created PR through its detail endpoint

Do not ask for a separate Chrome-session confirmation during checkout. This
authorization includes reading the local Chrome Cookies database and using the
Chrome Safe Storage decryption key only to authenticate those Gitee requests.
Never print, return, log, persist, or transfer cookies, decrypted cookie values,
decryption keys, or other credentials.

Keep credential-bearing Chrome-session operations in the main agent. Subagents
may prepare, verify, commit, and push their assigned repositories, but must
return the PR creation parameters to the main agent instead of attempting to
reuse the browser session themselves. This preserves the standing authorization
in the user-facing context and avoids duplicating credential access across
agents.

This authorization is limited to enterprise Gitee work in the current checkout
wave. It does not authorize unrelated browser-session access or bypass an
expired login. If the Chrome session is missing or expired, provide the Gitee
login URL and resume only after the user refreshes the session.

## Checkout Mode

Checkout mode is a controlled end-of-day publish flow. It discovers independent repositories, classifies publishable changes, then delegates independent repositories to parallel subagents for commit and review-link publication. An explicit checkout, commit, push, or PR request is sufficient authorization for this normal workflow and does not require a separate publish confirmation.

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
- Record the initial HEAD, branch, status, and intended file set as the
  repository's checkout baseline.
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

### Concurrent Modification Skip Rule

Skip a repository immediately when evidence shows that another process or
workflow modified the same repository after its checkout baseline was
recorded. Evidence includes an unexpected HEAD or branch change, a new reflog
entry, or new/changed worktree files outside the assigned agent's own actions.

- Mark the repository as `skip`, not `ask` or `blocked`.
- Do not wait for, coordinate with, or ask the user about the other workflow.
- Do not stash, restore, reset, clean, cherry-pick, switch branches again, or
  otherwise rearrange the concurrent workflow's state.
- Preserve every commit and worktree change exactly as found.
- Report the observed concurrent-modification evidence and final repository
  state in the review bundle.
- Continue publishing other independent repositories.

An already-dirty worktree at initial discovery is not by itself concurrent
modification. Apply this rule only when repository state changes unexpectedly
after the checkout baseline or when direct evidence identifies another active
writer.

### 3. Confirm Scope Only When Ambiguous

An explicit checkout, commit, push, or PR request already authorizes creating a working branch, committing the selected scope, pushing that branch, and creating its review artifact.

Use `$inority-question` only when repository scope, branch intent, or another material choice is ambiguous. Do not ask for a redundant publish confirmation.

### 4. Publish Independent Repositories in Parallel

After the single publish confirmation, assign each approved independent
repository to one subagent and publish repositories in parallel whenever agent
capacity permits.

- Give one subagent ownership of one repository for the whole publish flow:
  refresh, Git-side review preparation, rebase, commit, verification, and push.
  For enterprise Gitee, the main agent owns Chrome-session PR inspection,
  creation, and detail verification; for other forges, the subagent may also
  own PR or MR creation.
- Require the subagent to compare HEAD, branch, status, and intended files with
  its checkout baseline before every Git write and before push.
- Never assign two subagents to the same repository or worktree. All writes
  inside one repository remain serial.
- Keep all user interaction in the main agent. A subagent that encounters a
  conflict, missing confirmation, ambiguous scope, expired forge login, closed
  review branch, or other publish blocker must stop before the unsafe action and
  report the evidence to the main agent.
- Let the main agent ask the user through `$inority-question`, then send the
  answer back to the blocked subagent or resume the repository in a new wave.
- If available agent slots are fewer than approved repositories, publish in
  parallel waves. Do not fall back to globally serial processing merely because
  one repository is blocked.
- The main agent owns the workspace-wide scan, the single publish confirmation,
  cross-repository scope decisions, blocker interaction, and the final review
  bundle. Subagents own only their assigned repository.

For each approved repository:

1. Refresh the repository default branch according to local rules.
2. Inspect the current branch's review status before deciding whether to reuse it.
   - Always refresh the target branch first and compare it with the current branch before reporting or creating a PR.
   - Do not assume a previously-created PR or MR is still open; verify its current state from the forge detail page/API when possible.
   - If the current branch backs an open PR or MR for the same scope, you may keep using it.
   - If the current branch backs a PR or MR that is already merged or closed, do not push new work to that branch.
   - In that merged or closed case, create a fresh review branch from the latest default branch tip first, then cherry-pick or squash the intended scope onto it before publishing.
   - If a previous PR was squash-merged and the local branch still contains extra commits, carry forward only the still-unmerged delta onto the fresh branch.
3. Keep the current working branch checked out only when it is still the intended live review branch.
   - If the repository is still on `main` or `master`, create a clearly named working branch from the refreshed default branch. Ask only when the branch intent is materially ambiguous.
4. Rebase the publish branch onto the latest default branch tip before staging or publishing.
   - If the rebase hits conflicts or any other blocker, stop that repository immediately and ask the user before proceeding.
5. Stage only the intended files.
6. Create one intentional commit for that repository's selected scope.
7. Run the most relevant available checks when they are obvious and cheap enough.
8. Push the branch.
9. Create the PR or MR using the forge-specific path:
   - GitHub: prefer `github:yeet`
   - GitLab: follow `$git` commit workflow and create the MR in the same pass
  - enterprise Gitee: use the available enterprise-Gitee PR skill
     - If enterprise Gitee token auth does not verify and the browser session is missing or expired, stop and give the user the login URL first; continue only after the browser login is refreshed.
10. Verify the direct PR or MR detail URL and collect the final review links.
11. After verification succeeds, send 范腾远 one direct Feishu message for that PR or MR through `$lark-message`.
    - Send only after the direct detail check confirms the review artifact exists and is open.
    - Include the repository, source and target branches, commit ID and message, direct review URL, verification result, and any material caveat.
    - Use the trusted direct recipient `ou_cad2666d2b4ab2173ad2d33f969b107b`; follow `$lark-message` Card 2.0, mention, dry-run, idempotency, and delivery rules without asking for another confirmation.
    - Send one message per verified PR or MR so each review item remains independently actionable.
    - If notification delivery fails, preserve the successful PR or MR, report the notification failure explicitly, and do not claim the checkout wave is fully complete.
12. Open every verified direct review link in the user's current browser.
    - Reuse the current browser process or browser connector when available.
    - Open one tab per PR or MR so the review bundle is immediately ready.
    - Do not treat terminal output or a list of links as a substitute for opening
      the review pages.
13. After the PR or MR is created successfully, remain on the current working branch unless a repository-local rule explicitly requires another landing state.

If a repository hits a conflict or publish blocker mid-flight, stop only that
repository, notify the main agent, and allow other independent repository
subagents to continue. Apply the concurrent-modification skip rule directly
when the blocker is another process modifying the same repository; do not ask
the user for coordination.

### 5. Return a Review Bundle

End with a compact per-repository summary that the user can review quickly.

Include:

- repository path
- remote repo or forge
- branch
- commit id and message
- PR or MR link
- 范腾远 notification delivery result
- verification run
- final worktree state
- skipped or blocked repositories and exact reasons

Prefer a flat list or table that the user can open one by one.
Put every PR or MR URL on its own standalone line, outside tables, so the rendered link is easy to click.
Confirm that the verified review URLs were also opened in the current browser.

If every in-scope repository has been fully processed for this checkout wave, end with one short celebratory message that includes a fireworks emoji.

## Safety Rules

- Never push directly to `main` or `master`.
- Never push new work onto a branch whose previous PR or MR is already merged or closed; start a fresh branch from the latest default branch instead.
- Never report an existing PR or MR as the active review target until its current state has been checked.
- Never create a duplicate PR for commits that are already represented in the refreshed target branch.
- Never silently stage unrelated changes.
- Never run concurrent Git write flows against the same repository or worktree.
- If another process modifies a repository during checkout, skip that
  repository immediately and preserve its state; do not turn it into a
  clarification round.
- Never let repository subagents ask the user independently; route every
  confirmation and conflict decision through the main agent.
- Never auto-publish a repository whose scope is unclear.
- Never skip repository-local workflow rules.
- If the repository is still on its default branch, create a clearly named working branch before publishing. Ask only when the branch intent is materially ambiguous.
- If rebasing onto the default branch hits any conflict or blocker, stop and ask the user instead of resolving it speculatively.
- Treat an explicit checkout, commit, push, or PR request as authorization for the normal branch, commit, push, and review-artifact workflow.
- If a repository cannot produce a PR or MR link, say so explicitly instead of pretending the workflow succeeded.
- Do not mark a successfully created PR or MR as fully published until the required direct notification to 范腾远 has also been delivered; report notification failures separately from forge failures.
- After a successful publish, leave the repository on the rebased working branch unless repository-local rules explicitly require otherwise.
