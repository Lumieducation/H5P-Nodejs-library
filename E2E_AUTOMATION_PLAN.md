# Plan: Automating `test-plan.md` with Playwright E2E tests

## Purpose of this document

`test-plan.md` is the manual checklist that has to be worked through before every
release. This document is the implementation plan for replacing most of it with
an automated browser-level E2E suite driving the real `h5p-examples` app.

It is written to be executed by an agent (Sonnet) in **sequential sessions**.
Each session is self-contained: it states what to read first, what to build, and
a concrete acceptance command that must pass before the session is considered
done. Sessions build on each other — do not start session N+1 before session N's
acceptance criteria are green.

**Status: complete.** All 10 sessions below have been implemented, verified
locally (session 10's own acceptance criteria could only be verified for the
push-triggered `e2e-tests` job by close inspection plus local dry-runs of the
underlying commands — see session 10's "Corrected" notes — since this plan's
execution environment cannot itself trigger a GitHub Actions run), and
merged. `test-plan.md` now reflects the slimmed-down residual manual
checklist session 10 produced. Nothing further should be added to this
document as part of this project; a *new* need for more E2E coverage should
get its own plan.

---

## 1. Architectural decisions (do not re-litigate these)

**Tool: Playwright, not Puppeteer.** The repo already has `puppeteer` in
`packages/h5p-html-exporter`, but the test plan requires Chrome, Firefox, Safari
Desktop and Mobile Safari. Only Playwright gives Chromium + Firefox + WebKit +
mobile device emulation from one config.

**Location: a new private workspace package `packages/h5p-e2e`.** It is not
published (`"private": true`), it is added to the `workspaces` array in the root
`package.json`, and its test sources live in `packages/h5p-e2e/test/` so they are
picked up by the existing Prettier glob
(`packages/*/{src,test,examples}/**/*.{ts,tsx}`).

**System under test: `packages/h5p-examples`, started as a real process.** This
is the app the manual plan uses. Playwright's `webServer` config option starts
it; do not try to mount the Express app in-process — the point of this suite is
to exercise the real browser/server pair.

**Storage permutations are driven by environment variables, not by renaming
`.env` files.** `packages/h5p-examples/src/express.ts` calls `dotenv/config`, and
dotenv does **not** override variables that are already set in the process
environment. So exporting `CONTENTSTORAGE=mongos3 LIBRARYSTORAGE=mongo …` before
starting the server selects a backend without touching any file. The three
existing files — `mongo+s3+redis.env`, `mongo+mongos3.env`, `mongos3+mongos3.env`
— are the source of truth for which variables each permutation needs; parse them
or transcribe them into the Playwright config. This single decision automates the
entire "Permutations of storage" section of the manual plan.

**Library installation in tests comes from local `.h5p` files, not from the live
H5P Hub.** `test/data/hub-content/*.h5p` is populated by `npm run download:content`
(and cached in CI) and contains `H5P.Blanks.h5p` and `H5P.CoursePresentation.h5p`.
Installing from these via the library-upload endpoint makes the content tests
deterministic and offline. Hub _browsing_ is tested separately and tagged
`@network`.

**Every test asserts a clean browser console.** "Check browser console for errors
while doing tests" is a checkbox on the manual plan; as a fixture it becomes a
global invariant instead of something a human has to remember.

### What stays manual after this project

These items cannot reasonably be automated here and must remain in a slimmed-down
`test-plan.md`:

- Load downloaded content in **Lumi** (separate desktop app).
- Upload downloaded content in a **WordPress** instance (`scripts/wordpress.yaml`).
- Real **Mobile Safari on a real device** (WebKit emulation is a proxy, not a
  substitute).
- Human judgement on whether rendered content _looks_ right.

---

## 2. Reference map — files the executing agent will need

| What                                                                   | Where                                                                              |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Example server entry point, routes, port (`PORT`, default 8080)        | `packages/h5p-examples/src/express.ts`                                             |
| Storage wiring from env vars                                           | `packages/h5p-examples/src/createH5PEditor.ts`                                     |
| Start page HTML (content list, edit/download/HTML/delete buttons)      | `packages/h5p-examples/src/startPageRenderer.ts`                                   |
| Play / edit / new / delete routes                                      | `packages/h5p-examples/src/expressRoutes.ts`                                       |
| Library admin + content-type-cache React UI                            | `packages/h5p-examples/src/client/*.tsx`                                           |
| Editor page template (`#h5p-content-form`, `#save-h5p`, `.h5p-editor`) | `packages/h5p-server/src/renderers/default.ts`                                     |
| Player page template                                                   | `packages/h5p-server/src/renderers/player.ts`                                      |
| Storage permutation env vars                                           | `packages/h5p-examples/*.env`                                                      |
| Mongo + MinIO for local runs                                           | `scripts/mongo-s3-docker-compose.yml`, `scripts/mongo-s3-redis-docker-compose.yml` |
| CI pipeline (job structure, workspace tarball, MinIO startup)          | `.github/workflows/ci.yml`                                                         |
| Content fixtures                                                       | `test/data/hub-content/*.h5p`                                                      |

Useful existing scripts: `npm run setup` (build + download H5P core + content type
cache), `npm run download:content`, `npm start` (starts h5p-examples on 8080),
`npm run start:dbs` / `npm run stop:dbs`.

---

## 3. Sessions

### Session 1 — Scaffold the package and get one smoke test green

**Goal:** `npm run test:e2e` starts the example server, opens the start page in
Chromium, asserts it rendered, and shuts down cleanly.

**Read first:** `packages/h5p-examples/package.json`, `src/express.ts`,
`src/startPageRenderer.ts`, root `package.json`.

**Do:**

