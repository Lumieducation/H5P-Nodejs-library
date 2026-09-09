# @lumieducation/h5p-e2e

Playwright end-to-end tests that drive `packages/h5p-examples` as a real,
running process. This suite replaces most of the manual `test-plan.md`
checklist with automated browser tests.

## Setup

From the repository root:

```bash
npm run setup
npx playwright install --with-deps chromium firefox webkit
```

`npm run setup` builds all packages and downloads the H5P core/editor files
(`packages/h5p-examples/h5p/core`, `packages/h5p-examples/h5p/editor`) that
the example app needs to render the editor and player. The Playwright config
fails loudly on startup if these directories are missing.

## Running

From the repository root:

```bash
npm run test:e2e        # headless run, starts packages/h5p-examples itself
npm run test:e2e:ui     # Playwright UI mode
```

By default Playwright starts `packages/h5p-examples` on `http://localhost:8080`
and tears it down afterwards. Set `E2E_BASE_URL` to point the suite at an
already-running server instead (Playwright will not manage the server's
lifecycle in that case).

These `test:e2e*` scripts (and the storage-permutation/REST-example
variants, `test:e2e:mongo`, `test:e2e:mongo-s3-redis`,
`test:e2e:rest-example`) live only in the **root** `package.json`, not in
this package's. Each one passes a different combination of flags
(`--project`, `--grep-invert @network`, `E2E_STORAGE`) that matter for
correctness - e.g. running without `--project=chromium` picks up the
`rest-example` project, which needs a different pair of servers and fails
against the wrong `baseURL`. Keeping a single copy of each command in the
root `package.json` is what keeps those flags from drifting out of sync
with a duplicate; run the suite from the repository root rather than from
`packages/h5p-e2e`.

## Type checking

```bash
npm run typecheck --workspace=packages/h5p-e2e
```

Runs `tsc --noEmit` over the whole suite (config, fixtures, page objects,
specs). This is wired into the root `lint` CI job.

## Vendored `.h5p` fixtures

`test/data/vendored-content/H5P.Blanks.h5p` and
`test/data/vendored-content/H5P.CoursePresentation.h5p` are committed to the
repo (unlike `test/data/hub-content/`, which is gitignored and populated at
build time by `npm run download:content` from the live H5P Hub). Several
specs assert on these two content types' exact installed version (e.g. the
library-admin panel's "Fill in the Blanks (1.14.13)" row), so pinning them
to files that don't change on their own - rather than to whatever the Hub
happens to be serving on a given day - keeps those assertions from breaking
on an unrelated upstream release. Where practical, specs read the actual
version out of the vendored package itself
(`test/fixtures/vendoredLibraryVersion.ts`) instead of hard-coding it.

`H5P.MathDisplay` is deliberately *not* vendored: it's used only by the
`@network`-tagged addon-installation test in
`test/specs/library-management-network.spec.ts`, which is specifically
testing installation from the live Hub and already skips itself if that
download fails.

To refresh the vendored packages (e.g. to pick up a new H5P.Blanks or
H5P.CoursePresentation release deliberately), copy the current file from a
local `npm run download:content` run:

```bash
cp test/data/hub-content/H5P.Blanks.h5p packages/h5p-e2e/test/data/vendored-content/
cp test/data/hub-content/H5P.CoursePresentation.h5p packages/h5p-e2e/test/data/vendored-content/
```

then re-run the suite - any spec still hard-coding a version string (as
opposed to reading it via `vendoredLibraryVersion.ts`) will need updating
too.
