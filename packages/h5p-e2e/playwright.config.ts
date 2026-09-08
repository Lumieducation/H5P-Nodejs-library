import { defineConfig } from '@playwright/test';
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
              command: 'npm start --workspace=packages/h5p-examples',
              cwd: path.join(__dirname, '../..'),
              url: baseURL,
              reuseExistingServer: !process.env.CI,
              timeout: 120_000
          },
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        }
    ]
});
