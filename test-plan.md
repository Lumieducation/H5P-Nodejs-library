# Plan of manual tests before releases

Most of what used to be a manual checklist here is now an automated
Playwright E2E suite in `packages/h5p-e2e` (see
`packages/h5p-e2e/docs/E2E_AUTOMATION_PLAN.md` for the original planning
document). Before a release, run the suite (or check its CI job) and then
work through the short list of things that genuinely still need a human,
below.

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

| Area                                                                                                                                                                                                    | Spec                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server-side rendering; storage permutations (fs / Mongo+S3+Redis / Mongo-only)                                                                                                                          | `library-management.spec.ts`, `content-lifecycle.spec.ts` (run against all three backends, see `test/fixtures/storageEnv.ts`)                                                                                                                                           |
| Library management: reset, install/delete content types                                                                                                                                                 | `test/specs/library-management.spec.ts`                                                                                                                                                                                                                                 |
| Library management (`@network`): addon upload, content type cache update                                                                                                                                | `test/specs/library-management-network.spec.ts`                                                                                                                                                                                                                         |
| Content lifecycle (Blanks and Course Presentation): create with metadata/image/minimal content, display, edit, delete, clean browser console throughout                                                 | `test/specs/content-lifecycle.spec.ts`                                                                                                                                                                                                                                  |
| Copy & paste; download and re-upload round trip                                                                                                                                                         | `test/specs/round-trip.spec.ts`                                                                                                                                                                                                                                         |
| HTML export, checked in Chromium, Firefox, WebKit and Mobile Safari (emulated)                                                                                                                          | `test/specs/html-export.spec.ts`                                                                                                                                                                                                                                        |
| Content Hub: search, browse, download two content types (`@network`)                                                                                                                                    | `test/specs/content-hub.spec.ts`                                                                                                                                                                                                                                        |
| REST example server + React client                                                                                                                                                                      | `test/specs/rest-example-smoke.spec.ts`                                                                                                                                                                                                                                 |
| Localization (`?lng=de`): Hub content type names/descriptions, content metadata field names, editor field labels, editor/player modal labels, a server error message, the player's "Reuse" button label | `test/specs/localization.spec.ts`                                                                                                                                                                                                                                       |
| `h5p-redis-lock` against a real Redis (not a Playwright/browser test, but likewise nothing to check by hand - just confirm the CI run is green)                                                         | `packages/h5p-redis-lock/test/RedisLockerProvider.test.ts`, run via `npm run test:h5p-redis-lock` in the `db-tests` CI job (`.github/workflows/ci.yml`), which stands up a `redis:7-alpine` service alongside the Mongo/MinIO one it already had for `test:h5p-mongos3` |

## Remaining manual checks

These cannot reasonably be automated by the E2E suite:

- [ ] Load a downloaded `.h5p` package in Lumi (separate desktop app) and try it out.
- [ ] Upload a downloaded `.h5p` package to a WordPress instance (`scripts/wordpress.yaml`) and try it out.
- [ ] Try newly created content on a real Mobile Safari device - WebKit emulation in the E2E suite is a proxy, not a substitute.
- [ ] General visual sanity pass: does content actually _look_ right, not just "does it render without console errors"?

### Configuration permutations the E2E suite does not cover

The suite always runs `packages/h5p-examples` with its default upload
configuration, so these permutations need a human (or a future spec):

- [ ] **Buffer uploads** (`TEMP_UPLOADS=false`). The suite never sets this,
      so `express-fileupload` always runs with `useTempFiles: true`. The
      whole buffer sanitizer/scanner path is otherwise unexercised.
      Start the app with `TEMP_UPLOADS=false` and upload an image, audio,
      video, an SVG and a `.h5p` package; compare against the same uploads
      in the default mode - the two must behave identically.
- [ ] **Malware scanning enabled** (`CLAMSCAN_ENABLED=true` plus a clamd,
      e.g. `docker run -d -p 3310:3310 clamav/clamav:1.5.4` with
      `CLAMDSCAN_HOST=127.0.0.1 CLAMDSCAN_PORT=3310`). `H5PEditor`'s
      unit tests use a mock scanner and the `clamav-tests` CI job never
      goes through Express, so the wired-up path is only covered by hand.
      Upload an EICAR file and check the _user-visible_ error; repeat with
      `TEMP_UPLOADS=false`.
