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
