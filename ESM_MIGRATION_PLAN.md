# ESM Migration Plan

## Problem Statement

The project compiles to CommonJS and runs tests with ts-jest in CJS mode. When a
dependency is ESM-only (ships no CJS entry point), `require()` throws
`ERR_REQUIRE_ESM` — both in production and in tests. Today this is avoided by
pinning old CJS versions (`cache-manager@4`, `flat@5`) and relying on dual-format
packages. This is unsustainable as the npm ecosystem moves to ESM-only.

The migration has two phases:

1. **Phase 1 — Vitest migration:** Replace Jest/ts-jest with Vitest. Vitest runs
   natively in ESM via Vite's transform pipeline, so ESM-only deps work in tests
   without hacks.
2. **Phase 2 — Hybrid ESM/CJS build:** Change the production build to emit ESM
   (with an optional CJS fallback), so ESM-only deps work at runtime too.

---

## Phase 1: Migrate from Jest to Vitest

### Overview

| Metric                                     | Value                      |
| ------------------------------------------ | -------------------------- |
| Test files                                 | 53                         |
| `jest.fn()` → `vi.fn()`                    | 27 occurrences in 13 files |
| `jest.spyOn()` → `vi.spyOn()`              | 9 occurrences in 5 files   |
| `jest.mock()` → `vi.mock()`                | 1 occurrence in 1 file     |
| `jest.Mocked<>` / `jest.Mock<>` type casts | 2 occurrences in 1 file    |
| Jest config files to replace               | 6                          |
| Snapshot files to regenerate               | 4 (2 are orphans)          |
| `__mocks__/` directories                   | 1                          |

All standard matchers (`toEqual`, `toBe`, `toThrow`, `toMatchObject`,
`toHaveBeenCalled`, `toHaveBeenCalledWith`, etc.), lifecycle hooks
(`beforeAll`/`afterAll`/`beforeEach`/`afterEach`), and async patterns
(`async`/`await`, `.resolves`/`.rejects`) are fully compatible with Vitest and
need no changes.

### Step 1.1: Install Vitest and remove Jest

**Install:**

```bash
npm install -D vitest
```

**Remove:**

```bash
npm uninstall ts-jest @types/jest
```

Keep `jest` itself installed temporarily if any package-level scripts still
reference it — remove it once all configs are converted.

**Update `package.json` scripts** (root):

- `"test"` → `"vitest run --config vitest.config.ts"`
- `"test:watch"` → `"vitest --config vitest.config.ts"`
- `"test:h5p-mongos3"` → `"vitest run --config vitest.db.config.ts"`
- `"test:h5p-clamav-scanner"` → `"vitest run --config packages/h5p-clamav-scanner/vitest.config.ts"`
- `"test:html-exporter"` → `"vitest run --config packages/h5p-html-exporter/vitest.config.ts"`
- `"test:integration"` → `"vitest run --config vitest.integration.config.ts"`

### Step 1.2: Create Vitest config files