1. Create `packages/h5p-e2e/` with `package.json` (`"private": true`, name
   `@lumieducation/h5p-e2e`, version matching the other packages), and add it to
   the root `package.json` `workspaces` array.
2. Add `@playwright/test` as a devDependency of that package. Install browsers
   with `npx playwright install --with-deps chromium firefox webkit` (document
   this in the package README; CI will need it too).
3. Write `packages/h5p-e2e/playwright.config.ts`:
    - `testDir: './test'`, `fullyParallel: false` for now (the example app has one
      shared content store — parallelism comes later, in session 7, via separate
      server instances per project).
    - `use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
trace: 'retain-on-failure', video: 'retain-on-failure' }`.
    - `webServer`: command `npm start --workspace=packages/h5p-examples`, url
      `http://localhost:8080`, `reuseExistingServer: !process.env.CI`,
      `timeout: 120_000`. Guard it so it is skipped when `E2E_BASE_URL` is set
      externally.
    - Reporter: `list` locally, `['github', ['html', { open: 'never' }]]` in CI.
4. Add root scripts: `"test:e2e": "npx playwright test --config packages/h5p-e2e/playwright.config.ts"`
   and `"test:e2e:ui": "... --ui"`.
5. Add `packages/h5p-e2e/test/smoke.spec.ts`: navigate to `/`, expect the
   `H5P NodeJs Demo` heading and the "Create new content" link to be visible.
6. Add ignores: `packages/h5p-e2e/test-results/`, `playwright-report/`,
   `blob-report/` to `.gitignore`. Confirm ESLint and Prettier accept the new
   files (`npm run lint && npm run format:check`).

**Acceptance:** `npm run build && npm run test:e2e` passes from a clean checkout
(after `npm run setup`), and `npm run lint && npm run format:check` are clean.

**Watch out:** the example app needs `packages/h5p-examples/h5p/core` and
`h5p/editor` (from `npm run download:h5p`, part of `npm run setup`). If they are
missing, the editor page will load but silently fail — make the fixture fail
loudly with a clear message if `packages/h5p-examples/h5p/core` does not exist.

---

### Session 2 — Selector discovery and page objects

**Goal:** a verified, documented set of selectors and page-object classes. This
is the highest-risk part of the whole project and deserves its own session — the
H5P editor and player render inside iframes created by the H5P core JS, and the
selectors must be discovered empirically, never guessed.

**Read first:** `packages/h5p-server/src/renderers/default.ts` and
`renderers/player.ts` (these are the outer pages), `src/client/LibraryAdminComponent.tsx`,
`src/client/ContentTypeCacheComponent.tsx`.

**Do:**

1. Start the app manually (`npm start`), install a content type by hand, and use
   `npx playwright codegen http://localhost:8080` plus DOM dumps to record the
   real structure of:
    - the **editor**: the outer form (`#h5p-content-form`, submit `#save-h5p`),
      the editor iframe the H5P core creates inside `.h5p-editor`, the content-type
      selector, the title/metadata fields, the "Metadata" button, image upload
      widgets (they use a hidden `<input type="file">` — find it), and the
      "Paste"/"Copy" buttons on subcontent.
    - the **player**: the `.h5p-iframe` and the action bar (Reuse, Copyright,
      Embed, Download).
    - the **library admin** and **content type cache** React panels on `/`.
2. Write `packages/h5p-e2e/test/pages/` with one class per surface:
   `StartPage`, `EditorPage`, `PlayerPage`, `LibraryAdminPanel`,
   `ContentTypeCachePanel`. Expose intent-level methods
   (`editor.chooseContentType('Fill in the Blanks')`,
   `editor.setTitle(...)`, `editor.uploadImage(path)`, `editor.save()` returning
   the new content id parsed from the resulting `/h5p/play/:id` URL).
   Prefer `getByRole`/`getByLabel` over CSS; use `frameLocator` for iframes.
3. Write `packages/h5p-e2e/SELECTORS.md` documenting each selector, which frame
   it lives in, and which H5P core version it was verified against — future
   breakage will be traced through this file.
4. Prove the page objects with one spec that creates a minimal Blanks content
   end to end (content type is installed by hand for now; automated installation
   arrives in session 3).

**Acceptance:** the end-to-end Blanks creation spec passes twice in a row.

**Watch out:** H5P editor widgets load asynchronously after the iframe appears.
Use web-first assertions (`await expect(locator).toBeVisible()`) and never
`waitForTimeout`. Budget generously: `expect` timeout 15 s, test timeout 120 s.

---

### Session 3 — Fixtures: state reset, seeding, console guard

**Goal:** every spec starts from a known-empty server, gets the content types it
needs installed deterministically, and fails on any browser console error.

**Read first:** `packages/h5p-express/src` (the library administration and ajax
routes), `packages/h5p-examples/src/express.ts` for the mounted paths.

**Do:**

1. `test/fixtures/reset.ts` — a helper that empties library and content storage.
   For the filesystem backend, delete `packages/h5p-examples/h5p/{libraries,content,temporary-storage,user-data}`
   before the server starts. For Mongo/S3 (session 7) it must instead drop the
   collections and empty the buckets — design the helper behind an interface
   from the start so session 7 only adds an implementation.

    **Corrected in session 3:** this plan originally said to run the reset in a
    Playwright `globalSetup` hook "before the server starts". That assumption
    was wrong — Playwright's task order (see `createGlobalSetupTasks` in
    `playwright/lib/runner/index.js`) runs the `webServer` plugin's `setup()`
    (which starts the process and waits for it to become available) _before_
    the user's `globalSetup` file runs, not after. A `globalSetup`-based reset
    would therefore race the already-started server. Instead, `webServer.command`
    in `playwright.config.ts` chains a small CLI (`test/fixtures/resetCli.ts`,
    invoked via `npx ts-node`) in front of the actual start command:
    `resetCli.ts && npm start --workspace=packages/h5p-examples`. This still
    resets before the server ever binds the port, and it composes correctly
    with `reuseExistingServer` — when a server is already up the whole
    command (reset included) is skipped, which is what you want for local dev
    iteration.

