---
description: Triage one or more open Renovate major-version PRs — attempt the upgrade, run checks, report a verdict as a PR comment. Never merges.
argument-hint: <PR number> [PR number...]
---

# Dependency PR triage

Triage the Renovate pull request(s) given as arguments: $ARGUMENTS

If no arguments were given, list open Renovate PRs first (`gh pr list --search "is:open author:app/renovate"`) and ask which ones to triage instead of guessing.

Do this once per PR, in order. Do not batch/parallelize checkouts — finish one PR before starting the next.

## Rules

- **Never merge a PR.** Not even if everything is green. This command only investigates and reports. The human merges.
- **Never force-push over Renovate's branch history**, don't rebase/squash it — just add commits on top.
- **Bound the effort.** If a fix isn't obvious after reading the changelog and the actual compile/test errors, stop trying — report what's blocking it instead of guessing further.
- If the working tree isn't clean before you start, stop and tell the user — don't stash or discard anything automatically.

## Steps per PR

1. **Read the PR**: `gh pr view <number>` — package name, current → target version, and look up the linked changelog/release notes/migration guide for breaking changes between those versions.
2. **Checkout the branch**: `git fetch origin <branch> && git checkout <branch>`.
3. **Grep the codebase** for usage of any API named in the changelog's breaking-change entries, to figure out fast whether this bump actually touches our code or is a no-op for us.
4. **Run local checks**: `npm run build`, `npm run lint`, `npm run format:check`, `npm test` (from repo root). Note these do NOT cover the Docker-dependent CircleCI suites (Mongo/S3, ClamAV, html-exporter, integration tests) — local green is necessary but not sufficient.
5. **If something's broken**, fix it directly on the branch following the changelog (updated imports, renamed/changed APIs, adjusted config) — not guesswork. Commit the fix with a message like `fix(deps): adjust for <package> vX breaking changes`.
6. **Push the fix** to the same branch: `git push origin <branch>`.
7. **Check CircleCI on the PR**: `gh pr checks <number>` — wait for it to finish if still running.
8. **Report as a PR comment** (`gh pr comment <number> --body "..."`), one of:
   - **All checks green, no code changes needed** — "Reviewed: no breaking API usage found, all CI checks pass. Looks safe to merge."
   - **All checks green after a fix** — summarize what broke and what you changed, link the commit, confirm CI is green, recommend merge.
   - **Still failing / blocked** — explain specifically what's failing (paste the relevant error), what you tried, and what a human needs to decide or investigate. Do not add `[status] needs review` if it's already there; otherwise leave existing labels alone.
9. Move to the next PR only after the current one has a comment posted.

## After all PRs are done

Report a short summary to the user: which PRs are ready to merge, which are blocked and why, and which needed no changes.
