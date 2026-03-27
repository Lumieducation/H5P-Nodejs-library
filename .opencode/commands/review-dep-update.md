---
description: Review and fix a major dependency update PR created by Renovate
---

# Review Major Dependency Update

You are reviewing a Renovate PR that bumps a dependency to a new **major version**.
Your goal is to make CI green by fixing any breaking changes, or to produce a
detailed report if the update is too complex to fix automatically.

The PR number is: **$ARGUMENTS**

---

## Phase 1 — Setup & Context Gathering

1. Fetch PR metadata:
    ```
    gh pr view $ARGUMENTS --json title,body,headRefName,baseRefName,labels,files,statusCheckRollup
    ```
2. From the PR title and body, extract:
    - The **dependency name** being updated
    - The **old major version** and **new major version**
    - Which **package(s)** in this monorepo are affected (check `packages/*/package.json`)
3. Check CircleCI status from the PR's status checks. The CI pipeline has these
   jobs: `install-build`, `lint`, `format`, `unit-tests`, `integration-tests`,
   `db-tests`, `clamav-tests`, `html-exporter-tests`. Identify which jobs
   failed — this tells you what kind of breakage occurred (build, types, lint,
   tests, etc.) without running anything locally yet.
4. Check out the PR branch:
    ```
    gh pr checkout $ARGUMENTS
    ```
5. Install dependencies:
    ```
    npm ci
    ```
    If `npm ci` fails (peer dependency conflicts, engine incompatibility, etc.),
    **stop here** and post a PR comment explaining the failure. Do not attempt
    fixes for install-level failures.

---

## ESM-Only Detection (critical — check this early)

This repository is **CommonJS**. The build uses `"module": "commonjs"` with
`"moduleResolution": "node"` in `tsconfig.build.json`. No package in the
monorepo sets `"type": "module"` in its `package.json`.

**After `npm ci` succeeds**, check whether the new major version of the
dependency has become ESM-only:

1. Look at the dependency's `package.json` in `node_modules/<dependency>/`:
    - If it has `"type": "module"` and does NOT have a CJS entry in `"exports"`
      (no `"require"` condition), it is ESM-only.
    - If it has `"exports"` with both `"import"` and `"require"` conditions,
      it is dual-format and should work fine — proceed normally.
2. Check the changelog/release notes for mentions of "ESM only", "pure ESM",
   "dropping CJS", or "dropping CommonJS".

**If the package has become ESM-only, do NOT attempt to make it work.**
Instead, follow this strategy in order of preference:

1. **Replace with native Node.js / JavaScript features** (strongly preferred).
   Many packages that went ESM-only have native equivalents in modern Node.js.
   Examples:
    - `node-fetch` -> `globalThis.fetch` (built-in since Node 18)
    - `globby` -> `node:fs` with `glob` (built-in since Node 22)
    - `chalk` -> `node:util` `styleText` (built-in since Node 20)
    - `nanoid` -> `node:crypto` `randomUUID()` or `randomBytes()`
    - `p-limit` -> custom implementation with simple promise queue

    Search for all usages of the dependency across the monorepo, replace with
    the native equivalent, and remove the dependency from the relevant
    `package.json` files.

2. **Find a CJS-compatible alternative package** that provides the same
   functionality. Check npm for alternatives that still ship CJS. When
   evaluating alternatives, prefer packages that:
    - Are well-maintained (recent commits, active issues)
    - Have a similar API (less code to change)
    - Ship TypeScript types (built-in or `@types/`)

3. **Pin to the last CJS-compatible major version.** This is the last resort.
   Revert the version bump in `package.json` to the last version that shipped
   CJS, and leave a PR comment explaining why. Note: this means the Renovate
   PR should be closed, not merged.

When replacing a dependency (options 1 or 2), the commit message should
reflect the replacement rather than a migration:

```
fix(<package>): replace <old-dep> with <replacement>

<old-dep>@<new-version> is ESM-only; replaced with <explanation>
```

In the PR comment, add an **ESM Incompatibility** section explaining which
option was chosen and why.

---

## Phase 2 — Research Breaking Changes

Before touching any code, research what changed in the new major version.
Consult these sources **in order**, stopping when you have enough context:

1. **CHANGELOG / migration guide**: Fetch from the dependency's GitHub repo.
   Try common paths: `CHANGELOG.md`, `MIGRATION.md`, `UPGRADING.md`,
   `docs/migration`.
2. **GitHub release notes**: Check the releases page for the new major version
   tag.
3. **npm package page**: Look for links to migration guides or documentation.
4. **Source diff**: If the above are insufficient, compare the two major version
   tags on GitHub to understand what changed in the public API.

