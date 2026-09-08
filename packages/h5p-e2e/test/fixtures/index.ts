import { test as base, expect } from '@playwright/test';

/**
 * Known-benign browser console error messages.
 *
 * This list must stay short. Every entry is a deliberate decision to
 * tolerate a specific, understood message - not a way to make a flaky test
 * pass. Add an entry only with a comment explaining why the message is
 * expected and harmless.
 */
const ALLOWED_CONSOLE_ERRORS: RegExp[] = [
    // H5P core requests GET /h5p/contentUserData/:contentId/:dataType/:subContentId
    // whenever the player loads, to restore previously saved user state.
    // packages/h5p-examples does not set `contentUserStateSaveInterval`, so
    // ContentUserDataController.getContentUserData responds 403 by design
    // (see packages/h5p-express/src/ContentUserDataRouter/ContentUserDataController.ts) -
    // not a bug, just a feature this example app doesn't opt into. Chromium
    // does not surface a failed same-origin XHR like this as a console
    // "error" by default, but Firefox and WebKit do (added while adding the
    // session 6 cross-browser matrix in E2E_AUTOMATION_PLAN.md), so this is
    // only visible on those browsers' projects.
    /contentUserData\/.*\/state\//
];

/**
 * A `test` extended from `@playwright/test`'s base `test` that fails on any
 * browser console error or uncaught page exception that isn't explicitly
 * allowlisted above. This turns "Check browser console for errors while
 * doing tests" (a checkbox on the manual test plan) into a global invariant
 * every spec gets for free just by importing this module instead of
 * `@playwright/test`.
 */
export const test = base.extend({
    page: async ({ page }, use) => {
        const consoleErrors: string[] = [];

        page.on('console', (message) => {
            if (message.type() === 'error') {
                consoleErrors.push(message.text());
            }
        });
        page.on('pageerror', (error) => {
            consoleErrors.push(error.message);
        });

        await use(page);

        const unexpectedErrors = consoleErrors.filter(
            (message) =>
                !ALLOWED_CONSOLE_ERRORS.some((allowed) => allowed.test(message))
        );

        expect(
            unexpectedErrors,
            `Test triggered unexpected browser console error(s):\n${unexpectedErrors.join('\n')}`
        ).toEqual([]);
    }
});

export { expect };
export { seedLibraries } from './seed';
export { seedRestExampleLibrary } from './restExampleSeed';
export { getStateResetter } from './reset';
export type { IStateResetter } from './reset';