2. `test/fixtures/seed.ts` — installs a content type by POSTing a local
   `test/data/hub-content/<name>.h5p` to the library-upload endpoint using
   Playwright's `request` API. Provide `seedLibraries(['H5P.Blanks',
'H5P.CoursePresentation'])`. Verify against `packages/h5p-express` which
   action name and multipart field name the endpoint expects.
3. `test/fixtures/index.ts` — export a `test` extended from `@playwright/test`
   that:
    - attaches a `page.on('console')` listener collecting `error`-severity
      messages and a `page.on('pageerror')` listener, and fails the test in an
      `afterEach` if anything was collected;
    - supports an allowlist of known-benign messages (regexes), kept in one
      documented array with a comment per entry explaining why it is tolerated —
      the list must stay short and every addition is a deliberate decision.
4. Convert the session-2 spec to use the new fixtures and drop the manual setup.

**Acceptance:** `npm run test:e2e` passes starting from a wiped
`packages/h5p-examples/h5p/content` and `h5p/libraries`, with no manual steps.

---

### Session 4 — Library management specs

Automates the whole "Tests: Library management" section.

**File:** `test/specs/library-management.spec.ts`

**Cover:**

- Reset library storage and cache, then assert the library admin panel lists
  nothing.
- ~~Download the library cache file from the UI (content type cache panel)~~ —
  **corrected in session 2:** `ContentTypeCacheComponent.tsx` has no
  download/export control, only a "Last update: ..." text and an "Update now"
  button (see `packages/h5p-e2e/SELECTORS.md`). Cover the cache instead by
  clicking "Update now" (tag `@network`, since it calls h5p.org) and asserting
  the "Last update" text changes, using `test/data/content-type-cache/*.json`
  fixtures for any assertions that need the cache's shape.
- Install Blanks and Course Presentation (via the seeding fixture) and assert
  both appear in the library admin panel with correct version numbers.
- Delete a content type through the GUI and assert it disappears from both the
  panel and the `GET /h5p/libraries` response.

    **Note from session 4:** the admin panel only renders a delete button when
    `canBeDeleted` is true, i.e. `dependentsCount === 0`
    (`LibraryAdministration` / `LibraryAdminComponent.tsx`). Course
    Presentation's dependency tree pulls in ~40 libraries including
    H5P.Blanks and both content types' own editor-widget libraries depend back
    on their runtime library, so once both content types from the bullet above
    are installed together, _nothing_ is directly deletable any more - every
    library has at least one dependent. The delete test therefore seeds only
    H5P.Blanks by itself (zero dependents) rather than reusing the state from
    the "install Blanks and Course Presentation" test.

- Upload the MathJax addon (`H5P.MathDisplay`) through the library upload UI and
  assert it registers as an addon. Add the `.h5p` to `test/data/` if
  `download:content` does not already provide it; if it must be fetched from
  h5p.org, tag that test `@network`.

    **Note from session 4:** `download:content` does not provide this file -
    H5P.MathDisplay is an addon, not a Hub content type, so it isn't in
    `real-content-types.json` and `https://api.h5p.org/v1/content-types/H5P.MathDisplay`
    404s. Its actual package lives at a static URL scraped from
    https://h5p.org/mathematical-expressions:
    `https://h5p.org/sites/default/files/h5p-math-display-1-0-45_0.h5p`. There
    is no documented stable API for this, so rather than committing the binary
    to `test/data/`, the `@network` test downloads it at runtime via
    Playwright's `request` fixture and calls `test.skip()` (not a failure) if
    the download doesn't succeed - the URL could change without notice.
    "Registers as an addon" is asserted via `GET /h5p/libraries`'s `isAddon`
    field rather than through the UI, since `LibraryAdminComponent.tsx` has no
    addon indicator in its table.

**Acceptance:** the spec file passes in isolation and as part of the full run.

---

### Session 5 — Content lifecycle specs

Automates "Tests: Content" for both content types.

**File:** `test/specs/content-lifecycle.spec.ts`, written as a loop over a
fixture array so Blanks and Course Presentation share one implementation:

```
const contentTypes = [
  { machineName: 'H5P.Blanks', label: 'Fill in the Blanks', ... },
  { machineName: 'H5P.CoursePresentation', label: 'Course Presentation', ... }
];
```

Course Presentation additionally needs two subtypes added to a slide (the manual
plan says "with 2 subtypes") — model that as an optional `addSubcontent` hook on
the fixture object.

**Cover, per content type:** create with metadata set (title, license, author),
upload an image, fill in minimal content, save; assert the player renders it;
edit, save, and assert the change survives; delete and assert it is gone from
the start page and returns 404/absent from storage.

**Acceptance:** both parameterisations pass; the console guard stays green
throughout (this is where it will most likely catch real bugs).

**Corrected in session 5:**

- "returns 404/absent from storage" was imprecise: `expressRoutes.ts`'s
  play route has no not-found branch of its own - any rejection from
  `h5pPlayer.render()` (content missing included) is caught and turned into
  an HTTP **500**, not a 404. The delete test asserts 500.
- The metadata popup's author field is not a generic list widget
  (`.field-name-authorList`, as session 2's notes speculated) but a bespoke
  `.h5p-metadata-author-widget` with its own name input, role select and
  "Save author" button. See SELECTORS.md.
- Uploading an image is identical for both content types (Blanks' `media`
  group and Course Presentation's "Image" toolbar element both render the
  same `.field-name-file` structure), _except_ that Blanks' `media.type`
  library selector auto-selects "Image" and hides itself entirely once
  H5P.Video/H5P.Audio aren't installed (this suite only seeds H5P.Blanks) -
  no explicit "choose Image" step is needed or possible in that case.
- Course Presentation's dragnbar toolbar buttons open a full subcontent
  form immediately on click (not a bare drop-and-configure-later element),
  and every newly added element defaults to the exact same position/size,
  so elements on a slide with more than one item fully overlap; only the
  most-recently-added one can be reliably clicked again afterwards
  (repositioning older ones would require driving the "Transform" panel,
  which no spec needs yet). See SELECTORS.md for the full writeup of both.

---

### Session 6 — Round trip, HTML export, cross-browser

**Files:** `test/specs/round-trip.spec.ts`, `test/specs/html-export.spec.ts`

**Cover:**

- **Copy & paste:** copy content in the editor, create new content, paste,
  save, assert the result renders equivalently.
- **Download / re-upload:** download the `.h5p` via the start page button,
  re-upload it through the editor's upload path, assert the new content renders
  and its `h5p.json`/`content.json` round-trip intact (unzip the downloaded file
  in Node for the structural assertion — this is much stronger than a UI check).
- **HTML export:** click "download HTML", save the file, then `page.goto` it via
  a `file://` URL, assert the content renders and — critically — that the console
  is clean, since a broken bundle usually shows up as a load error rather than a
  visual one.

**Then add the browser matrix.** In `playwright.config.ts` define projects
`chromium`, `firefox`, `webkit`, and `mobile-safari`
(`devices['iPhone 15']`). Restrict the non-Chromium projects with
`testMatch: /html-export|player/` so only the specs the manual plan actually
demands across browsers pay the cost; everything else runs on Chromium only.

**Acceptance:** `npx playwright test --config packages/h5p-e2e/playwright.config.ts --project=webkit`
passes, and the full default run stays under ~10 minutes locally.

**Corrected in session 6:**

- The `testMatch: /html-export|player/` pattern assumed a `player.spec.ts`
  file that was never created - session 2 folded basic player-rendering
  coverage into `blanks-creation.spec.ts` instead. The actual config
  restricts the non-Chromium projects to `html-export.spec.ts` only, not
  `blanks-creation.spec.ts`: driving that spec's CKEditor "Text blocks"
  field through `.fill()` does not reliably commit its value under Mobile
  Safari's touch emulation (confirmed independently - a real WebKit/editor
  interaction quirk, not a config mistake). `html-export.spec.ts` still
  exercises the player across every project (the downloaded HTML renders
  via the same player code), it just seeds its content over the
  `POST /h5p/new` JSON API instead of through the editor UI, which
  sidesteps that field entirely and also means this spec's cross-browser
  runs aren't testing editor-UI compatibility, only player/export
  rendering - the two are different problems, and this project mostly
  the latter.
- The metadata assertion for copy/paste in `round-trip.spec.ts` uses the
  Title field, not the plain "Task description" rich-text field: the H5P
  editor has its own autosave/draft-restore feature that persists unsaved
  form state in `localStorage` across "new content" page loads, which could
  make an assertion on that field pass even with a broken paste. See
  SELECTORS.md's "whole-content copy/paste" note.
- `html-export.spec.ts`'s `file://` console-guard allowlist needed
  per-engine entries beyond Chromium's CORS message: Firefox splits the
  same failure into two console messages and also logs an unrelated,
  spurious "XML Parsing Error" for the same document (content still
  renders correctly; this looks like an internal feed/XML-sniffing pass);
  WebKit phrases its CORS message differently again. All are specific to
  loading a page via `file://` and are kept in that spec's own allowlist,
  not the shared one in `fixtures/index.ts`.
- Session 6 also surfaced one pre-existing, unrelated cross-browser
  finding while diagnosing the above: Firefox and WebKit (unlike Chromium)
  surface the `GET /h5p/contentUserData/:contentId/:dataType/:subContentId`
  request's expected 403 (packages/h5p-examples doesn't set
  `contentUserStateSaveInterval`) as a console error on every content
  player load. This is now in the shared allowlist in `fixtures/index.ts`
  since it affects any spec's `page` fixture once it runs a
  non-Chromium project, not just this session's specs.

---

### Session 7 — Storage permutation matrix

Automates the "Permutations of storage" section.

**Read first:** `packages/h5p-examples/*.env`, `src/createH5PEditor.ts`,
`scripts/mongo-s3-docker-compose.yml`, `scripts/mongo-s3-redis-docker-compose.yml`,
and the `db-tests` job in `.github/workflows/ci.yml` (it shows exactly how MinIO
and Mongo are brought up in CI).

**Do:**

1. Add a `storage` dimension to the config, selected by `E2E_STORAGE`
   (`fs` | `mongo-s3-redis` | `mongo-only`), defaulting to `fs`. Each value maps
   to an env-var set transcribed from the corresponding `.env` file and passed to
   the `webServer` command's `env`. Do **not** rename `.env` files — dotenv does
   not override already-set process env vars, so this composes cleanly.
2. Implement the Mongo/S3 branch of the reset helper from session 3 (drop the
   configured collections, empty the configured buckets) so each run starts clean.
   Give the S3/Mongo names an `E2E_` prefix or a run-scoped suffix so an E2E run
   can never clobber the `test:h5p-mongos3` fixtures.
3. Add root scripts `test:e2e:mongo-s3-redis` and `test:e2e:mongo` that set
   `E2E_STORAGE` and depend on the DBs being up (`npm run start:dbs`; for the
   redis permutation use `scripts/mongo-s3-redis-docker-compose.yml`).
4. Restrict the non-`fs` permutations to a core subset of specs
   (library management + content lifecycle) — running the full suite three times
   buys little and costs a lot.

**Acceptance:** with `npm run start:dbs` running, both non-fs permutations pass,
and re-running immediately also passes (proving the reset works).

**Corrected in session 7:**

- The env-var sets transcribed into `test/fixtures/storageEnv.ts` deviate
  from the checked-in `.env` files in the Mongo collection names, the Mongo
  database name and the S3 bucket names (all given an `e2e`/`e2e-` prefix and
  their own `e2e_h5p` database) - not just as a defensive collision guard
  against `test:h5p-mongos3`'s fixtures (which already use their own
  randomly-suffixed bucket names and a `h5pintegrationtest` database), but
  because `scripts/mongo-s3-docker-compose.yml` (`npm run start:dbs`) does
  not pre-create any S3 buckets at all, unlike
  `scripts/mongo-s3-redis-docker-compose.yml`'s `minio_init` service - so the
  Mongo/S3 reset helper (`MongoS3StateResetter` in `test/fixtures/reset.ts`)
  creates each configured bucket if it doesn't exist yet, then empties it,
  rather than assuming it's already there.
- `mongo+mongos3.env`'s `CACHE=in-memory` is deliberately **not** carried
  over into the `mongo-only` permutation's env (see `MONGO_ONLY_ENV` in
  `storageEnv.ts`). The example server process is started once per
  `npm run test:e2e:mongo(-s3-redis)` run and stays up across every spec
  file in that run, not restarted between them - discovered by running the
  permutation for the first time: after `library-management.spec.ts`'s own
  `test.beforeAll` reset (a direct Mongo wipe, run against the *already
  running* server), the library admin panel still listed 64 libraries left
  over from an earlier spec file, because `createH5PEditor.ts`'s
  `CachedLibraryStorage` (backed by an in-process `cache-manager` instance
  for `CACHE=in-memory`) has no way to learn that storage changed out from
  under it. `CACHE=redis` (the `mongo-s3-redis` permutation) doesn't have
  this problem - Redis lives outside the server process, so
  `MongoS3StateResetter` flushes the relevant Redis logical DBs directly
  alongside the Mongo/S3 reset - but there is no external hook to flush an
  in-memory cache-manager instance, so `mongo-only` drops `CACHE` entirely
  (falling back to `createH5PEditor.ts`'s "no cache" branch) instead.
  Dropping it still exercises the exact `MongoLibraryStorage` code path this
  permutation exists to test; the in-memory caching layer itself is already
  covered independently by
  `packages/h5p-server/test/implementation/cache/CachedLibraryStorage.test.ts`.
- `getStateResetter()` (used both by `resetCli.ts`, chained in front of
  `npm start` in `webServer.command`, and by every spec's own
  `test.beforeAll`) needs the same Mongo/S3/Redis connection details in
  *both* places, but `webServer.env` only applies to the `webServer`
  child process, not to the Playwright test workers that also call
  `getStateResetter()` directly. `playwright.config.ts` therefore applies
  the `E2E_STORAGE` env-var overlay to `process.env` itself, at config-load
  time, before `defineConfig()` runs - not only to `webServer.env` - so
  both the reset-before-boot path and every in-test reset agree on the same
  backend.
- `npm run start:dbs` / `start:dbs:redis` invoke the standalone
  `docker-compose` (v1) binary. The machine this session ran on only had
  the `docker compose` (v2, space-separated) plugin on `PATH`, not that
  binary, so verifying this session had to fall back to running
  `docker compose -f ... up -d` directly instead of through the npm
  scripts. Left the scripts as `docker-compose` rather than changing them
  project-wide on the strength of one environment's `PATH`; if this turns
  out to be common rather than a one-off, switching these two scripts (and
  `start:dbs`/`stop:dbs`) to `docker compose` is a one-line-each fix.
- The sandbox this session ran in could not pull `redis:alpine` or
  `minio/mc` (the image `mongo-s3-redis-docker-compose.yml`'s `minio_init`
  service uses to auto-create S3 buckets) from Docker Hub at all - repeated
  attempts over several minutes each made zero progress, while previously
  content the sandbox already had cached (`mongo:8.0`,
  `minio/minio:RELEASE.2025-09-07T16-13-09Z`, `redis:7-alpine`) pulled
  fine, so this reads as a registry/rate-limit quirk of that sandbox, not a
  problem with the compose file. Verification of the `mongo-s3-redis`
  permutation therefore used a locally-retagged `docker tag redis:7-alpine
  redis:alpine` plus `docker run redis:alpine` standing in for the
  `mongo-s3-redis-docker-compose.yml` stack's `redis` service, and relied on
  `MongoS3StateResetter`'s bucket-auto-create step (which exists precisely
  because `mongo-s3-docker-compose.yml` has no `minio_init` equivalent) to
  cover for the missing `minio_init` service. This is a sandbox-networking
  workaround for verification only, not a code path - the checked-in
  compose file and npm scripts are unchanged, and a machine with normal
  Docker Hub access should pull both images and run
  `npm run start:dbs:redis` directly with no substitution needed. Both
  `mongo-only` and `mongo-s3-redis` were confirmed to pass twice in a row
  against real Mongo/MinIO(/Redis) containers this way, including
  confirming via `redis-cli -n 8/9 dbsize` that the cache and lock Redis
  DBs actually had data in them (i.e. the server really was using Redis,
  not silently falling back).
- Root scripts `start:dbs:redis` / `stop:dbs:redis` were added alongside
  `test:e2e:mongo-s3-redis` (bringing up
  `scripts/mongo-s3-redis-docker-compose.yml`, the compose file with a
  Redis service and bucket auto-creation) - the plan's step 3 mentioned
  using that file for the redis permutation but didn't call out that it
  needs its own start/stop script pair distinct from `start:dbs`/`stop:dbs`
  (which point at the plain `scripts/mongo-s3-docker-compose.yml`).

---

### Session 8 — Content Hub and localization

**Files:** `test/specs/content-hub.spec.ts`, `test/specs/localization.spec.ts`

**Content Hub** (tag every test `@network`, since it talks to h5p.org): search the
hub, browse it, download two different content types and assert both render.
Consider recording the hub responses with `page.route` into
`test/data/hub-fixtures/` so a `@offline` variant can run on every PR while the
live `@network` variant runs nightly.

**Localization:** the example app uses `i18next-http-middleware`'s language
detector, so `?lng=de` on any URL switches language — no REST-server-specific
setup is needed for most of it. Assert, in German:

- H5P Hub content type names and descriptions,
- content metadata field names,
- editor field labels,
- modal labels in the editor,
- modal labels in the player,
- a server message: upload a deliberately invalid `.h5p` and assert the German
  error text,
- server-side rendering: the "Reuse" button label in the player.

Compare against the actual strings in
`packages/h5p-server/assets/translations/*/de.json` — read them in the test rather
than hard-coding, so translation updates do not break the suite.

**Acceptance:** `npx playwright test --grep-invert @network` passes with no
network access; the full run passes with network.

**Corrected in session 8:**

- The `page.route`-recorded `@offline` variant suggested for Content Hub was
  not built - both live content types installed for the "download and it
  renders" tests are cheap and fast in practice (well under 2s each once the
  Hub tile list itself is cached by the browser within a run), and
  hand-maintaining recorded fixtures for a Hub UI that isn't code in this
  repo (bundled with the downloaded H5P core, not `packages/h5p-server`)
  seemed like more ongoing maintenance than the offline variant would save.
  Only the `@network`-tagged variant exists; it is excluded from the
  default `--grep-invert @network` run like every other Hub test.
- Two Hub content types were chosen for their content-hub download tests:
  H5P.FindTheWords and H5P.Accordion - both need only their top-level Title
  field filled in to save (Find The Words' other required fields ship
  non-empty semantics.json defaults; Accordion's one default panel needs
  its nested Title/Text filled in, handled as a one-off in the spec).
  Installing an uninstalled Hub tile does not go tile → detail panel →
  "Install" → back to the tile list → click the tile again, as the plan's
  wording might suggest - clicking "Install" replaces the detail panel with
  a "\<Name\> successfully installed!" confirmation and a "Use" button that
  opens the content form directly (`EditorPage.installContentTypeFromHub()`
  documents the flow; see SELECTORS.md for the class names).
- `EditorPage.openMetadata()` originally used
  `getByRole('button', { name: 'Metadata' })` (session 2), which only
  matches under English - localization.spec.ts's `?lng=de` tests need this
  same method, so it was changed to a CSS selector on the toggle's wrapper
  element (`.h5p-metadata-button-wrapper`) instead, which works in any
  language. This is a fix to session 2's page object, not new
  session-8-only code.
- The player's Reuse button's accessible *name* (what `getByRole('button',
  { name: ... })` matches) is its `aria-label` - the German
  `reuseDescription` string ("Diesen Inhalt an einer anderen Stelle
  nutzen."), not the visible `reuse` label text ("Weiterverwenden") the
  plan bullet asks to assert. `localization.spec.ts` matches the visible
  label via `getByRole('button').filter({ hasText: client.reuse })`
  instead of passing `name` to `getByRole`.
- The Reuse dialog's own body copy ("Download as an .h5p file...", "Copy
  content...") renders in English even under `?lng=de` - the installed H5P
  core version's reuse-dialog layout does not use `client/de.json`'s
  `downloadDescription`/`embedDescription`/`copyrightsDescription` keys at
  all (those appear to belong to an older dialog layout this core version
  no longer renders). The "modal labels in the player" test instead asserts
  on the dialog's heading (`reuseContent`) and its "Close" button
  (`close`), both of which are genuinely localized.
- Testing the German server error message for an invalid `.h5p` upload
  needed the editor's Hub "Upload" tab flow, not the library admin panel's
  upload control: `LibraryAdminComponent.tsx`'s own upload handler only
  ever shows a hardcoded, untranslated "Error while uploading package." on
  failure - it doesn't surface the real server response text
  (`unable-to-unzip` et al.) at all. That test also uses a second, unwrapped
  page (`page.context().newPage()`, the same pattern `html-export.spec.ts`
  established in session 6) rather than the fixture's own `page`, since
  triggering the failure necessarily logs a "Failed to load resource: ...
  400" console error that the shared console guard would otherwise flag.

---

### Session 9 — REST example smoke test

Automates the "Rest example" line.

**Read first:** `packages/h5p-rest-example-server/package.json` (starts via
`ts-node src/index.ts`, `PORT` default 8080 — it will collide with h5p-examples,
so assign it a different port) and `packages/h5p-rest-example-client`
(Vite dev server).

**Do:** add a second Playwright project `rest-example` with its own `webServer`
array — the REST server on e.g. 8081 and the Vite client on its default port —
and a single spec that logs in / loads the React client, creates one piece of
content through the web components, plays it, and deletes it. Keep it a smoke
test; the deep coverage lives in the h5p-examples specs.

**Acceptance:** `npx playwright test --project=rest-example` passes.

**Corrected in session 9:**

- The `.env` var the plan flagged (`PORT`, default 8080) was indeed the
  right thing to override, but the Vite client's `vite.config.ts` also
  hardcoded its proxy target to `http://127.0.0.1:8080` for `/h5p`,
  `/login` and `/logout` - so simply changing the REST server's `PORT` env
  var alone would have left the client silently proxying to the wrong
  (non-existent, since h5p-examples runs on 8080 in the default project)
  server. Fixed by making `vite.config.ts` read the target port from a new
  `H5P_REST_SERVER_PORT` env var (defaulting to `8080` for backwards
  compatibility with any existing manual usage), which the `rest-example`
  webServer entry for the Vite client sets to `8081` to match the REST
  server's own overridden port.
