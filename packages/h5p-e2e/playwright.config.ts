import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';

// The example app needs the downloaded H5P core and editor files to render
// anything. Without them the editor page loads but silently fails, so fail
// loudly here instead of producing confusing test failures later.
const h5pCoreDir = path.join(__dirname, '../h5p-examples/h5p/core');
if (!process.env.E2E_BASE_URL && !fs.existsSync(h5pCoreDir)) {
    throw new Error(
        `Cannot find ${h5pCoreDir}. Run "npm run setup" (or ` +
            '"npm run download:h5p") from the repository root before ' +
            'running the E2E suite.'
    );
}

export default defineConfig({
    testDir: './test',
    fullyParallel: false,
    // The example app has one shared content/library store, so specs must
    // not run concurrently against it. Separate server instances per
    // project/worker arrive in session 7.
    workers: 1,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI
        ? [['github'], ['html', { open: 'never' }]]
        : 'list',
    use: {
        baseURL,
        trace: 'retain-on-failure',
        video: 'retain-on-failure'
    },
    webServer: process.env.E2E_BASE_URL
        ? undefined
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
              timeout: 120_000
          },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
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
