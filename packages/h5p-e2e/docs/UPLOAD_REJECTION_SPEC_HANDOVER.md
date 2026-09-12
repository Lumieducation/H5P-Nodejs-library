# Handover: browser-level spec for upload rejections

**Goal:** assert that when the server rejects an uploaded file, the H5P
editor _shows the user an error_ instead of hanging on a spinner or
silently doing nothing.

**Status:** not written. The server-side behaviour is already verified by
hand (see the v11.0.0 section of `test-plan.md`) - every case below returns
the right HTTP status and message. What is unverified is the **UI half**:
whether the editor renders that message.

Suggested file: `packages/h5p-e2e/test/specs/upload-rejection.spec.ts`.

---

## Why this needs its own spec

`content-lifecycle.spec.ts` only ever uploads files that succeed. Nothing in
the suite drives a _failing_ upload, so a regression that left the editor
stuck on a spinner - or that swallowed the server's message - would not be
caught. The recent buffer-upload work (#4600) touched exactly this path.

## How the editor surfaces upload errors

Traced through the H5P editor core shipped in
`packages/h5p-examples/h5p/editor/scripts/`:

1. `h5peditor-file-uploader.js` parses the JSON response. If the body has an
   `error` it uses that; otherwise it uses `result.message`, falling back to
   `H5PEditor.t('core', 'unknownFileUploadError')`.
   Our server returns `{"message": "...", "httpStatusCode": 400, ...}`, so
   **`result.message` is what the user sees.**
2. `h5peditor-file.js` catches it and does
   `self.$errors.append(ns.createError(error))`, where `$errors` is
   `$container.find('.h5p-errors')`.
3. `ns.createError()` (`h5peditor.js:784`) wraps the message in a bare
   `<p>`.

So the assertion target is a `<p>` inside `.h5p-errors` within the file
field - i.e. roughly:

```ts
const error = editor.frame.locator('.field-name-file .h5p-errors p');
await expect(error).toHaveText("The file you've uploaded is invalid.");
```

Confirm the exact container scoping against `SELECTORS.md`'s notes on
`.field-name-file` before hard-coding it; `EditorPage.uploadImage()` already
relies on that structure and documents that only one such field is visible
at a time.

## The console-error fixture will fail your spec

This is the main trap. `test/fixtures/index.ts` exports a `test` extended to
**fail on any browser console error or page exception** not in
`ALLOWED_CONSOLE_ERRORS`.

A rejected upload _always_ logs one: `h5peditor-file-uploader.js` calls
`H5P.error(err)`, and `H5P.error` (`h5p/core/js/h5p.js:995`) calls
`console.error`. There may also be a failed-XHR message depending on the
browser.

So a naive spec fails even when the feature works perfectly. Options, in
order of preference:

1. **Scope an allowlist entry to this spec** rather than widening the shared
   global list. The shared list is deliberately short and every entry is
   documented; adding a broad upload-error pattern there would blind every
   other spec to real upload errors.
2. Import the base `test` from `@playwright/test` for this spec only, and
   assert on the console explicitly - i.e. turn the console error from an
   incidental failure into a deliberate assertion ("exactly one error, and
   it names the rejection").

Whichever you pick, leave a comment saying why, matching the tone of the
existing `ALLOWED_CONSOLE_ERRORS` entries.

## Cases worth covering

All of these are **confirmed server-side**; the returned message is in the
right-hand column. Start with the first one and add the rest once the
plumbing works.

| #   | Fixture                                               | Field type | Server response                                                               |
| --- | ----------------------------------------------------- | ---------- | ----------------------------------------------------------------------------- |
| 1   | HTML content named `.png`                             | `image`    | 400 `The file you've uploaded is invalid.`                                    |
| 2   | SVG content named `.png`                              | `image`    | 400 `The file you've uploaded is invalid.`                                    |
| 3   | A real `.pdf` (not in the default `contentWhitelist`) | `file`     | 500 `File "doc.pdf" not allowed. Only files with the following extensions...` |
| 4   | EICAR test file                                       | `file`     | 400 `The file you've uploaded contained malware and was rejected.`            |

Note the **different status codes** - case 3 is a 500, the others 400. If
you assert on status, assert per-case rather than assuming 400.

Case 4 needs `CLAMSCAN_ENABLED=true` and a running clamd, which the default
Playwright web server does not set up. Either tag it and give it its own
server config, or leave it out of the first iteration - cases 1-3 need no
special configuration and already cover "does the editor show the error at
all".

### Generating fixtures

Do not commit binaries for these; build them in the spec or a fixture
helper. Cases 1 and 2 are literally text files with the wrong extension:

```ts
// HTML disguised as PNG
'<html><body><script>alert(1)</script></body></html>';
// SVG disguised as PNG
'<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>';
```

Write them to a temp dir and hand the path to `setInputFiles()`.
For EICAR, use the standard test string rather than any real sample.

## Assertions to make per case

1. An error is visible in `.h5p-errors` within a reasonable timeout.
2. Its text matches the server's message (this is the regression-sensitive
   part - it proves the message was plumbed through rather than replaced by
   `unknownFileUploadError`).
3. **The editor recovered**: the spinner/progress indicator is gone and the
   field is usable again. This is the "does it hang" half of the goal and is
   easy to forget.
4. Optionally: a _subsequent valid_ upload into the same field still
   succeeds, proving the failure did not wedge the widget.

## Running both upload modes

The server-side behaviour is identical in buffer (`TEMP_UPLOADS=false`) and
temp-file mode, so the spec does not strictly need both. If you want the
coverage anyway, note that `TEMP_UPLOADS` is an env var of the `webServer`
in `playwright.config.ts`, and that config takes a single `webServer` value
for the whole run - the existing `isRestExampleRun` switch is the precedent
for swapping it per project. A second project is a heavier change than this
spec warrants; prefer leaving the buffer-mode permutation on the manual
list.

## Conventions to follow

- Import `test`/`expect` from `../fixtures` (subject to the console caveat
  above), not from `@playwright/test` directly.
- Use `test.beforeAll(() => getStateResetter().reset())` like the other
  specs.
- Drive the UI through `EditorPage` and extend that page object rather than
  putting raw locators in the spec - `SELECTORS.md` explains why the file
  widget needs the `a.add` click before an `<input type="file">` exists.
- Tag with `@network` only if it talks to h5p.org. These cases do not, so
  the spec should run in the default CI project.
- Run `npm run typecheck --workspace=packages/h5p-e2e` before pushing; it is
  wired into the root `lint` CI job.

## Related

- Known bug that will look like a spec failure if you test SVG uploads
  directly: prolog-bearing SVGs are rejected while prolog-less ones are
  accepted -
  [#4619](https://github.com/Lumieducation/H5P-Nodejs-library/issues/4619).
  Cases 1-2 above sidestep it by disguising the file as `.png`.
- `test-plan.md` - the manual checks this spec would retire.
