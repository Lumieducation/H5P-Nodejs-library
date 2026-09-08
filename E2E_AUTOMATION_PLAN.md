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
deterministic and offline. Hub *browsing* is tested separately and tagged
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
- Human judgement on whether rendered content *looks* right.

---

## 2. Reference map — files the executing agent will need

| What | Where |
| --- | --- |
| Example server entry point, routes, port (`PORT`, default 8080) | `packages/h5p-examples/src/express.ts` |
| Storage wiring from env vars | `packages/h5p-examples/src/createH5PEditor.ts` |
| Start page HTML (content list, edit/download/HTML/delete buttons) | `packages/h5p-examples/src/startPageRenderer.ts` |
| Play / edit / new / delete routes | `packages/h5p-examples/src/expressRoutes.ts` |
| Library admin + content-type-cache React UI | `packages/h5p-examples/src/client/*.tsx` |
| Editor page template (`#h5p-content-form`, `#save-h5p`, `.h5p-editor`) | `packages/h5p-server/src/renderers/default.ts` |
| Player page template | `packages/h5p-server/src/renderers/player.ts` |
| Storage permutation env vars | `packages/h5p-examples/*.env` |
| Mongo + MinIO for local runs | `scripts/mongo-s3-docker-compose.yml`, `scripts/mongo-s3-redis-docker-compose.yml` |
| CI pipeline (job structure, workspace tarball, MinIO startup) | `.github/workflows/ci.yml` |
| Content fixtures | `test/data/hub-content/*.h5p` |

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
   (which starts the process and waits for it to become available) *before*
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
  are installed together, *nothing* is directly deletable any more - every
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
