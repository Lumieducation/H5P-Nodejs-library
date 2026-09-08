import fs from 'fs/promises';
import path from 'path';

import { test, expect, seedLibraries, getStateResetter } from '../fixtures';

import EditorPage from '../pages/EditorPage';

/**
 * `packages/h5p-examples` uses `i18next-http-middleware`'s query-string
 * language detector, so `?lng=de` on any URL switches the server-rendered
 * language - no REST-server-specific setup is needed. This spec reads its
 * expected strings live from `packages/h5p-server/assets/translations/*\/de.json`
 * rather than hard-coding them, so a translation update doesn't silently
 * break the suite - only the shape of the assertions ("this field's label
 * is whatever `title` currently says") is hard-coded.
 *
 * None of these tests need `@network`: content types are seeded from local
 * `test/data/hub-content/*.h5p` files (`seedLibraries()`), not installed
 * from the live Hub. The Hub content-type names/descriptions bullet from
 * the plan is still covered below using `hub/de.json` against the tile
 * list, which is populated locally from H5P.Blanks'/H5P.CoursePresentation's
 * own installed metadata plus h5p.org's live catalogue for everything
 * else - the two seeded types' tiles render from the H5P core client's own
 * bundled Hub data, not from a network call, so this assertion holds
 * offline too.
 */
const translationsDir = path.join(
    __dirname,
    '../../../h5p-server/assets/translations'
);

async function loadTranslations(
    namespace: string
): Promise<Record<string, any>> {
    const filePath = path.join(translationsDir, namespace, 'de.json');
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
}

