import {
    test,
    expect,
    seedLibraries,
    getStateResetter,
    readVendoredLibraryVersion
} from '../fixtures';

import LibraryAdminPanel from '../pages/LibraryAdminPanel';

/**
 * `@network` coverage for the Hub content-type cache and addon installation
 * lives in `library-management-network.spec.ts` - kept out of this file so
 * that `playwright.config.ts`'s non-`fs` storage permutations, which
 * restrict their run to this spec plus `content-lifecycle.spec.ts`, never
 * pick it up. Splitting by file makes that exclusion structural rather than
 * depending on every entry point remembering `--grep-invert @network`.
 */

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

            const blanksVersion =
                await readVendoredLibraryVersion('H5P.Blanks');
            const blanksTitle = `Fill in the Blanks (${blanksVersion.major}.${blanksVersion.minor}.${blanksVersion.patch})`;

            const admin = new LibraryAdminPanel(page);
            await page.goto('/');

            const row = admin.row(blanksTitle);
            await expect(row).toBeVisible();

            await admin.deleteButton(blanksTitle).click();
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

            const [blanksVersion, coursePresentationVersion] =
                await Promise.all([
                    readVendoredLibraryVersion('H5P.Blanks'),
                    readVendoredLibraryVersion('H5P.CoursePresentation')
                ]);

            const admin = new LibraryAdminPanel(page);
            await page.goto('/');

            await expect(
                admin.row(
                    `Fill in the Blanks (${blanksVersion.major}.${blanksVersion.minor}.${blanksVersion.patch})`
                )
            ).toBeVisible();
            await expect(
                admin.row(
                    `Course Presentation (${coursePresentationVersion.major}.${coursePresentationVersion.minor}.${coursePresentationVersion.patch})`
                )
            ).toBeVisible();
        });
    });
});