Replace each `jest.config.js` with a `vitest.config.ts`. The root config:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: Number(process.env.TEST_TIMEOUT) || 45000,
        clearMocks: true,
        include: [
            'packages/h5p-server/test/**/*.test.ts',
            'packages/h5p-express/test/**/*.test.ts',
            'packages/h5p-shared-state-server/test/**/*.test.ts',
            'packages/h5p-svg-sanitizer/test/**/*.test.ts'
        ],
        exclude: [
            '**/node_modules/**',
            '**/h5p-mongos3/**',
            '**/h5p-html-exporter/**',
            '**/h5p-examples/**',
            '**/integration/**'
        ]
    }
});
```

Key differences from Jest config:

- No `transform` needed — Vitest handles TypeScript natively via esbuild.
- `globals: true` makes `describe`, `it`, `expect`, `vi` available without
  imports (matching Jest's implicit globals behavior).
- `clearMocks: true` is directly supported.
- `testTimeout` is directly supported.

Create analogous configs:

- `vitest.db.config.ts` (for h5p-mongos3)
- `vitest.integration.config.ts` (for integration tests)
- Per-package configs where needed (`h5p-clamav-scanner`, `h5p-html-exporter`,
  `h5p-express`, `h5p-redis-lock`)

### Step 1.3: Add Vitest type declarations

Since we use `globals: true`, add type support. In the root `tsconfig.json`
(the IDE/lint one), add:

```json
{
    "compilerOptions": {
        "types": ["vitest/globals"]
    }
}
```

Or create a `vitest.d.ts` file at the root:

```ts
/// <reference types="vitest/globals" />
```

### Step 1.4: Replace Jest API calls with Vitest equivalents

This is a mechanical find-and-replace across test files.

#### 1.4a: `jest.fn()` → `vi.fn()` (27 occurrences, 13 files)

Files to change:

- `packages/h5p-express/test/ContentUserDataRouter.test.ts` (4)
- `packages/h5p-express/test/FinishedDataRouter.test.ts` (4)
- `packages/h5p-server/test/ContentTypeInformationRepository.test.ts` (2)
- `packages/h5p-server/test/H5PEditor.getLibraryData.test.ts` (2)
- `packages/h5p-server/test/H5PEditor.getLibraryOverview.test.ts` (2)
- `packages/h5p-server/test/ContentManager.test.ts` (1)
- `packages/h5p-server/test/ContentTypeCache.test.ts` (1)
- `packages/h5p-server/test/H5PEditor.saving.test.ts` (1)
- `packages/h5p-server/test/PackageExporter.test.ts` (1)
- `packages/h5p-server/test/PackageImporter.test.ts` (1)
- `packages/h5p-mongos3/test/MongoS3ContentStorage.test.ts` (1)
- `packages/h5p-mongos3/test/S3TemporaryFileStorage.test.ts` (1)
- `packages/h5p-server/test/__mocks__/ContentUserDataStorage.ts` (6)

#### 1.4b: `jest.spyOn()` → `vi.spyOn()` (9 occurrences, 5 files)

Files to change:

- `packages/h5p-server/test/H5PEditor.saving.test.ts` (3)
- `packages/h5p-server/test/H5PEditor.uploadingPackages.test.ts` (2)
- `packages/h5p-server/test/H5PEditor.uploadingVirus.test.ts` (2)
- `packages/h5p-server/test/implementation/cache/CachedLibraryStorage.test.ts` (1)
- `packages/h5p-server/test/PackageImporter.test.ts` (1)

#### 1.4c: `jest.mock()` → `vi.mock()` (1 occurrence)

File: `packages/h5p-server/test/SemanticsEnforcer.text.test.ts`

Note: Vitest hoists `vi.mock()` calls to the top of the file automatically
(same as Jest), but the factory function in Vitest does NOT have access to
variables in the outer scope by default. If the mock factory references
outer-scope variables, prefix those variable names with `mock` (Vitest's
convention) or use `vi.hoisted()`.

#### 1.4d: Type casts (2 occurrences, 1 file)

File: `packages/h5p-server/test/H5PEditor.getLibraryData.test.ts`

- `as jest.Mocked<any>` → `as any` (or use Vitest's `Mocked<>` type from `vitest`)
- `as jest.Mock<any>` → `as any` (or use Vitest's `Mock<>` type from `vitest`)

### Step 1.5: Verify `__mocks__/` directory compatibility

Vitest supports `__mocks__/` directories with the same convention as Jest.
Verify that `packages/h5p-server/test/__mocks__/ContentUserDataStorage.ts`
works correctly. The file uses `jest.fn()` which must be changed to `vi.fn()`
(already counted in step 1.4a).

### Step 1.6: Regenerate snapshots

Delete the existing snapshot files and regenerate:

```bash
rm packages/h5p-server/test/__snapshots__/H5PPlayer.renderHtmlPage.test.ts.snap
rm packages/h5p-server/test/__snapshots__/ContentScanner.test.ts.snap
rm packages/h5p-server/test/__snapshots__/ContentFileScanner.test.ts.snap
rm -rf packages/h5p-server/test/integration/__snapshots__/
npx vitest run --update
```

The two orphan snapshot files (`ContentFileScanner.test.ts.snap` in both
`test/__snapshots__/` and `test/integration/__snapshots__/`) can simply be
deleted — no test references them.

### Step 1.7: Delete old Jest config files

Remove:

- `jest.config.js` (root)
- `jest.db.config.js` (root)
- `jest.integration.config.js` (root)
- `packages/h5p-express/jest.config.js`
- `packages/h5p-html-exporter/jest.config.js`
- `packages/h5p-redis-lock/jest.config.js`
- `packages/h5p-examples/jest.config.js`
- `packages/h5p-clamav-scanner/jest.config.js`
- `packages/h5p-server/jest.coverage.config.js`
- `packages/h5p-server/jest.db.config.js`

### Step 1.8: Update Husky hooks

The pre-push hook runs `npm run test`. Since the test script now invokes
Vitest, no hook changes are needed — just make sure the script works.

### Step 1.9: Update CI configuration

Check `.circleci/` and `.github/` for any references to `jest` CLI flags,
`--coverage` options, or Jest-specific CI configuration. Update them to
use Vitest equivalents.

### Step 1.10: Run tests and fix issues

```bash
npm run test
npm run test:h5p-mongos3    # needs Docker: npm run start:dbs first
npm run test:integration
npm run lint
npm run format:check
```

Fix any remaining issues. Common pitfalls:

- Module mocking differences between Jest and Vitest
- Snapshot format differences (minor, regeneration fixes this)
- Timer behavior differences (not applicable — no fake timers used)

---

## Phase 2: Hybrid ESM/CJS Build

### Overview

| Metric                                         | Value                  |
| ---------------------------------------------- | ---------------------- |
| Source files (src/)                            | 127 across 13 packages |
| Test files (test/)                             | 53 + helpers/mocks     |
| Relative imports needing `.js` ext (src/)      | 313                    |
| Relative imports needing `.js` ext (test/)     | 225                    |
| `__dirname` usages (src/)                      | 20 in 5 files          |
| `__dirname` usages (test/)                     | 124 in ~20 files       |
| JSON relative imports (need import attributes) | 13 in src/             |
| `require()` / `module.exports` in src/         | 0                      |
| Package.json files needing updates             | 13                     |

### Step 2.1: Decide on dual-build vs ESM-only

**Option A — Dual CJS/ESM (recommended for a library):**
Ship both formats. Existing CJS consumers are not broken. New ESM consumers
get native ESM.

```json
{
    "type": "module",
    "exports": {
        ".": {
            "import": "./build/esm/index.js",
            "require": "./build/cjs/index.cjs"
        }
    }
}
```

Requires two tsc invocations per package (one for ESM, one for CJS).

**Option B — ESM-only:**
Simpler build, but breaks all existing CJS consumers. Acceptable if the
library hasn't had a stable CJS API contract, or as a major version bump.

```json
{
    "type": "module",
    "exports": {
        ".": "./build/index.js"
    }
}
```

**Recommendation:** Start with dual build (Option A) for published packages
(`h5p-server`, `h5p-express`, etc.). Example/internal packages can be ESM-only.

### Step 2.2: Add `.js` extensions to all relative imports

**This is the largest single task: 538 imports (313 in src/ + 225 in test/).**

Use an automated tool to do this:

```bash
# Option 1: tsc-esm-fix (post-build fix on .js output)
npm install -D tsc-esm-fix

