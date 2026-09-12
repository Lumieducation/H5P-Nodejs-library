# Release notes — v11.0.0 (DRAFT)

> **Status: draft.** Version number assumed to be `11.0.0` based on
> `17e2cee3 chore: prepare major release`. Covers everything on `master`
> since **v10.0.5** (tagged 2026-03-12): 588 commits, of which ~550 are
> Renovate dependency bumps.

This is a **major release**. Read the [Breaking changes](#breaking-changes)
section before upgrading — three of the five items require action, and one
of them (the content whitelist) can cause **previously valid content to
stop importing**.

---

## Breaking changes

### 1. Minimum Node.js version is now 22.12.0

Previously `>=20.0.0`. Several bundled dependencies (`flat` v6,
`https-proxy-agent` v9) are ESM-only and rely on Node's `require(esm)`
interop, which only became non-experimental in 22.12.0. On an older Node
you will hit `ERR_REQUIRE_ESM`.

The `engines` field is now declared on every publishable package.

_(#4588, `17e2cee3`, `1fc77a1f`)_

### 2. Default `contentWhitelist` has been significantly narrowed

⚠️ **This is the most disruptive change in the release.** It is enforced by
`PackageValidator`, so it affects not only new uploads but **import of
existing `.h5p` packages**. A package whose `content/` directory contains
an SVG, PDF, Office document, font or XML file will now fail to import with
`not-in-whitelist` / `VALIDATION_FAILED` (HTTP 400).

| setting            | before                                                                                                                                                                                        | after                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `contentWhitelist` | `json png jpg jpeg gif bmp tif tiff eot ttf woff woff2 otf webm mp4 ogg mp3 m4a wav txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile vtt webvtt gltf glb` | `json png jpg jpeg gif bmp tif tiff webm mp4 ogg mp3 m4a wav vtt webvtt gltf glb txt`                                    |
| `libraryWhitelist` | `js css svg`                                                                                                                                                                                  | `js css svg eot ttf woff woff2 otf txt pdf rtf doc docx xls xlsx ppt pptx odt ods odp xml csv diff patch swf md textile` |

In short: fonts and document formats moved **out of** the content whitelist
and **into** the library whitelist. Libraries may still ship fonts and
documents; author-uploaded content may not, unless you opt back in.

**To restore the previous behaviour**, set `contentWhitelist` explicitly in
your config to the "before" value above (or add back just the extensions
you need, e.g. `… txt svg pdf`).

_(#4392)_

### 3. Express 5

`@lumieducation/h5p-express` now depends on `express@5`. If you mount our
routers into your own Express app, your app must also be on Express 5 —
Express 4 and 5 middleware cannot be mixed.

Internally, the wildcard route patterns changed from `:file(*)` to `*file`
and `req.params.file` is now a `string[]` joined with `/`. This only
matters if you wrote custom routes against our URL shapes or subclassed
`H5PAjaxExpressController`.

_(#3792, #4358; `body-parser` also went to v2)_

### 4. React 19 (`@lumieducation/h5p-react`)

`react` peer/dependency moved from 18.3.1 to 19.2.8. The JSX type
augmentation moved from `declare global` to `declare module 'react'`, which
is required for React 19's type resolution. `IH5PEditorUIProps` and
`IH5PPlayerUIProps` are now **exported**.

### 5. File sanitizer / malware scanner interfaces gained buffer support

`IFileSanitizer` and `IFileMalwareScanner` now support in-memory buffers
alongside file paths:

- new optional `scanBuffer(file: H5PFileBuffer)` on `IFileMalwareScanner`
- new optional `sanitizeBuffer(file: H5PFileBuffer)` on `IFileSanitizer`
- `IFileSanitizer.sanitize()` gained an optional second parameter,
  `originalFilename`

The new members are optional and `sanitize()`'s new parameter defaults to
the path, so **existing custom implementations keep working**. Implement
the buffer variants if you want to avoid a redundant temp-file write when
running without `useTempFiles`.

_(#4600)_

---

## H5P core updated to 1.28

Core updated from 1.27 to 1.28 (`coreApiVersion` 1.28, `h5pVersion`
1.28.0). Adds `styles/h5p-fonts.css` to the player and editor asset lists,
which defines `@font-face` for Open Sans v40, Inter and the h5p icon font.

If you vendor or pin the H5P core/editor files yourself, update them —
`scripts/install.sh` has the new commit SHAs.

_(#4424)_

## H5P Hub endpoints moved

`hubContentTypesEndpoint` and `hubRegistrationEndpoint` moved from
`api.h5p.org` to `hub-api.h5p.org`, following upstream. If you allowlist
outbound hosts in a firewall or proxy, **add `hub-api.h5p.org`**.

Also: local content IDs are now truncated to conform to the Hub's character
limit, and a misuse of `axios` in the Hub client was fixed.

_(#4386)_

---

## New features

- **Buffer-based file security checks.** Malware scanning is now wired into
  `H5PEditor`'s upload validation path, and both sanitizers and scanners can
  operate on in-memory buffers. Content is now always inspected for
  disguised XML/SVG/HTML regardless of whether an extension is present, and
  the claimed extension is derived from the _original_ filename rather than
  the middleware's temp path. (#4600)
- **`embedCode` and `resizeCode` are now set on the player model**, with all
  occurrences of `:contentId` substituted (previously only the first).
  (#4613)
- **`PackageExporter` now exports addons** as well as regular dependencies.
  (#4102)

## Fixes

- `h5p-mongos3`: byte-range requests **starting at 0** were silently dropped
  (`rangeStart && rangeEnd` treated `0` as falsy) and the full object
  returned instead, in both `S3TemporaryFileStorage` and
  `MongoS3ContentStorage`. (#4610)
- `h5p-express`: stream error handlers threw `ERR_HTTP_HEADERS_SENT`,
  because `writeHead` is always called before `pipe()`. Now checks
  `headersSent`. Fixes #4426. (#4611)
- `h5p-express`: S3 streams are now destroyed when the connection closes.
  (`3eb80cd4`)
- `h5p-express`: added `X-Content-Type-Options: nosniff` to file responses.
  (#4392)
- `h5p-server`: replaced the unmaintained `image-size` with
  `probe-image-size`. `image-size` is archived at 2.0.2 with two unfixed DoS
  vulnerabilities (CVE-2025-71329, CVE-2025-71330) reachable through
  untrusted image uploads. **Security-relevant.** (#4587)
- `h5p-clamav-scanner`: hardened against path traversal in temp filenames,
  fixed async temp-dir handling, and `clamdServiceEnabled` now additionally
  requires a resolved socket/port/host — previously an infected buffer could
  be accepted unscanned when no daemon was configured. **Security-relevant.**
  (#4600)
- `h5p-svg-sanitizer`: SVGs uploaded as extensionless temp files were
  silently returned as `Ignored` — i.e. unsanitized — in exactly the setup
  the docs recommend for malware scanning. **Security-relevant.** (#4600)

## Internal / maintenance

- Test runner migrated from **Jest to Vitest**.
- CI migrated from **CircleCI to GitHub Actions**, including a `clamav-tests`
  job running against a real ClamAV daemon.
- New **Playwright E2E suite** (`packages/h5p-e2e`) replacing most of the
  manual release checklist; see `test-plan.md`.
- `h5p-html-exporter`: `uglify-js` replaced with **esbuild**.
- `h5p-server`: `get-all-files` replaced with a native `readdir` helper;
  `await-lock` replaced with an internal `AsyncLock` in `h5p-webcomponents`.
- `aws-sdk` v2 (deprecated) removed from `h5p-mongos3`; v3 was already in use.
- The experimental ShareDB-based shared-state server has moved to its own
  repo, [h5p-shared-state-server](https://github.com/Lumieducation/h5p-shared-state-server).
- Docs restructured; `CLAUDE.md` / `AGENTS.md` added for agentic coding.

## Notable dependency upgrades (published packages)

| package            | dependency           | from     | to                           |
| ------------------ | -------------------- | -------- | ---------------------------- |
| h5p-server         | `cache-manager`      | ^4       | ^7 (+ `cacheable`, `keyv`)   |
| h5p-server         | `flat`               | ^5       | ^6                           |
| h5p-server         | `https-proxy-agent`  | ^5       | ^9                           |
| h5p-server         | `mime-types`         | ^2       | ^3                           |
| h5p-server         | `image-size`         | ^1       | → `probe-image-size` ^7      |
| h5p-server         | —                    | —        | `magic-bytes.js` ^1.13 (new) |
| h5p-express        | `express`            | 4.21.2   | 5.2.1                        |
| h5p-mongos3        | `mongodb`            | 6.14.2   | 7.6.0                        |
| h5p-mongos3        | `aws-sdk` (v2)       | 2.1692.0 | removed                      |
| h5p-redis-lock     | `redis`              | ^4       | ^6                           |
| h5p-redis-lock     | `simple-redis-mutex` | ^2       | ^3                           |
| h5p-svg-sanitizer  | `jsdom`              | ^26      | ^30                          |
| h5p-clamav-scanner | `ts-deepmerge`       | ^7       | ^8                           |
| h5p-html-exporter  | `uglify-js`          | ^3       | → `esbuild` ^0.28            |
| h5p-html-exporter  | `postcss-import`     | ^16      | ^17                          |
| h5p-react          | `react`              | 18.3.1   | 19.2.8                       |

---

## Upgrade checklist

1. Move to **Node.js >= 22.12.0**.
2. Review your **`contentWhitelist`**. If your existing content embeds SVG,
   PDF, Office documents, fonts or XML, set it explicitly — otherwise those
   packages will fail to import. _(See breaking change 2.)_
3. If you embed our Express routers, upgrade your app to **Express 5**.
4. If you use `@lumieducation/h5p-react`, upgrade to **React 19**.
5. Allowlist **`hub-api.h5p.org`** in any outbound firewall/proxy rules.
6. Update vendored **H5P core files to 1.28** if you manage them yourself.
7. If you implement `IFileSanitizer` / `IFileMalwareScanner`, consider
   adding the buffer variants (optional, not required).

---

## Verification notes

Manually verified before release (see `test-plan.md` for the full plan):

- **Buffer vs. temp-file uploads** (`TEMP_UPLOADS=false` / `true`) produce
  identical results across images, audio, video, SVG, PDF and disguised
  files — no divergence between the two representations.
- **SvgSanitizer** strips `<script>` and event handlers in _both_ upload
  modes, confirming the extensionless-temp-file fix.
- **ClamAV** rejects EICAR and accepts clean files in both modes, against a
  real clamd with no local `clamdscan` binary (the configuration that
  previously accepted infected buffers unscanned). Verified via clamd's own
  `instream … FOUND` log lines.
- **Narrowed whitelist** confirmed to block import of a `.h5p` package
  containing `content/decor.svg`, and re-adding `svg` to `contentWhitelist`
  confirmed to restore it.

Also verified against the live Hub and a running server:

- **Express 5 routing is sound.** Nested multi-segment paths, spaces, `%20`,
  UTF-8 filenames, `+`, literal `%` and `#` all resolve correctly on the
  content, library and temp-file routes; query strings don't leak into the
  wildcard. Path traversal (`../`, `%2e%2e%2f`, `..%2f`, `....//`) is
  rejected with HTTP 400 on all three routes. `nosniff` is present on 200
  and 206 responses.
- **Range handling works over filesystem storage**: `bytes=0-99` returns 206
  with `Content-Range: bytes 0-99/5000` and a body whose hash matches the
  first 100 bytes of the source; `bytes=4990-` and an out-of-range 416 also
  behave. ⚠️ Note this exercised the Express + `FileContentStorage` path. The
  `rangeStart=0` fix (#4610) is in `MongoS3ContentStorage` /
  `S3TemporaryFileStorage`, which these runs did **not** touch — that fix is
  still unverified and needs a run with `CONTENTSTORAGE=mongos3`.
- **`hub-api.h5p.org` works end to end**: the content-types POST returns ~53
  content types, and a fresh-install registration (`uuid: ""`) successfully
  obtained and persisted a UUID.

### Known issues (pre-existing, not regressions)

**206 responses send the filename as `Content-Type`.** In
`H5PAjaxExpressController`, `getContentFile` and `getTemporaryContentFile`
pass the joined filename as the first argument of
`pipeStreamToPartialResponse(mimetype, …)` instead of the `mimetype` they
already destructured — so a range request yields
`Content-Type: images/range-test.bin`. The non-range branch is correct. This
affects seeking in audio/video, and is compounded by `nosniff`. Present
since before v10.0.5 (the Express 5 commit only changed `req.params.file` to
`.join('/')`), but it ships in this major release and the fix is one line
per call site. No test covers the 206 `Content-Type` header.

**Hub registration sends JSON, content-types sends form-urlencoded.**
`compileRegistrationData()` is passed to axios as a plain object, so the POST
to `hubRegistrationEndpoint` goes out as `application/json`, unlike the
form-encoded content-types call and unlike the PHP reference implementation.
hub-api.h5p.org accepts it today, but the asymmetry looks unintentional and
is undocumented.

### Known inconsistency (not a regression, worth noting)

SVG uploads are accepted or rejected depending on whether the file begins
with an XML prolog, because `magic-bytes.js` reports `svg` for content
starting `<svg` but `xml` for content starting `<?xml`, and only the former
matches the claimed `.svg` extension:

| content starts with | detected as | result (with `svg` whitelisted)     |
| ------------------- | ----------- | ----------------------------------- |
| `<svg …>`           | `svg`       | accepted, then sanitized            |
| `<?xml …?><svg …>`  | `xml`       | rejected, `upload-validation-error` |

Since `validateContent()` runs _before_ the sanitizers, prolog-bearing SVGs
are rejected rather than cleaned — and most tools emit the prolog form.
Consider adding an `xml`/`svg` pair to `magicByteEquivalents` in
`contentFileValidation.ts`.