- Playwright's `webServer` option is genuinely global to the whole config,
  not scoped per project - there is no supported way to say "only start
  this `webServer` entry for project X". The plan's phrase "its own
  `webServer` array" undersold this: the config detects
  `--project=rest-example` on `process.argv` at load time and swaps the
  *entire* `webServer` value between the h5p-examples entry and the REST
  example pair (mirroring the config-load-time environment inspection
  session 7 already established for `E2E_STORAGE`). A first attempt at
  this broke silently because Playwright reloads `playwright.config.ts`
  inside every worker process it spawns, and worker processes start with a
  different `process.argv`
  (`playwright/lib/worker/workerProcessEntry.js`, no `--project` flag at
  all) - so the worker's own reload of the config fell back to the
  h5p-examples `baseURL` even though the CLI process correctly started the
  REST/Vite servers. Fixed by latching the detection result into
  `process.env.PLAYWRIGHT_H5P_REST_EXAMPLE_RUN` once found on the CLI
  process's `argv` - worker processes inherit `process.env` from the
  parent that spawns them, so they see the flag even though their `argv`
  doesn't have it.
- `packages/h5p-rest-example-server` enables `csurf()` CSRF protection on
  every `/h5p/*` route (`packages/h5p-examples` has none at all), and only
  the `admin` role has the `UpdateAndInstallLibraries` permission
  (`ExamplePermissionSystem.checkForGeneralAction`) needed for the
  library-upload endpoint the existing `seedLibraries()` fixture uses. So
  session 9 could not reuse that fixture as-is; `test/fixtures/restExampleSeed.ts`
  adds a REST-example-specific `seedRestExampleLibrary()` that first logs
  in as `admin` via `/login` (the example server's `LocalStrategy` never
  checks the password) to obtain a CSRF token, then passes it as the
  `_csrf` query parameter on the upload request - the same mechanism the
  server's own `UrlGenerator` uses to authorize the URLs it hands to the
  browser. The UI flow itself (logging in as a teacher, creating/playing/
  deleting content) needs no such handling - the client's `ContentService`
  already attaches the token from its own login response as a
  `CSRF-Token` header on every request.