# Option 2: eslint-plugin-import with import/extensions rule (catches at lint time)
# Already available if @typescript-eslint is configured

# Option 3: A codemod script using ts-morph or jscodeshift
```

**Recommended approach:** Use a codemod with `ts-morph` to add `.js` extensions
to all relative import specifiers across `.ts` source and test files. This is a
one-time mechanical transformation.

The rule: any relative import (`./` or `../`) that does NOT end in `.js`,
`.json`, or another extension gets `.js` appended. Index file imports
(`from './foo'` where `foo/index.ts` exists) become `from './foo/index.js'`.

Process this package-by-package in dependency order:

1. `h5p-server` (largest: 228 src + 179 test = 407 imports)
2. `h5p-express` (23 src + 12 test)
3. `h5p-mongos3` (10 src + 16 test)
4. `h5p-html-exporter` (4 src + 12 test)
5. `h5p-shared-state-server` (21 src + 1 test)
6. `h5p-clamav-scanner` (1 src + 2 test)
7. `h5p-redis-lock` (0 src + 1 test)
8. `h5p-svg-sanitizer` (0 src + 2 test)
9. `h5p-webcomponents` (8 src)
10. `h5p-react` (2 src)
11. `h5p-examples` (5 src)
12. `h5p-rest-example-server` (11 src)
13. `h5p-rest-example-client` (0 — uses CRA/webpack, not applicable)

### Step 2.3: Replace `__dirname` with `import.meta.url`

**144 total occurrences (20 in src/, 124 in test/).**

Create a shared helper in `h5p-server` (or a small utility):

```ts
// packages/h5p-server/src/helpers/dirname.ts
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export function getDirname(importMetaUrl: string): string {
    return dirname(fileURLToPath(importMetaUrl));
}
```

Then in each file that uses `__dirname`:

```ts
import { getDirname } from './helpers/dirname.js';
const __dirname = getDirname(import.meta.url);
```

This keeps the rest of the code unchanged — all existing `__dirname` references
continue to work. For test files, use the same pattern (or inline the two-liner).

Process by concentration:

1. **Test files first** (124 occurrences, ~20 files) — highest count, uniform pattern
2. **`packages/h5p-examples/src/express.ts`** — 12 occurrences
3. **`packages/h5p-server/src/PackageValidator.ts`** — 3 occurrences
4. **`packages/h5p-server/src/H5PEditor.ts`** — 2 occurrences
5. **`packages/h5p-html-exporter/src/HtmlExporter.ts`** — 1 occurrence
6. **`packages/h5p-rest-example-server/src/index.ts`** — 1 occurrence
7. **`packages/h5p-rest-example-server/src/indexSharedState.ts`** — 1 occurrence

### Step 2.4: Handle JSON imports

The 13 JSON relative imports in `h5p-server` src/ files use patterns like:

```ts
import something from '../schemas/foo.json';
```

For Node.js ≥ 20.10 with ESM, change to:

```ts
import something from '../schemas/foo.json' with { type: 'json' };
```

For older Node.js support, use `createRequire`:

```ts
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const something = require('../schemas/foo.json');
```

Since the project requires Node ≥ 20.0.0, the `with { type: 'json' }` syntax
is supported (stable since Node 22, available behind `--experimental-json-modules`
in Node 20). Alternatively, use `createRequire` for broader compatibility.

Check TypeScript version support: `"module": "node16"` or `"nodenext"` with
TypeScript 5.3+ supports import attributes.

### Step 2.5: Update `tsconfig.build.json` files

#### Root `tsconfig.build.json` — create two variants:

**`tsconfig.build.esm.json`:**

```json
{
    "extends": "./tsconfig.build.json",
    "compilerOptions": {
        "module": "node16",
        "moduleResolution": "node16",
        "outDir": "./build/esm"
    }
}
```

**`tsconfig.build.cjs.json`:**

```json
{
    "extends": "./tsconfig.build.json",
    "compilerOptions": {
        "module": "commonjs",
        "moduleResolution": "node",
        "outDir": "./build/cjs"
    }
}
```

Each package gets two build configs extending these, producing output in
`build/esm/` and `build/cjs/` respectively.

**CJS caveat:** When `"type": "module"` is set in package.json, Node.js treats
all `.js` files as ESM. The CJS build output must use `.cjs` extension. TypeScript
does not emit `.cjs` directly, so use a post-build rename step:

```bash
# In each package's build script:
tsc -p tsconfig.build.esm.json
tsc -p tsconfig.build.cjs.json
# Rename .js → .cjs in the CJS output directory
find build/cjs -name '*.js' -exec sh -c 'mv "$1" "${1%.js}.cjs"' _ {} \;
find build/cjs -name '*.js.map' -exec sh -c 'mv "$1" "${1%.js.map}.cjs.map"' _ {} \;
```

Or use a tool like `tsc-cjs` or a simple script.

### Step 2.6: Update `package.json` files for each package

For each published package, add `"type": "module"` and `"exports"`:

```json
{
    "type": "module",
    "main": "./build/cjs/index.cjs",
    "module": "./build/esm/index.js",
    "types": "./build/esm/index.d.ts",
    "exports": {
        ".": {
            "import": {
                "types": "./build/esm/index.d.ts",
                "default": "./build/esm/index.js"
            },
            "require": {
                "types": "./build/cjs/index.d.cts",
                "default": "./build/cjs/index.cjs"
            }
        }
    }
}
```

Process package-by-package:

1. `h5p-server`
2. `h5p-express`
3. `h5p-html-exporter`
4. `h5p-mongos3`
5. `h5p-redis-lock`
6. `h5p-svg-sanitizer`
7. `h5p-clamav-scanner`
8. `h5p-shared-state-server`
9. `h5p-webcomponents` (already has dual build — update exports)
10. `h5p-react` (already has dual build — update exports)

Example/internal packages (`h5p-examples`, `h5p-rest-example-server`,
`h5p-rest-example-client`) can be ESM-only (no CJS output needed).

### Step 2.7: Update build scripts

Root `package.json` build scripts need to invoke both ESM and CJS builds.
Example for a package:

```json
{
    "scripts": {
        "build": "npm run build:esm && npm run build:cjs",
        "build:esm": "tsc -p tsconfig.build.esm.json",
        "build:cjs": "tsc -p tsconfig.build.cjs.json && node scripts/rename-cjs.js"
    }
}
```

The `rename-cjs.js` script renames `.js` → `.cjs` and `.d.ts` → `.d.cts` in
the CJS output directory and rewrites internal import specifiers from `.js` to
`.cjs`.

### Step 2.8: Update the root `tsconfig.json` (IDE config)

Change to:

```json
{
    "compilerOptions": {
        "module": "node16",
        "moduleResolution": "node16"
    }
}
```

This gives the IDE correct ESM resolution with `.js` extensions and
`exports` field support.

### Step 2.9: Update ESLint configuration

Add or enable the `import/extensions` rule to enforce `.js` extensions on
relative imports, preventing regressions:

```js
// eslint.config.mjs
{
    rules: {
        'import/extensions': ['error', 'ignorePackages', {
            ts: 'never',   // TypeScript files use .js in imports
            tsx: 'never',
            js: 'always',
            mjs: 'always'
        }]
    }
}
```

Or use `@typescript-eslint/no-restricted-imports` with a custom pattern.

### Step 2.10: Run full validation

```bash
npm run build
npm run test
npm run test:h5p-mongos3
npm run test:integration
npm run lint
npm run format:check
```

Additionally, test that the published packages work correctly for both
ESM and CJS consumers:

```js
// test-esm-consumer.mjs
import { H5PEditor } from '@lumieducation/h5p-server';
console.log(typeof H5PEditor); // 'function'

