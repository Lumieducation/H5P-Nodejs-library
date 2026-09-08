import path from 'path';
import { test, expect } from '@playwright/test';

import EditorPage from '../pages/EditorPage';
import PlayerPage from '../pages/PlayerPage';

// Installing content types via the UI is exercised in the library management
// spec (session 4). For now we install Blanks once per run through the same
// ajax endpoint the "upload" tab in the editor's Hub panel uses, so this spec
// can run deterministically end to end. Session 3 turns this into a shared
// `seedLibraries()` fixture used by every spec.
test.beforeAll(async ({ request }) => {
    await request.post('/h5p/ajax?action=library-upload', {
        multipart: {
            h5p: {
                name: 'H5P.Blanks.h5p',
                mimeType: 'application/octet-stream',
                buffer: await import('fs').then((fs) =>
                    fs.promises.readFile(
                        path.join(
                            __dirname,
                            '../../../../test/data/hub-content/H5P.Blanks.h5p'
                        )
                    )
                )
            }
        }
    });
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
