import { test, expect, seedLibraries, getStateResetter } from '../fixtures';

import LibraryAdminPanel from '../pages/LibraryAdminPanel';
import ContentTypeCachePanel from '../pages/ContentTypeCachePanel';

/**
 * The direct download URL for the H5P.MathDisplay addon, scraped from
 * https://h5p.org/mathematical-expressions (the addon has no `h5p.json`, so
 * it isn't part of the H5P Hub content-type list `download:content` fetches
 * from - it can't be requested through the usual
 * `https://api.h5p.org/v1/content-types/<id>` endpoint at all). There is no
 * documented stable API for this URL, so a test using it is tagged
 * `@network` and skips itself instead of failing if it ever goes away.
 */
const mathDisplayAddonUrl =
    'https://h5p.org/sites/default/files/h5p-math-display-1-0-45_0.h5p';

test.describe('Library management', () => {
    // These build on each other (empty -> installed -> deleted -> installed
    // again), so they share one library storage reset and must run in order.
    test.describe.serial('install and delete lifecycle', () => {
        test.beforeAll(async () => {
            await getStateResetter().reset();
        });

        test('lists no libraries right after a reset', async ({ page }) => {
            const admin = new LibraryAdminPanel(page);
            await page.goto('/');

            await expect(
                admin.container.getByText(
                    'The following libraries are installed'
                )
            ).toBeVisible();
            await expect(admin.container.locator('tbody tr')).toHaveCount(0);
        });

        test('deletes a content type through the GUI', async ({
            page,
            request
        }) => {
            // Seed only Blanks for this test, deliberately not Course
            // Presentation: Course Presentation's dependency tree includes
            // H5P.Blanks, and the admin panel only renders a delete button
            // when `canBeDeleted` is true, i.e. the library has zero
            // dependents (LibraryAdministration.getLibraries /
            // LibraryAdminComponent.tsx). With only Blanks installed nothing
            // depends on it, so it is directly deletable.
            await seedLibraries(request, ['H5P.Blanks']);

            const admin = new LibraryAdminPanel(page);
            await page.goto('/');

            const row = admin.row('Fill in the Blanks (1.14.13)');
            await expect(row).toBeVisible();

            await admin.deleteButton('Fill in the Blanks (1.14.13)').click();
            await expect(row).toBeHidden();

            const libraries = await (
                await request.get('/h5p/libraries')
            ).json();
            expect(
                libraries.some(
                    (library: { machineName: string }) =>
                        library.machineName === 'H5P.Blanks'
                )
            ).toBe(false);
        });

        test('installs Blanks and Course Presentation and lists them with correct versions', async ({
            page,
            request
        }) => {
            await seedLibraries(request, [
                'H5P.Blanks',
                'H5P.CoursePresentation'
            ]);

            const admin = new LibraryAdminPanel(page);
            await page.goto('/');

            await expect(
                admin.row('Fill in the Blanks (1.14.13)')
            ).toBeVisible();
            await expect(
                admin.row('Course Presentation (1.26.3)')
            ).toBeVisible();
        });
    });

    test('@network updates the content type cache via "Update now"', async ({
        page
    }) => {
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
