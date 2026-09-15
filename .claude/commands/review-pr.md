---
description: Review a pull request against this repo's quality bar — correctness, backwards compatibility, test coverage, docs — and post the review as a PR comment.
argument-hint: <PR number | branch> [--post]
---

# Pull request review

Review the pull request given as arguments: $ARGUMENTS

If no argument was given, review the current branch's PR (`gh pr view --json number`);
if there is none, list open PRs (`gh pr list`) and ask which one instead of guessing.
By default write the review to the chat only. Post it as a PR comment
(`gh pr comment <number> --body-file …`) only if `--post` was passed.

## Rules

- **Never merge, approve, close or push to the PR branch.** This command reviews and
  reports. The human decides.
- **Never change the working tree** unless you need a local checkout to run the build or
  tests — and then only on a clean tree. If the tree isn't clean before you start, stop
  and tell the user; don't stash or discard anything.
- **Verify before claiming.** Read the actual code around the diff before asserting a
  bug. If you can't confirm a finding, label it a question, not a defect.
- **Rank and cap.** Report real problems most-severe first. Don't pad the review with
  style nits that prettier/eslint already enforce — those are CI's job, not yours.

## Gathering context

1. `gh pr view <number>` and `gh pr diff <number>` — description, linked issue, scope.
2. `gh pr checks <number>` — is CI green? Note which suites ran. Local `npm test` does
   **not** cover the Docker-dependent suites (Mongo/S3, Redis, ClamAV, html-exporter,
   integration, Playwright E2E) — green locally is necessary but not sufficient.
3. Read the changed files in full, not just the hunks. For every changed public method,
   read its callers (`grep -rn` across `packages/*/src`) and its tests.
4. Check the commits: conventional-commit format (`type(scope): description`), and a
   `BREAKING CHANGE:` footer / `!` wherever the change actually is breaking.

## What to review

### 1. Backwards compatibility (highest priority)

These packages are published to npm and consumed by downstream apps (Lumi and others).
Any of the following is a breaking change and must be called out explicitly, even if the
author didn't label it one:

- Changed/removed/narrowed signature of anything exported from a package's `src/index.ts`
  or declared in `h5p-server/src/types.ts`.
- **New required members on an interface** implementers provide (`IContentStorage`,
  `ILibraryStorage`, `ITemporaryFileStorage`, `IContentUserDataStorage`,
  `IPermissionSystem`, `ILockProvider`, `IFileSanitizer`, `IFileMalwareScanner`, …) —
  every downstream implementation breaks. A new *optional* member does not.
- New required constructor parameters on `H5PEditor` / `H5PPlayer` / managers.
- Changed config defaults in `H5PConfig`, renamed config keys, or changed env var names.
- Changed HTTP routes, request/response shapes, or status codes in `h5p-express`.
- Changed shape of `window.H5PIntegration` or anything the H5P core JS in the browser
  reads — that contract is fixed by the PHP core, not by us.
- Changed on-disk/database layout: content or library storage paths, MongoDB document
  shape, S3 keys, cached data. Existing installations must keep working, or the PR must
  ship a migration and say so.
- Stricter validation (`PackageValidator`, `ContentFileScanner`, semantics enforcement)
  that now rejects packages/content previously accepted. This is a behaviour break for
  existing users even when no type changed — require it to be justified, and ask whether
  it should be opt-in via config.
- Changed translation keys in `h5p-server/assets/translations/` that downstream
  overrides may reference.

For each one found: state what breaks, who it breaks for, and whether the PR handles it
(deprecation path, optional flag, major version bump, migration, documentation).

### 2. Correctness

- Logic errors, off-by-one, wrong error types, unhandled promise rejections.
- Async: missing `await`, unhandled `Promise.all` failure paths, race conditions around
  the lock provider and temporary files.
- Resource cleanup: temporary files (`#tmp`), streams, locks released in `finally`.
- Error handling: `H5pError` with a translation key that actually exists in
  `assets/translations/en.json`, sensible HTTP status code.
- Security: path traversal in file names, zip-slip in package import, unvalidated user
  input reaching the filesystem, permission checks via `IPermissionSystem` on every new
  entry point, anything weakening SVG sanitization or malware scanning.
- H5P semantics: dependency resolution by exact major.minor, `runnable` handling,
  preloaded vs. editor vs. dynamic dependencies.

### 3. Test coverage (hard requirement)

Project rule: *every* piece of added functionality is covered by a test, *every* bug fix
ships a regression test, and all logical branches are covered.

- Is there a test for each new behaviour, **and for each error/rejection branch**?
- Does a bug-fix PR contain a test that fails without the fix? If you can't tell by
  reading, say so; if the change is small enough, verify it by reverting the src change
  locally (clean tree only) and running the test to watch it fail — then restore.
- Are tests in the right place: `packages/<pkg>/test/ClassName.test.ts`, integration
  tests under the integration config, E2E in `h5p-e2e`?
- Do tests assert behaviour, or just that nothing threw? Snapshot-only changes that were
  regenerated without inspection are a finding.
- Is new storage-interface behaviour tested against *all* implementations (filesystem
  **and** mongos3/S3), or only one?
- Run the suite yourself when the change is non-trivial: `npx vitest run <name>` from the
  repo root, plus `npm run build` and `npm run lint`.

### 4. Design and maintainability

- Programs to the interface, not the implementation; dependencies injected via the
  constructor rather than constructed inline.
- Fits the existing structure — no parallel mechanism next to one that already exists.
  Point at the existing helper when there is one.
- JSDoc on every new public method and class, documenting parameters, return value and
  thrown errors (project rule, not optional).
- Code style: 4-space indent, single quotes, no param reassignment, `_`-prefixed unused
  params, `export default` for major classes, members ordered constructors → static →
  instance and public before private.
- Scope: does the PR do one thing? Unrelated drive-by changes should be split out.

### 5. Documentation

- User-visible behaviour, new config options and new interfaces documented under `docs/`.
- A significant or contested design choice should come with an ADR in
  `docs/development/decisions/` (see `0001-library-dependency-validation.md` for format).
- `npm run lint:docs` passes (remark link validation) if docs changed.

## Output format

```markdown
## Review: <PR title> (#<number>)

**Verdict:** Ready to merge | Needs changes | Needs discussion
**CI:** <state, and which suites are not covered by it>
**Backwards compatibility:** None affected | Breaking: <one line> (labelled / NOT labelled)
**Test coverage:** Adequate | Gaps: <one line>

### Blocking
1. `path/to/File.ts:123` — <what is wrong, why it matters, what would fix it>

### Non-blocking
- `path/to/File.ts:45` — <suggestion>

### Questions
- <thing you could not verify from the diff>

### Looks good
- <what the PR does well — be specific, skip if nothing>
```

Leave a section out entirely when it is empty rather than writing "none". If the verdict
is "Ready to merge", say so plainly without inventing findings to justify the review.
