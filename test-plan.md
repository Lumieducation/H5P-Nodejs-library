# Plan of manual tests before releases

Most of what used to be a manual checklist here is now an automated
Playwright E2E suite in `packages/h5p-e2e` (see `E2E_AUTOMATION_PLAN.md` for
how it was built, session by session). Before a release, run the suite (or
check its CI job) and then work through the short list of things that
genuinely still need a human, below.

## Running the automated E2E suite locally

- `npm run setup` once (build + download H5P core + content type cache),
  then `npm run test:e2e` - the default run: Chromium, filesystem storage,
  the whole suite except `@network` tests (see "Automated coverage" below
  for what that covers).
- `npm run test:e2e:mongo` / `npm run test:e2e:mongo-s3-redis` - the storage
  permutations (`npm run start:dbs` / `npm run start:dbs:redis` first).
- `npx playwright test --config packages/h5p-e2e/playwright.config.ts --grep @network` -
  the Content Hub tests that talk to h5p.org (needs network access).
- `npx playwright test --config packages/h5p-e2e/playwright.config.ts --project=webkit`
  (or `firefox` / `mobile-safari`) - cross-browser/HTML-export coverage.
- `npm run test:e2e:rest-example` - the REST example server + React client
  smoke test.
- CI runs the default Chromium/filesystem project (`@network` excluded) on
  every push (`e2e-tests` job, `.github/workflows/ci.yml`); the full
  cross-browser matrix, both storage permutations, the REST example project
  and the `@network` Hub tests run nightly instead
  (`.github/workflows/e2e-nightly.yml`) since they are too slow/expensive
  for every push.

## Automated coverage

Nothing to check by hand here - just confirm the relevant run is green.

| Area                                                              | Spec                                    |
| ------------------------------------------------------------------ | ---------------------------------------- |
| Server-side rendering; storage permutations (fs / Mongo+S3+Redis / Mongo-only) | `library-management.spec.ts`, `content-lifecycle.spec.ts` (run against all three backends, see `test/fixtures/storageEnv.ts`) |
| Library management: reset, install/delete content types, addon upload, content type cache update | `test/specs/library-management.spec.ts` |
| Content lifecycle (Blanks and Course Presentation): create with metadata/image/minimal content, display, edit, delete, clean browser console throughout | `test/specs/content-lifecycle.spec.ts` |
| Copy & paste; download and re-upload round trip                    | `test/specs/round-trip.spec.ts`          |
| HTML export, checked in Chromium, Firefox, WebKit and Mobile Safari (emulated) | `test/specs/html-export.spec.ts`         |
| Content Hub: search, browse, download two content types (`@network`) | `test/specs/content-hub.spec.ts`         |
| REST example server + React client                                 | `test/specs/rest-example-smoke.spec.ts`  |
| Localization (`?lng=de`): Hub content type names/descriptions, content metadata field names, editor field labels, editor/player modal labels, a server error message, the player's "Reuse" button label | `test/specs/localization.spec.ts`        |
| `h5p-redis-lock` against a real Redis (not a Playwright/browser test, but likewise nothing to check by hand - just confirm the CI run is green) | `packages/h5p-redis-lock/test/RedisLockerProvider.test.ts`, run via `npm run test:h5p-redis-lock` in the `db-tests` CI job (`.github/workflows/ci.yml`), which stands up a `redis:7-alpine` service alongside the Mongo/MinIO one it already had for `test:h5p-mongos3` |

## Remaining manual checks

These cannot reasonably be automated by the E2E suite (see
`E2E_AUTOMATION_PLAN.md`, "What stays manual after this project"):

- [ ] Load a downloaded `.h5p` package in Lumi (separate desktop app) and try it out.
- [ ] Upload a downloaded `.h5p` package to a WordPress instance (`scripts/wordpress.yaml`) and try it out.
- [ ] Try newly created content on a real Mobile Safari device - WebKit emulation in the E2E suite is a proxy, not a substitute.
- [ ] General visual sanity pass: does content actually *look* right, not just "does it render without console errors"?