test.describe('Localization (?lng=de)', () => {
    test.beforeAll(async () => {
        await getStateResetter().reset();
    });

    test.beforeAll(async ({ request }) => {
        await seedLibraries(request, ['H5P.Blanks', 'H5P.CoursePresentation']);
    });

    test('shows Hub content type names and descriptions in German', async ({
        page
    }) => {
        const hub = await loadTranslations('hub');

        const editor = new EditorPage(page);
        await page.goto('/h5p/new?lng=de');
        await editor.searchHub('Fill in the Blanks');

        const tile = editor.hubTile(hub.H5P_Blanks.title);
        await expect(tile).toBeVisible();
        await expect(tile).toContainText(hub.H5P_Blanks.summary);
    });

    test('shows content metadata field names in German', async ({ page }) => {
        const metadataSemantics = await loadTranslations('metadata-semantics');

        const editor = new EditorPage(page);
        await page.goto('/h5p/new?lng=de');
        await editor.chooseContentType('Fill in the Blanks');
        await editor.openMetadata();

        const overlay = page
            .frameLocator('.h5p-editor-iframe')
            .locator('.h5p-metadata-popup-overlay');
        await expect(
            overlay.locator('.field-name-title .h5peditor-label')
        ).toHaveText(metadataSemantics.title);
        await expect(
            overlay.locator('.field-name-license .h5peditor-label')
        ).toHaveText(metadataSemantics.license);
    });

    test('shows editor field labels in German (metadata popup author widget)', async ({
        page
    }) => {
        const metadataSemantics = await loadTranslations('metadata-semantics');

        const editor = new EditorPage(page);
        await page.goto('/h5p/new?lng=de');
        await editor.chooseContentType('Fill in the Blanks');
        await editor.openMetadata();

        // The metadata popup's author widget (`.h5p-metadata-author-widget`,
        // see SELECTORS.md) is a second, independent set of editor field
        // labels from the same modal's top-level fields tested above -
        // both draw from `metadata-semantics/de.json`, but these only
        // render inside the author widget.
        const authorWidget = page
            .frameLocator('.h5p-editor-iframe')
            .locator('.h5p-metadata-author-widget');
        await expect(
            authorWidget.locator('.field-name-name .h5peditor-label')
        ).toHaveText(metadataSemantics['author-name']);
        await expect(
            authorWidget.locator('.field-name-role .h5peditor-label')
        ).toHaveText(metadataSemantics['author-role']);
    });

    test('shows a modal in the editor with German labels (metadata popup)', async ({
        page
    }) => {
        const metadataSemantics = await loadTranslations('metadata-semantics');

        const editor = new EditorPage(page);
        await page.goto('/h5p/new?lng=de');
        await editor.chooseContentType('Fill in the Blanks');
        await editor.openMetadata();

        // `.h5p-metadata-popup-overlay` is a genuine modal overlay (it
        // covers the rest of the form and traps interaction until closed),
        // and fields that only exist inside it - not shown anywhere on the
        // main content form - are the clearest evidence that this specific
        // dialog is localized, as distinct from the main form tested
        // elsewhere in this file.
        const overlay = page
            .frameLocator('.h5p-editor-iframe')
            .locator('.h5p-metadata-popup-overlay');
        await expect(
            overlay.locator('.field-name-licenseExtras .h5peditor-label')
        ).toHaveText(metadataSemantics['license-extras']);
        await expect(overlay.locator('.field-name-change .title')).toHaveText(
            metadataSemantics.changelog
        );
    });

    test('shows a modal in the player with German labels (Reuse dialog)', async ({
        page,
        request
    }) => {
        const client = await loadTranslations('client');

        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');
        await editor.openMetadata();
        await editor.setTitle('E2E Localization: Reuse dialog');
        await editor.saveMetadata();
        await editor.fillRichText(
            '.field-name-text .ckeditor',
            'Localization test.'
        );
        await editor.fillRichText(
            '.field.list.importance-high .ckeditor',
            'This is a *test*.'
        );
        const contentId = await editor.save();

        await page.goto(`/h5p/play/${contentId}?lng=de`);
        await expect(page.locator('.h5p-content')).toBeVisible();

        // The Reuse button's accessible *name* is its aria-label
        // (`reuseDescription`, e.g. "Diesen Inhalt an einer anderen Stelle
        // nutzen."), not its visible label text - `getByRole` with `name`
        // matches the accessible name, so the visible label itself has to
        // be matched via `hasText` instead.
        const reuseButton = page
            .getByRole('button')
            .filter({ hasText: client.reuse });
        await expect(reuseButton).toBeVisible();
        await reuseButton.click();

        await expect(
            page.getByRole('heading', { name: client.reuseContent })
        ).toBeVisible();
        // The dialog's "Download as .h5p file" / "Copy content" body
        // options are rendered in English regardless of `?lng=de` by the
        // installed H5P core version - they don't come from
        // `client/de.json`'s `downloadDescription`/`embedDescription` keys
        // at all (those belong to an older reuse-dialog layout this core
        // version no longer uses), so they aren't a reliable localization
        // signal. The dialog's own "Close" button is translated, though,
        // and is a second, independent label from the heading above.
        await expect(
            page.getByRole('button', { name: client.close })
        ).toBeVisible();
    });

    test('shows a German server error message for an invalid .h5p upload', async ({
        page
    }) => {
        const server = await loadTranslations('server');

        // Deliberately uses a second, unwrapped page
        // (`page.context().newPage()`) instead of the fixture's own `page`:
        // the whole point of this test is to trigger a failed upload, which
        // always logs a "Failed to load resource: ... 400" console error
        // for the rejected request - the same pattern `html-export.spec.ts`
        // uses for its `file://` navigation, which also can't avoid a
        // console error by construction. That's expected and asserted on
        // via the German response text below, not a bug this suite should
        // flag through the shared console guard in `fixtures/index.ts`.
        //
        // The library admin panel's own upload control
        // (`LibraryAdminComponent`) only ever shows a hardcoded,
        // untranslated "Error while uploading package." regardless of the
        // actual server response - it does not surface `unable-to-unzip` -
        // so the Hub's "Upload" tab in the editor is used instead, which
        // does display the real server error text.
        const rawPage = await page.context().newPage();
        await rawPage.goto('/h5p/new?lng=de');
        await rawPage
            .frameLocator('.h5p-editor-iframe')
            .getByText('Hochladen', { exact: true })
            .click();
        await rawPage
            .frameLocator('.h5p-editor-iframe')
            .locator('.h5p-hub-input-wrapper input[type="file"]')
            .setInputFiles({
                name: 'invalid.h5p',
                mimeType: 'application/octet-stream',
                buffer: Buffer.from('not a real H5P package')
            });
        await rawPage
            .frameLocator('.h5p-editor-iframe')
            .getByRole('button', { name: 'Benutzen' })
            .click();

        await expect(
            rawPage
                .frameLocator('.h5p-editor-iframe')
                .locator('.h5p-hub-message-content')
        ).toHaveText(server['unable-to-unzip']);
        await rawPage.close();
    });

    test('shows the German "Reuse" button label in the player', async ({
        page
    }) => {
        const client = await loadTranslations('client');

        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');
        await editor.openMetadata();
        await editor.setTitle('E2E Localization: Reuse button');
        await editor.saveMetadata();
        await editor.fillRichText(
            '.field-name-text .ckeditor',
            'Reuse button test.'
        );
        await editor.fillRichText(
            '.field.list.importance-high .ckeditor',
            'This is a *test*.'
        );
        const contentId = await editor.save();

        // Requested via a direct navigation (not a redirect from the
        // editor) so this is unambiguously server-side rendering, not
        // something the client bundle translates in the browser: the
        // outer HTML the player page renders already contains the
        // localized string before any H5P core JS runs.
        await page.goto(`/h5p/play/${contentId}?lng=de`);
        // See the note above the equivalent locator in the previous test:
        // the button's accessible name is its aria-label description, not
        // this visible label text.
        await expect(
            page.getByRole('button').filter({ hasText: client.reuse })
        ).toBeVisible();
    });
});