- `LibraryAdminComponent.tsx` and `ContentTypeCacheComponent.tsx` exist in
  `packages/h5p-rest-example-client/src/components/` but are not
  referenced anywhere in `App.tsx` (confirmed by grepping the whole `src/`
  tree) - there is no library-administration UI reachable in this app at
  all, only the JSON REST endpoints. This is why seeding has to go through
  a raw API call rather than a UI flow, unlike `packages/h5p-examples`'
  content-hub-based seeding.
- The `<h5p-player>` web component (`@lumieducation/h5p-webcomponents`)
  always renders content inside a real `iframe.h5p-iframe`
  (`h5p-player.ts`'s `createIframe()`), unlike `packages/h5p-examples`'
  server-rendered player page, which places `.h5p-content` directly on the
  page and only wraps it in an iframe when actually embedded via
  `h5p-embed.js` (see `PlayerPage.ts`'s doc comment). `RestExampleAppPage`
  needed its own `playerFrame()` (a `frameLocator`) rather than reusing
  `PlayerPage`'s plain `.h5p-content` locator - see `SELECTORS.md`.
- Verifying this session surfaced a pre-existing, unrelated dependency bug
  in `packages/h5p-rest-example-client`: its `package.json` pinned
  `"vite": "7.3.6"` as an exact version, while `@vitejs/plugin-react@5.2.0`'s
  peer dependency deduped to a separately-hoisted `vite@8.2.2` (pulled in
  by `vitest@4.1.11` elsewhere in the workspace) at the repository root.
  Running `vite`'s own CLI resolved the pinned local `7.3.6`, but that
  process's `@vitejs/plugin-react` (hoisted to the repository root, since
  the client package has no local copy) internally resolved `vite`'s own
  APIs to the *other*, root-hoisted `8.2.2` copy via Node's normal
  `require` resolution - a version whose rolldown-based plugin container
  expects a `moduleType` field the running `7.3.6` instance's transform
  pipeline never sets, breaking every module transform with `Missing field
  'moduleType'` and making the client fail to render at all (reproduced
  independently of any change in this session, via a plain `npm run
  start:rest:client` on the pre-session-9 tree). Fixed by bumping the
  client's own `vite` devDependency to `8.2.2` to match the version
  `@vitejs/plugin-react` actually resolves at runtime, which lets `npm
  install` dedupe both down to one shared copy. Out of scope for this
  session to also address the ecosystem-wide "vite 8 / rolldown-vite"
  transition itself - this is a minimal version-alignment fix, not an
  upgrade to embrace the new bundler.
- No state-reset fixture was added for `packages/h5p-rest-example-server`
  (unlike `packages/h5p-examples`'s `test/fixtures/reset.ts`) - building
  one for a single smoke test seemed like more infrastructure than this
  session's scope warrants, especially since the plan explicitly calls
  this a smoke test whose "deep coverage lives in the h5p-examples specs".
  Instead, the created content's title includes a per-run timestamp
  (`rest-example-smoke.spec.ts`), so the test locates and asserts against
  its own list item regardless of any content left over from a previous
  (or previously failed) run; the test also deletes its own content at the
  end, keeping repeated runs clean in the common case.

---

### Session 10 — CI integration and rewriting `test-plan.md`

**Read first:** `.github/workflows/ci.yml` — note how `install-build` publishes a
`workspace.tar.gz` artifact that every downstream job extracts, and how
`db-tests` starts MinIO manually because service containers cannot override the
image command.

**Do:**

1. Add an `e2e-tests` job, `needs: install-build`, following the existing pattern
   (download artifact → `tar -xzf workspace.tar.gz`). Add
   `npx playwright install --with-deps chromium` plus an `actions/cache` step
   keyed on the Playwright version for `~/.cache/ms-playwright`. Run the default
   Chromium/fs project with `--grep-invert @network`.
2. Upload `playwright-report/` and `test-results/` with
   `actions/upload-artifact@v4` and `if: always()` — traces are the whole point
   when a headless E2E test fails.
3. Add a separate scheduled workflow (or a `schedule:` trigger with a job
   condition) for the expensive dimensions: the full browser matrix, the two
   Mongo/S3/Redis permutations, and the `@network` hub tests. These should not
   run on every push.
4. Add the `e2e-tests` job to the `coveralls-finish` `needs:` list only if it
   produces coverage; otherwise leave coverage alone.
5. **Rewrite `test-plan.md`**: replace every automated item with a pointer to the
   spec that now covers it, and leave a short residual manual checklist —
   Lumi, WordPress, real Mobile Safari, and a visual sanity pass. Add a line
   explaining how to run the suite locally.

**Acceptance:** the pipeline is green on a pushed branch, the report artifact is
downloadable from a failed run, and `test-plan.md` is under ~20 checkboxes.

**Corrected in session 10:**

- `coveralls-finish`'s `needs:` list was left untouched, per the plan's own
  step 4 - `e2e-tests` produces no lcov output, only a Playwright HTML
  report/trace artifacts. `e2e-tests` was instead added to the `release`
  job's `needs:` list (not mentioned explicitly by the plan, but consistent
  with every other quality gate already there - `lint`, `format`,
  `unit-tests`, `clamav-tests`, `html-exporter-tests`, `integration-tests`,
  `db-tests` - all block `release`, and there is no reason E2E failures
  should be the one gate that doesn't).
- The scheduled workflow (`.github/workflows/e2e-nightly.yml`) cannot share
  `install-build`'s `workspace.tar.gz` artifact with `ci.yml`: that artifact
  has `retention-days: 1` and, more fundamentally, artifacts aren't
  addressable across separate workflow *runs* without extra API calls (the
  `actions/download-artifact` action only looks within the current run by
  default). A `schedule`-triggered run is its own run, disconnected from
  whatever push last triggered `ci.yml`. So the nightly workflow has its own
  `build` job, duplicating `install-build`'s steps verbatim rather than
  trying to reference the other workflow's output.
- The nightly workflow's storage-permutation matrix always starts a MinIO
  container regardless of which permutation (`mongo-only` or
  `mongo-s3-redis`) is running, since `test/fixtures/storageEnv.ts` confirms
  both need Mongo *and* S3 - they only differ in whether Redis is also
  needed (`mongo-s3-redis` only). The Redis container step is gated with
  `if: matrix.permutation == 'mongo-s3-redis'` accordingly.
- This session could not actually exercise either workflow file end to end
  - GitHub Actions only runs workflow YAML that exists on a ref it
  evaluates, and this session's sandbox has no way to trigger a real
  Actions run (the task instructions explicitly say not to try). Both files
  were validated by `python3 -c "import yaml; yaml.safe_load(...)"` (parses
  without error) and by close comparison against `ci.yml`'s own established
  patterns (artifact download/extract sequence, the `db-tests` job's manual
  MinIO startup, `actions/cache` keyed on a tool version) rather than by a
  green run. Whoever next touches CI should watch the first scheduled
  (or manually `workflow_dispatch`-triggered) run of
  `e2e-nightly.yml` and the next push's `e2e-tests` job closely.
- `test-plan.md`'s automated-coverage section is a table of area → spec
  file rather than a list of checkboxes, since none of those rows need a
  human to actually do anything - a checkbox implies an action, and
  "confirm the suite is green" for eight different areas would just be the
  same checkbox copy-pasted eight times. The plan's "under ~20 checkboxes"
  acceptance target is about the *actionable* residual checklist, which
  landed at 5.

---

## 4. Standing rules for every session

- **Never `waitForTimeout`.** Use web-first assertions and `expect.poll`. The H5P
  editor is asynchronous everywhere; arbitrary sleeps are how this suite would
  become flaky.
- **Every new spec must pass three consecutive runs** before the session is
  closed. A test that passes once is not done.
- **Conventional commits**, one per session, scoped `test(h5p-e2e): …`. Husky
  runs `npm run lint` + `npm run format:check` on commit and `npm test` on push —
  keep the E2E suite out of the `pre-push` hook, it is far too slow for that.
- **Code style follows `CLAUDE.md`**: 4-space indent, single quotes, no trailing
  commas, `I`-prefixed interfaces, PascalCase files for classes (so page objects
  are `StartPage.ts`, `EditorPage.ts`, …).
- If a session reveals that a selector or an endpoint does not behave as this
  plan assumes, **update this document** as part of that session's commit rather
  than working around it silently.