Produce a concise summary (for your own use in later phases) of:

- Breaking API changes relevant to this codebase
- Removed or renamed exports
- Changed function signatures or behavior
- New required configuration

---

## Phase 3 — Build & Fix Loop (max 3 iterations)

### Deciding what to run locally

Use the CircleCI results from Phase 1 to focus your work:

- If `install-build` failed: the problem is build/compile errors. Run
  `npm run build` locally and fix.
- If `lint` or `format` failed: run `npm run lint` / `npm run format:check`
  locally.
- If `unit-tests` failed: run `npm test` locally (or a targeted subset with
  `npx jest <pattern>` for the affected package).
- If only `db-tests`, `clamav-tests`, `html-exporter-tests`, or
  `integration-tests` failed: these require Docker sidecar services. You
  **cannot run these locally**. Instead, analyze the test source code, read the
  failure output from CircleCI (if accessible via the `gh` CLI or API), and
  fix the code based on your understanding of the breaking changes. After
  pushing, CI will validate.

Do NOT run the full test suite if only specific jobs failed. Target the
failing area.

### Iteration protocol

Repeat the following **up to 3 times**:

1. **Build**: Run `npm run build`. Capture and analyze any errors.
2. **Test** (only if build succeeds and unit-tests failed in CI): Run the
   relevant tests locally. Use `npx jest <pattern>` to target the affected
   package rather than running the entire suite.
3. **Analyze**: Cross-reference errors with the breaking changes summary from
   Phase 2.
4. **Fix**: Apply targeted code changes to resolve the errors.
    - Fix type errors, renamed imports, changed API signatures, updated config.
    - Keep changes minimal and focused on the dependency migration.
    - Do NOT refactor unrelated code.
    - Do NOT change the dependency version itself (Renovate already did that).

### Scope limit: 15 files

Track how many files you have modified (or plan to modify). If the total
approaches **15 files**, **pause and ask the operator** before continuing:

> "This update requires changes to N files (listing them). This exceeds the
> soft limit of 15. Should I continue with all changes, commit partial
> progress, or stop and report?"

Wait for the operator's response before proceeding.

### After the loop

If after 3 iterations the build or tests still fail:

- Commit whatever partial fixes you have made (if any).
- Proceed to Phase 5 (Reporting) with a detailed explanation of remaining
  failures.

---

## Phase 4 — Lint & Format

After all fixes are applied and build + tests pass (or after exhausting
iterations):

1. Run `npm run lint`. If there are lint errors **caused by your changes**,
   fix them.
2. Run `npm run format:check`. If formatting is off, run `npm run format` to
   fix it.

---

## Phase 5 — Deprecation Check

Scan the build and test output for **deprecation warnings** related to the
updated dependency. Note them for the report but **do not fix them** — they
are informational only.

---

## Phase 6 — Commit & Report

### If you made code changes:

1. Stage all modified files with `git add`.
2. Commit with a message following this format:

    ```
    fix(<affected-package>): migrate to <dependency>@<new-version>

    <one-line summary of what was changed and why>
    ```

    Example: `fix(h5p-server): migrate to express@5 — update middleware signatures`

3. Push to the PR branch:
    ```
    git push
    ```

### Always post a PR comment:

Use `gh pr comment $ARGUMENTS --body "$(cat <<'EOF' ... EOF)"` to post a
structured report. The comment must include ALL of these sections:

```
## Dependency Update Review

### Summary
- **Dependency**: <name>
- **Version change**: <old> -> <new>
- **Affected packages**: <list>

### Breaking Changes Identified
<bulleted list of breaking changes relevant to this codebase>

### Changes Made
<bulleted list of files changed and what was done in each, or "No code changes required">

### Build Status
<Pass/Fail — if fail, include the key error messages>

### Test Status
<Pass/Fail — note which CI jobs passed/failed, key failure details if any>

### Deprecation Warnings
<list any deprecation warnings found, or "None">

### Remaining Issues
<anything the agent could not resolve, or "None">

### Recommendation
<one of:>
- Safe to merge: All checks pass, changes are minimal and well-understood.
- Review recommended: Checks pass but changes are non-trivial — a human should verify.
- Manual intervention needed: Could not fully resolve — see remaining issues above.
```

---

## Important Constraints

- **Never auto-merge.** Always leave the PR for human review.
- **Never force-push** or rewrite PR history.
- **Never modify files outside the scope** of the dependency being updated.
- **Never change the dependency version** — Renovate controls that.
- **Never skip or disable tests** to make them pass.
- If a test was testing behavior that intentionally changed in the new version,
  update the test expectations to match the new correct behavior, and note this
  clearly in the PR comment.
