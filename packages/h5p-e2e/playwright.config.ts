import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

import { getStorageEnv, getStorageMode } from './test/fixtures/storageEnv';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
const storageMode = getStorageMode();

// Session 9: the `rest-example` project exercises a completely different
// pair of servers (packages/h5p-rest-example-server +
// packages/h5p-rest-example-client) instead of packages/h5p-examples, so it
// needs its own `webServer` entries and its own `baseURL` (the Vite client,
// not the REST server itself).
//
// Playwright's `webServer` option is defined once for the whole config, not
// per project - there is no supported way to scope a `webServer` entry to
// only the project(s) selected by `--project`. Rather than always starting
// every server for every run (wasteful, and a source of port collisions for
// runs that don't need it), this detects the `--project=rest-example` /
// `--project rest-example` CLI flag directly from `process.argv` - the same
// kind of config-load-time environment inspection session 7 already
// established for `E2E_STORAGE` - and swaps the entire `webServer` value
// between the h5p-examples server and the REST example pair.
// This config file is not only loaded once by the `playwright test` CLI
// process - Playwright also reloads it inside every worker process it
// spawns to run tests, and those worker processes are started with a
// different `process.argv`
// (`.../playwright/lib/worker/workerProcessEntry.js`, no `--project` flag
// at all) rather than inheriting the CLI's. Detecting the project from
// `process.argv` alone therefore works for the CLI's own config load (which
// picks the `rest-example` project and starts its `webServer` array) but
// not for the worker's reload of this same file (which would otherwise
// fall back to the h5p-examples `baseURL`, breaking every request the test
// itself makes). Latching the result into `process.env` once detected fixes
// this: worker processes inherit `process.env` from the CLI process that
// spawned them, so they see the flag even though their own `argv` doesn't
// have it.
const isRestExampleRun =
    process.env.PLAYWRIGHT_H5P_REST_EXAMPLE_RUN === '1' ||
    /--project[= ]rest-example/.test(process.argv.join(' '));
if (isRestExampleRun) {
    process.env.PLAYWRIGHT_H5P_REST_EXAMPLE_RUN = '1';
}
const restExampleBaseURL =
    process.env.E2E_REST_EXAMPLE_BASE_URL ?? 'http://localhost:3000';
// packages/h5p-rest-example-server/src/index.ts defaults PORT to 8080,
// which would collide with packages/h5p-examples, so the rest-example
// project's own webServer array (below) runs it on 8082 instead (8081 is
// mongo-express's port in scripts/mongo-s3-docker-compose.yml and
// scripts/mongo-s3-redis-docker-compose.yml). The Vite client's proxy
// target port must match - see `H5P_REST_SERVER_PORT` in
// packages/h5p-rest-example-client/vite.config.ts.
const restExampleServerPort = '8082';

// Applied to `process.env` itself (not just `webServer.env` below) because
// `getStateResetter()` (test/fixtures/reset.ts) also runs inside the
// Playwright test workers themselves - e.g. every spec's
// `test.beforeAll(() => getStateResetter().reset())` - and those workers
// inherit this config file's process env, not the `webServer` child
// process's. Mutating it here, before `defineConfig` is even called, is
// what makes both the reset-before-tests calls and the reset chained in
// front of `npm start` (via `resetCli.ts`, see `webServer.command` below)
// agree on the same Mongo/S3(/Redis) connection details.
Object.assign(process.env, getStorageEnv(storageMode));

// Session 7: the `mongo-s3-redis` / `mongo-only` storage permutations spin
// up a real Mongo + MinIO (+ Redis) stack, which is expensive and mostly
// exercises the same storage-interface code paths regardless of which
// content type is involved - so, per E2E_AUTOMATION_PLAN.md, they run only
// the two specs the manual "Permutations of storage" section actually
// requires (library management, content lifecycle) instead of the whole
// suite.
const nonFsStorageSpecs = [
    'test/specs/library-management.spec.ts',
    'test/specs/content-lifecycle.spec.ts'
];

// The example app(s) need the downloaded H5P core and editor files to
// render anything. Without them the editor page loads but silently fails,
// so fail loudly here instead of producing confusing test failures later.
const h5pCoreDir = path.join(
    __dirname,
    isRestExampleRun
        ? '../h5p-rest-example-server/h5p/core'
        : '../h5p-examples/h5p/core'
);
if (!process.env.E2E_BASE_URL && !fs.existsSync(h5pCoreDir)) {
    throw new Error(
        `Cannot find ${h5pCoreDir}. Run "npm run setup" (or ` +
            '"npm run download:h5p") from the repository root before ' +
            'running the E2E suite.'
    );
}