// test-cjs-consumer.cjs
const { H5PEditor } = require('@lumieducation/h5p-server');
console.log(typeof H5PEditor); // 'function'
```

---

## Execution Order Summary

### Phase 1 (Vitest) — estimated ~1–2 sessions

| Step | Description                         | Effort                             |
| ---- | ----------------------------------- | ---------------------------------- |
| 1.1  | Install Vitest, remove Jest/ts-jest | Small                              |
| 1.2  | Create Vitest config files          | Small                              |
| 1.3  | Add Vitest type declarations        | Tiny                               |
| 1.4  | Replace jest._ API calls with vi._  | Small (39 occurrences, mechanical) |
| 1.5  | Verify **mocks** directory          | Tiny                               |
| 1.6  | Regenerate snapshots                | Tiny                               |
| 1.7  | Delete old Jest configs             | Tiny                               |
| 1.8  | Update Husky hooks (if needed)      | Tiny                               |
| 1.9  | Update CI configuration             | Small                              |
| 1.10 | Run tests and fix issues            | Medium (unknown unknowns)          |

### Phase 2 (Hybrid Build) — estimated ~3–5 sessions

| Step | Description                           | Effort               |
| ---- | ------------------------------------- | -------------------- |
| 2.1  | Decide dual vs ESM-only               | Decision             |
| 2.2  | Add .js extensions to 538 imports     | Large (automatable)  |
| 2.3  | Replace \_\_dirname (144 occurrences) | Medium (automatable) |
| 2.4  | Handle JSON imports (13 occurrences)  | Small                |
| 2.5  | Update tsconfig files                 | Medium               |
| 2.6  | Update package.json exports           | Medium               |
| 2.7  | Update build scripts                  | Medium               |
| 2.8  | Update IDE tsconfig                   | Tiny                 |
| 2.9  | Update ESLint config                  | Small                |
| 2.10 | Full validation and consumer testing  | Large                |

---

## Risks and Mitigations

| Risk                                                | Mitigation                                                                     |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| Vitest module mocking behaves differently from Jest | Only 1 `jest.mock()` call exists — test manually                               |
| Snapshot format differs between Jest and Vitest     | Regenerate all snapshots; review diff                                          |
| CJS consumers break after Phase 2                   | Dual build with `"exports"` map; test both entry points                        |
| `.js` extension codemod misses edge cases           | Lint rule (`import/extensions`) catches regressions; full test suite validates |
| `__dirname` helper adds import overhead             | Negligible; helper is 2 lines                                                  |
| Node 20 JSON import attributes are experimental     | Use `createRequire` fallback if needed; or require Node ≥ 22                   |
| Build time doubles with dual CJS/ESM                | Use `tsc --build` incremental mode; consider esbuild for CJS output            |
| TypeScript declaration files (`.d.ts` vs `.d.cts`)  | Use `@arethetypeswrong/cli` to validate package exports                        |
