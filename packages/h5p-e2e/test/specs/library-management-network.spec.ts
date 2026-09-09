import { test, expect } from '../fixtures';

import LibraryAdminPanel from '../pages/LibraryAdminPanel';
import ContentTypeCachePanel from '../pages/ContentTypeCachePanel';

/**
 * `@network` library-management coverage, split out of
 * `library-management.spec.ts` so that `playwright.config.ts`'s non-`fs`
 * storage permutations - which restrict their run to
 * `library-management.spec.ts` and `content-lifecycle.spec.ts` - can never
 * pick these tests up. That keeps the storage matrix from failing on an
 * h5p.org outage or an offline run for a reason unrelated to storage,
 * without relying on every entry point remembering to pass
 * `--grep-invert @network`.
 *
 * Both tests here degrade to a skip (rather than a failure) when the Hub
 * is unreachable, since a live network dependency is inherently flaky
 * regardless of storage mode.
 */

/**
 * The direct download URL for the H5P.MathDisplay addon, scraped from
 * https://h5p.org/mathematical-expressions (the addon has no `h5p.json`, so
 * it isn't part of the H5P Hub content-type list `download:content` fetches
 * from - it can't be requested through the usual
 * `https://api.h5p.org/v1/content-types/<id>` endpoint at all). There is no
 * documented stable API for this URL, so the test using it skips itself
 * instead of failing if it ever goes away.
 */
const mathDisplayAddonUrl =
    'https://h5p.org/sites/default/files/h5p-math-display-1-0-45_0.h5p';

test.describe('Library management (network)', () => {
    test('@network updates the content type cache via "Update now"', async ({
        page,
        request
    }) => {
        // The "Update now" button triggers a server-side fetch from the
        // live H5P Hub content-type API
        // (`H5PConfig.hubContentTypesEndpoint`, default
        // `https://hub-api.h5p.org/v1/content-types/`); if that's
        // unreachable the panel's text never changes and the poll below
        // would just time out with a misleading failure. Probing the same
        // endpoint directly first turns that into a skip instead.
        const hubResponse = await request.get(
            'https://hub-api.h5p.org/v1/content-types/'
        );
        test.skip(
            !hubResponse.ok(),
            `Could not reach the H5P Hub content-type API (status ${hubResponse.status()})`
        );

        const cachePanel = new ContentTypeCachePanel(page);
        await page.goto('/');

        await expect(cachePanel.lastUpdateText()).toBeVisible();
        await expect(cachePanel.lastUpdateText()).not.toContainText(
            'Loading...'
        );
        const before = await cachePanel.lastUpdateText().textContent();

        await cachePanel.updateNowButton.click();

        await expect
            .poll(async () => cachePanel.lastUpdateText().textContent(), {
                timeout: 15_000
            })
            .not.toBe(before);
    });

    test('@network installs the H5P.MathDisplay addon and it registers as an addon', async ({
        page,
        request
    }) => {
        const download = await request.get(mathDisplayAddonUrl);
        test.skip(
            !download.ok(),
            `Could not download the MathDisplay addon from h5p.org (status ${download.status()})`
        );
        const buffer = await download.body();

        const admin = new LibraryAdminPanel(page);
        await page.goto('/');
        await admin.uploadLibrary({
            name: 'H5P.MathDisplay.h5p',
            mimeType: 'application/octet-stream',
            buffer
        });

        await expect(page.getByText(/Successfully installed/)).toBeVisible();

        const libraries = await (await request.get('/h5p/libraries')).json();
        const mathDisplay = libraries.find(
            (library: { machineName: string }) =>
                library.machineName === 'H5P.MathDisplay'
        );
        expect(mathDisplay).toBeTruthy();
        expect(mathDisplay.isAddon).toBe(true);
    });
});