- [ ] **Range requests / streaming over S3**. Set `CONTENTSTORAGE=mongos3`
      and `TEMPORARYSTORAGE=s3`, after `npm run start:dbs`. Play a long
      video/audio: seek repeatedly, scrub backwards (a range starting at
      byte 0), and abort a download mid-stream while watching the server
      log for `ERR_HTTP_HEADERS_SENT` and leaked connections. The
      filesystem storage backend does **not** exercise the same code.

### Consumer-facing checks

- [ ] **Upgrade smoke test on a fresh consumer project.** Our own CI only
      ever validates the packages from inside this monorepo. Install the
      built tarballs into a scratch project and check: a CJS `require()`
      consumer on the _exact_ minimum Node version (currently 22.12.0, the
      `require(esm)` boundary - a newer Node will not reveal an
      `ERR_REQUIRE_ESM` regression), and a React app using `h5p-react` to
      confirm the JSX typing in `declare module 'react'` resolves.

## Status of the v11.0.0 pre-release pass

Recorded 2026-09-12 against `master`. Keep or replace this section at the
next release.

Done:

- [x] Buffer uploads (`TEMP_UPLOADS=false`) - **pass**. Eleven upload cases
      (images, real MP3/OGG, MP4, SVG, PDF, and HTML/SVG/EICAR disguised as
      `.png`) behaved identically in buffer and temp-file mode.
      `SvgSanitizer` stripped `<script>` and `onload` in both modes.
- [x] ClamAV through the real upload path - **pass**. EICAR rejected and
      clean files accepted in both upload modes, against a real clamd with
      no local `clamdscan` binary; confirmed by clamd's own
      `instream ... Eicar-Test-Signature FOUND` log lines.
- [x] Narrowed `contentWhitelist` - **behaves as designed, but breaks
      existing content**. It is enforced by `PackageValidator`, so a
      previously valid `.h5p` containing `content/*.svg` (or PDF, Office,
      fonts, XML) now fails to import with `not-in-whitelist`. Re-adding the
      extension to `contentWhitelist` restores it. Needs a prominent
      release-note entry.
- [x] Express 5 route params - **pass**. Nested multi-segment paths,
      spaces, `%20`, UTF-8 filenames, `+`, literal `%` and `#` all resolve;
      query strings do not leak into the wildcard; path traversal (`../`,
      `%2e%2e%2f`, `..%2f`, `....//`) is rejected with 400 on the content,
      library and temp-file routes; `nosniff` present on 200 and 206.
- [x] Hub endpoints on `hub-api.h5p.org` - **pass**. Content types fetched
      live; a fresh-install registration (`uuid: ""`) obtained and persisted
      a UUID.

Bugs found and filed:

- [Lumieducation/H5P-Nodejs-library#4618](https://github.com/Lumieducation/H5P-Nodejs-library/issues/4618) -
  206 responses send the filename as `Content-Type` (pre-existing, not an
  Express 5 regression). No test covers the 206 `Content-Type` header.
- [#4619](https://github.com/Lumieducation/H5P-Nodejs-library/issues/4619) -
  SVG uploads accepted or rejected depending on the presence of an XML
  prolog; `validateContent()` runs before the sanitizers, so prolog-bearing
  SVGs never reach `SvgSanitizer`.
- [#4620](https://github.com/Lumieducation/H5P-Nodejs-library/issues/4620) -
  Hub registration is sent as JSON while the content-types call is
  form-urlencoded.

Still open for this release:

- [ ] S3/Mongo range requests and streaming. **The highest-priority gap**:
      all three fixes here (`rangeStart=0` in `MongoS3ContentStorage` /
      `S3TemporaryFileStorage`, the `ERR_HTTP_HEADERS_SENT` handler, and
      s3-stream destroy on close) live in code paths that the filesystem
      runs above never touched.
- [ ] Consumer upgrade smoke test (Node 22.12 exactly / Express 5 / React 19).
- [x] HTML export after the `uglify-js` -> `esbuild` swap: export a
      JS-heavy content type (Course Presentation, Interactive Video) and
      watch for console errors from mis-minified core code.
- [ ] Browser-level check that the editor _surfaces_ upload rejections
      instead of hanging on a spinner. The server side is verified (see
      above), but nothing drives a _failing_ upload through the UI. Note
      that a spec for this has to deal with the shared console-error
      fixture in `packages/h5p-e2e/test/fixtures/index.ts`: H5P core calls
      `console.error` on every rejected upload, so the spec fails even when
      the behaviour is correct unless that one message is allowlisted.
- [ ] The four standing manual checks above (Lumi, WordPress, real Mobile
      Safari, visual sanity). The visual pass matters more than usual this
      release because H5P core 1.28 adds `styles/h5p-fonts.css`.
