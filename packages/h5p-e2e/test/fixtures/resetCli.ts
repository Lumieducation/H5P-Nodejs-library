import { getStateResetter } from './reset';

/**
 * CLI entry point run from `playwright.config.ts`'s `webServer.command`,
 * *before* the example server process is spawned.
 *
 * This plan originally assumed a Playwright `globalSetup` hook could do the
 * reset "before the server starts". That assumption was wrong: Playwright
 * runs `webServer` plugin setup (which starts the process) before it runs
 * `globalSetup` - by the time `globalSetup` executes, the server has already
 * booted against whatever was on disk. Chaining this script in front of the
 * actual start command in `webServer.command` (`reset && start`) is the only
 * way to guarantee the reset happens first. See E2E_AUTOMATION_PLAN.md,
 * session 3.
 */
getStateResetter()
    .reset()
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        // eslint-disable-next-line no-console
        console.error('Failed to reset h5p-examples state:', error);
        process.exit(1);
    });
