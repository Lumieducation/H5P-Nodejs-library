import { test, expect, seedRestExampleLibrary } from '../fixtures';
import RestExampleAppPage from '../pages/RestExampleAppPage';

/**
 * Automates the manual test plan's "Rest example" line by smoke-testing
 * `packages/h5p-rest-example-server` + `packages/h5p-rest-example-client`
 * (session 9, E2E_AUTOMATION_PLAN.md). This is deliberately a shallow smoke
 * test - logs in, creates one piece of content through the web components,
 * plays it, deletes it - since the deep content-type/editor/player coverage
 * already lives in the `packages/h5p-examples` specs and exercises the same
 * underlying H5P core JS.
 *
 * Runs against the `rest-example` Playwright project, which starts its own
 * pair of servers (the REST example server on port 8081, the Vite client on
 * its default port 3000) instead of `packages/h5p-examples` - see
 * `playwright.config.ts` and E2E_AUTOMATION_PLAN.md's session 9 notes.
 *
 * The REST example server has no state-reset fixture of its own (unlike
 * `packages/h5p-examples`, see `test/fixtures/reset.ts`) - adding one for a
 * single smoke test seemed like more machinery than this session's scope
 * warrants. Instead, the created content's title includes a per-run
 * timestamp, so the test locates and asserts against *its own* list item
 * even if content from a previous (or failed) run is still present.
 */
test.describe('REST example smoke test', () => {
    const title = `E2E REST smoke ${Date.now()}`;

    test.beforeAll(async ({ request }) => {
        await seedRestExampleLibrary(request, 'H5P.Blanks');
    });

    test('logs in, creates Fill in the Blanks content, plays it, and deletes it', async ({
        page
    }) => {
        const app = new RestExampleAppPage(page);
        await app.goto();
        await app.loginAs('Teacher 1');

        await app.createNewContent();
        const item = app.newContentItem();

        await app.chooseContentType(item, 'Fill in the Blanks');
        await app
            .editorFrame(item)
            .locator('.field-name-text .ckeditor')
            .waitFor({ state: 'visible' });

        await app.openMetadata(item);
        await app.setTitle(item, title);
        await app.saveMetadata(item);

        await app.fillRichText(
            item,
            '.field-name-text .ckeditor',
            'Fill in the missing word.'
        );
        await app.fillRichText(
            item,
            '.field.list.importance-high .ckeditor',
            'The capital of Norway is *Oslo*.'
        );

        await app.save(item);

        await app.play(item);
        await expect(app.content(item)).toBeVisible();
        await expect(
            app.playerFrame(item).getByText('The capital of Norway is')
        ).toBeVisible();

        await app.closePlayer(item);
        await app.delete(item);
        await expect(page.getByText(title)).toHaveCount(0);
    });
});
