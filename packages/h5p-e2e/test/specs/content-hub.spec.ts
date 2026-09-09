import { test, expect, getStateResetter } from '../fixtures';

import EditorPage from '../pages/EditorPage';
import PlayerPage from '../pages/PlayerPage';

/**
 * Automates the manual plan's H5P Hub coverage: search the Hub's "Create
 * Content" tab, browse it, and download two different content types
 * (neither of which is pre-packaged in `test/data/hub-content/` - unlike
 * H5P.Blanks and H5P.CoursePresentation, seeded elsewhere via
 * `seedLibraries()`) and assert both render.
 *
 * Every test here is tagged `@network`: installing a content type from the
 * Hub downloads its package from h5p.org, and the tile list itself is
 * populated by a live query to hub-api.h5p.org (see
 * `ContentTypeCacheComponent`/the Hub client bundled with H5P core - not
 * code in this repo).
 *
 * Two content types were chosen deliberately for how little else they
 * require to reach a renderable, saved state: both need only their
 * top-level "Title" field (`.field-name-extraTitle`, filled via
 * `EditorPage.setExtraTitle()`) - every other required field already ships
 * a sensible non-empty default in its semantics.json (H5P.FindTheWords'
 * "Task description" and "Word list" text fields; H5P.Accordion's single
 * default panel needs its own nested title/text filled in, which is the
 * one case handled specially below).
 */
test.describe('Content Hub', () => {
    test.beforeAll(async () => {
        await getStateResetter().reset();
    });

    test('@network searches the Hub content type list', async ({ page }) => {
        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.searchHub('Find the words');

        await expect(editor.hubTile('Find The Words')).toBeVisible();
        // The search narrows the result set - a content type with an
        // unrelated name must not still be listed.
        await expect(editor.hubTile('Course Presentation')).toHaveCount(0);
    });

    test('@network browses the Hub content type list', async ({ page }) => {
        const editor = new EditorPage(page);
        await editor.gotoNew();

        // No search term: the full, unfiltered "All Content Types" listing.
        await expect(
            page
                .frameLocator('.h5p-editor-iframe')
                .locator('.h5p-hub-content-type-list li.h5p-hub-media')
                .first()
        ).toBeVisible();
        await expect(
            page
                .frameLocator('.h5p-editor-iframe')
                .locator('.h5p-hub-content-type-list li.h5p-hub-media')
        ).not.toHaveCount(0);
    });

    test('@network downloads Find The Words from the Hub and it renders', async ({
        page
    }) => {
        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.searchHub('Find the words');
        await editor.installContentTypeFromHub('Find The Words');

        await editor.setExtraTitle('E2E Hub: Find The Words');
        const contentId = await editor.save();
        expect(contentId).toBeTruthy();

        const player = new PlayerPage(page);
        await expect(player.content).toBeVisible();
        // H5P.FindTheWords' semantics.json ships "one,two,three" as the
        // default word list. It renders that as a letter grid (not
        // asserted here - individual letters aren't a stable target) plus
        // a sidebar vocabulary list, which is a reliable, content-specific
        // signal that the game actually mounted rather than just its
        // action bar. Each entry is a `[role="listitem"]` element (see
        // `h5p-find-the-words-vocabulary.js`), but it carries an explicit
        // `aria-label` of "<word> not found" rather than exposing the word
        // itself as its accessible name, so matching by role name doesn't
        // work - matching on the element's text content does.
        await expect(
            page.locator('.vocabulary-container [role="listitem"]', {
                hasText: 'one'
            })
        ).toBeVisible();
        await expect(page.getByRole('button', { name: 'Check' })).toBeVisible();
    });

    test('@network downloads Accordion from the Hub and it renders', async ({
        page
    }) => {
        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.searchHub('Accordion');
        await editor.installContentTypeFromHub('Accordion');

        await editor.setExtraTitle('E2E Hub: Accordion');
        // H5P.Accordion's single default panel has its own required Title
        // and Text fields with no default value, unlike Find The Words -
        // both must be filled in for the form to save.
        const panel = page
            .frameLocator('.h5p-editor-iframe')
            .locator('.field-name-content');
        await panel.locator('.field-name-title input').fill('Panel one');
        await panel
            .locator('.field-name-text .ckeditor')
            .fill('Panel one body text.');

        const contentId = await editor.save();
        expect(contentId).toBeTruthy();

        const player = new PlayerPage(page);
        await expect(player.content).toBeVisible();
        // Accordion renders its one panel collapsed by default - the panel
        // title is a toggle button (`aria-expanded="false"`) that must be
        // clicked before the body text underneath becomes visible.
        await page.getByRole('button', { name: 'Panel one' }).click();
        await expect(
            page.getByText('Panel one body text.', { exact: true })
        ).toBeVisible();
    });
});