export default defineConfig({
    testDir: './test',
    // Restrict to the storage-relevant specs for the non-fs permutations
    // (see `nonFsStorageSpecs` above); `undefined` for `fs` runs the whole
    // suite as before.
    testMatch:
        storageMode === 'fs'
            ? undefined
            : nonFsStorageSpecs.map((spec) => new RegExp(`${spec}$`)),
    fullyParallel: false,
    // The example app has one shared content/library store, so specs must
    // not run concurrently against it. Separate server instances per
    // project/worker arrive in session 7.
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // Session 2 already called for these budgets ("expect timeout 15s, test
    // timeout 120s") but the config never applied them. Session 7 hit the
    // gap directly: the `mongo-only` permutation deliberately runs without a
    // library-metadata cache (see storageEnv.ts's `MONGO_ONLY_ENV`), which
    // measurably slows down editor/dragnbar initialization and pushed a
    // Course Presentation drag-and-drop action past the 30s default test
    // timeout. Applying the plan's original budget fixes it for every
    // storage mode, not just the slow one.
    timeout: 120_000,
    expect: { timeout: 15_000 },
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }]]
        : 'list',
    use: {
        baseURL: isRestExampleRun ? restExampleBaseURL : baseURL,
        trace: 'retain-on-failure',
        video: 'retain-on-failure'
    },
    webServer: process.env.E2E_BASE_URL
        ? undefined
        : isRestExampleRun
          ? [
                {
                    command:
                        'npm start --workspace=packages/h5p-rest-example-server',
                    cwd: path.join(__dirname, '../..'),
                    url: `http://localhost:${restExampleServerPort}/h5p/core/js/jquery.js`,
                    reuseExistingServer: !process.env.CI,
                    timeout: 120_000,
                    env: {
                        ...process.env,
                        PORT: restExampleServerPort
                    } as Record<string, string>
                },
                {
                    command:
                        'npm start --workspace=packages/h5p-rest-example-client',
                    cwd: path.join(__dirname, '../..'),
                    url: restExampleBaseURL,
                    reuseExistingServer: !process.env.CI,
                    timeout: 120_000,
                    env: {
                        ...process.env,
                        H5P_REST_SERVER_PORT: restExampleServerPort
                    } as Record<string, string>
                }
            ]
          : {
                // Playwright starts `webServer` before it runs `globalSetup`
                // (session 3 originally assumed the opposite - see
                // E2E_AUTOMATION_PLAN.md), so the state reset has to be
                // chained in front of the actual start command here to
                // guarantee it runs first. `reuseExistingServer` means this
                // whole command - including the reset - is skipped entirely
                // when a server is already up, which is the desired behaviour
                // for local dev iteration.
                command:
                    'npx ts-node packages/h5p-e2e/test/fixtures/resetCli.ts && npm start --workspace=packages/h5p-examples',
                cwd: path.join(__dirname, '../..'),
                url: baseURL,
                reuseExistingServer: !process.env.CI,
                timeout: 120_000,
                // `process.env` already carries the session 7 storage
                // overlay (see the `Object.assign` above), so the spawned
                // shell command - both `resetCli.ts` and the example server
                // it chains into - inherits the same Mongo/S3(/Redis)
                // backend `getStateResetter()` reads inside the test
                // workers.
                env: process.env as Record<string, string>
            },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' },
            // The rest-example project's spec needs the different
            // webServer/baseURL set up above, not this project's.
            testIgnore: /rest-example-smoke\.spec\.ts$/
        },
        {
            name: 'rest-example',
            use: { browserName: 'chromium' },
            testMatch: /rest-example-smoke\.spec\.ts$/
        },
        // Cross-browser coverage is restricted to the one spec the manual
        // plan actually demands across browsers - the standalone HTML
        // export (html-export.spec.ts) - rather than the whole suite, so
        // the Firefox/WebKit/Mobile Safari cost is paid only where it buys
        // real signal.
        //
        // Session 6 correction: the plan's original `/html-export|player/`
        // regex assumed a `player.spec.ts` file that was never created, and
        // an earlier draft of this config matched `blanks-creation.spec.ts`
        // (session 2's basic player-rendering spec) instead. That spec was
        // dropped from this matrix because driving its CKEditor "Text
        // blocks" field through `.fill()` does not reliably commit a value
        // under Mobile Safari's touch emulation - confirmed independently
        // of any change in this session, i.e. a genuine editor/WebKit
        // interaction quirk, not a testMatch or timing issue. Player
        // rendering itself is still exercised across every project because
        // html-export.spec.ts's downloaded HTML also renders via the
        // player - it just seeds its content over the JSON API instead of
        // through the editor UI, sidestepping the incompatible field.
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testMatch: /html-export\.spec\.ts$/
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            testMatch: /html-export\.spec\.ts$/
        },
        {
            name: 'mobile-safari',
            use: { ...devices['iPhone 15'] },
            testMatch: /html-export\.spec\.ts$/
        }
    ]
});
