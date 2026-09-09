import { test, expect, seedLibraries } from '../fixtures';

import EditorPage from '../pages/EditorPage';
import PlayerPage from '../pages/PlayerPage';

test.beforeAll(async ({ request }) => {
    await seedLibraries(request, ['H5P.Blanks']);
});

test.describe('Blanks content creation', () => {
    test('creates, saves and plays a minimal Blanks content', async ({
        page
    }) => {
        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');

        await editor.openMetadata();
        await editor.setTitle('E2E Test Blanks');
        await editor.saveMetadata();

        await editor.fillRichText(
            '.field-name-text .ckeditor',
            'Fill in the blank below.'
        );
        await editor.fillRichText(
            '.field.list.importance-high .ckeditor',
            'The capital of Norway is *Oslo*.'
        );

        const contentId = await editor.save();
        expect(contentId).toBeTruthy();

        const player = new PlayerPage(page);
        await expect(player.content).toBeVisible();
        await expect(page.getByText('The capital of Norway is')).toBeVisible();
    });
});
