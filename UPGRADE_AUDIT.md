# Upgrade Audit Report

**Date:** 2026-02-22
**Node.js:** v25.6.1 | **npm:** 11.9.0

---

## CRITICAL — Deprecated / End-of-Life

| #   | What                | Where        | Current  | Latest  | Notes                                                                                                                      |
| --- | ------------------- | ------------ | -------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`cache-manager`** | `h5p-server` | `^4.0.0` | `7.2.8` | 3 major versions behind. v5+ was a complete API rewrite. Used in `CachedKeyValueStorage.ts` and `CachedLibraryStorage.ts`. |

## HIGH — Major Versions Behind

| #   | What                     | Where                     | Current           | Latest   | Notes                                                                |
| --- | ------------------------ | ------------------------- | ----------------- | -------- | -------------------------------------------------------------------- |
| 2   | **ESLint**               | root                      | `^9.39.3`         | `10.0.1` | Blocked by `eslint-plugin-react` which only supports up to ESLint 9. |
| 5   | **`jsonpath-plus`**      | `h5p-shared-state-server` | `^7.2.0`          | `10.4.0` | 3 major versions behind with security and API changes.               |
| 6   | **`mongodb`**            | `h5p-mongos3`             | `6.21.0` (pinned) | `7.1.0`  | Major version available, pinned without caret.                       |
| 7   | **`react`**              | `h5p-react`               | `18.3.1` (pinned) | `19.2.4` | React 19 is current stable. Pinned without caret.                    |
| 8   | **`redis`** (peer dep)   | `h5p-redis-lock`          | `^4.7.0`          | `5.11.0` | Users on redis v5 cannot use this package.                           |
| 9   | **`jsdom`**              | `h5p-svg-sanitizer`       | `^26.0.0`         | `28.1.0` | 2 major versions behind.                                             |
| 10  | **`image-size`**         | `h5p-server`              | `^1.0.2`          | `2.0.2`  | Major version behind.                                                |
| 11  | **`simple-redis-mutex`** | `h5p-redis-lock`          | `^2.0.0`          | `3.0.0`  | Major version behind.                                                |

## MEDIUM — Tooling & Configuration Debt

| #   | What                           | Details                                                                                                          |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 12  | **TypeScript strictness**      | `strict` is disabled, `noImplicitAny: false`. Enabling strict mode incrementally would catch many bugs.          |
| 13  | **CommonJS output**            | Blocks upgrades to `flat` v6, `get-all-files` v6 (ESM-only). The broader ecosystem is moving to ESM.             |
| 14  | ~~**No `.nvmrc`**~~            | ~~`engines` says `>=20`, CI uses Node 24, local is Node 25. No developer environment standardization.~~ **DONE** |
| 15  | ~~**Legacy decorator flags**~~ | ~~`experimentalDecorators` + `emitDecoratorMetadata` enabled in tsconfig — likely unused.~~ **DONE**             |
| 16  | ~~**`node:querystring`**~~     | ~~Used in `UrlGenerator.ts` — deprecated in favor of `URLSearchParams`.~~ **DONE**                               |

## LOW — Minor / Unmaintained-but-Stable

| #   | What                                 | Notes                                                                                                                                              |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17  | `promisepipe`                        | Last published 2019. Stable but unmaintained.                                                                                                      |
| 18  | `stream-buffers`                     | Last published 2017. Stable but unmaintained.                                                                                                      |
| 19  | ~~`upath`~~                          | ~~Last published 2020. Could be replaced by `path.posix`.~~ **DONE** — replaced with `path.posix` throughout `h5p-server` and `h5p-html-exporter`. |
| 20  | ~~`@types/resize-observer-browser`~~ | ~~Unnecessary since TS 4.2+ includes `ResizeObserver` in `lib.dom`.~~ **DONE** — removed from `h5p-webcomponents`.                                 |
| 21  | `stream.pipe()` in `downloadFile.ts` | Should use `stream/promises` `pipeline()` for proper error propagation.                                                                            |
| 22  | Self-`@deprecated` methods           | `ContentStorer.copyFromDirectoryToStorage()` and `PackageImporter.addPackageLibrariesAndContent()` still present.                                  |

---

## CI Pipeline (CircleCI)

The CircleCI pipeline (`.circleci/config.yml`) is comprehensive: install-build, lint,
format check, unit tests, integration tests, DB tests, ClamAV tests, HTML exporter tests,
Coveralls coverage upload, and a release job gated on all checks. Uses Node 24.13.1.

**CI-specific issues:**

| #   | What                               | Details                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | ~~**`circleci/mongo:latest`**~~    | ~~Deprecated CircleCI convenience image for MongoDB. Should be replaced with the official `mongo` Docker image.~~ **DONE** — replaced with `mongo:8.0` in CI and all docker-compose files. `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` → `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD` across all compose files. |
| 24  | ~~**Minio image pinned to 2023**~~ | ~~`minio/minio:RELEASE.2023-04-28T18-11-17Z` is nearly 3 years old.~~ **DONE** — updated to `minio/minio:RELEASE.2025-09-07T16-13-09Z` in CI and all docker-compose files.                                                                                                                           |

## What's in Good Shape

- **Express 5.2.1** — already adopted, ahead of most projects
- **TypeScript 5.9.3** — current
- **ESLint 9.x** — current (v10 blocked by `eslint-plugin-react`)
- **Vitest 4.x** — current
- **Husky 9.x**, **Lerna 9.x**, **Prettier 3.6** — all current
- **MongoDB driver patterns** — fully async/await, no callback-style code
- **No deprecated HTTP libraries** (`request`, etc.)
- **No `new Buffer()`, `url.parse`, `fs.exists`** deprecated API usage
- **CircleCI pipeline** — full test/lint/format/release workflow in place

---

## Recommended Upgrade Plan (Ordered by Impact/Effort)

### Quick wins (low effort, high value)

1. ~~Remove `aws-sdk` v2 from `h5p-mongos3/package.json` (dead dependency, ~130MB savings)~~ **DONE**
2. ~~Replace `circleci/mongo:latest` with official `mongo` image in CircleCI config~~ **DONE** (→ `mongo:8.0` and `minio/minio:RELEASE.2025-09-07T16-13-09Z` in CI and all docker-compose files; `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` → `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`)
3. ~~Add `.nvmrc` file~~ **DONE**
4. ~~Replace `node:querystring` with `URLSearchParams` in `UrlGenerator.ts`~~ **DONE**
5. ~~Remove legacy `experimentalDecorators` + `emitDecoratorMetadata` from `tsconfig.build.json`~~ **DONE**
6. ~~Replace `upath` with `path.posix` in `h5p-server` and `h5p-html-exporter`~~ **DONE**
7. ~~Remove `@types/resize-observer-browser` from `h5p-webcomponents`~~ **DONE**

### Medium effort, high value

5. ~~Upgrade ESLint to v9+ and clean up redundant packages~~ **DONE** (v9.39.3; v10 blocked by `eslint-plugin-react`)
6. Upgrade `cache-manager` from v4 to v5+ (API rewrite — affects 2 files in core)
7. Upgrade `jsonpath-plus` from v7 to v10
8. Upgrade `jsdom` from v26 to v28
9. Upgrade `image-size` from v1 to v2

### Larger initiatives

10. Widen `redis` peer dependency to include v5 (and upgrade `simple-redis-mutex`)
11. Add React 19 support to `h5p-react`
12. Upgrade `mongodb` driver from v6 to v7
13. Enable TypeScript strict mode incrementally
14. Consider ESM migration (would unblock `flat` v6, `get-all-files` v6)
