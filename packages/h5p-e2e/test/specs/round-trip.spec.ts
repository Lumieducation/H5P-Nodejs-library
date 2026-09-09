import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import yauzl from 'yauzl-promise';

import { test, expect, seedLibraries, getStateResetter } from '../fixtures';

import EditorPage from '../pages/EditorPage';
import PlayerPage from '../pages/PlayerPage';
import StartPage from '../pages/StartPage';

/**
 * Reads every entry of a zip file into a `{ path: content }` map, decoding
 * `.json` entries as UTF-8 text and leaving everything else as a `Buffer`.
 * Used to make structural assertions about a downloaded `.h5p` package
 * without ever shelling out to `unzip`.
 */
async function readZipEntries(filePath: string): Promise<Map<string, Buffer>> {
    const entries = new Map<string, Buffer>();
    const zip = await yauzl.open(filePath);
    try {
        for await (const entry of zip) {
            if (entry.filename.endsWith('/')) {
                continue;
            }
            const readable = await entry.openReadStream();
            const chunks: Buffer[] = [];
            for await (const chunk of readable) {
                chunks.push(chunk as Buffer);
            }
            entries.set(entry.filename, Buffer.concat(chunks));
        }
    } finally {
        await zip.close();
    }
    return entries;
}

test.beforeAll(async () => {
    await getStateResetter().reset();
});

test.beforeAll(async ({ request }) => {
    await seedLibraries(request, ['H5P.Blanks']);
});

const imagePath = path.join(
    __dirname,
    '../../../../test/data/sample-content/content/earth.jpg'
);

test.describe('Round trip: copy & paste', () => {
    test('copying content and pasting it into new content produces an equivalent result', async ({
        page
    }) => {
        const editor = new EditorPage(page);

        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');

        await editor.openMetadata();
        await editor.setTitle('Copy Paste Source');
        await editor.saveMetadata();
        await editor.fillRichText(
            '.field.list.importance-high .ckeditor',
            'The capital of Norway is *Oslo*.'
        );

        // Include an image in the copied content, not just text: the H5P
        // clipboard payload embeds media as base64
        // (`H5P.ClipboardItem`/`H5P.setClipboard`), a completely different
        // code path from the plain-text field content above, so a
        // text-only source content would not catch a paste that silently
        // dropped the image.
        await editor.expandGroup('.field-name-media');
        await editor.uploadImage(imagePath, 'Planet Earth');

        await editor.copyContent();

        // A fresh "new content" page, same content type, to paste into. Not
        // asserting on the plain "task description" field anywhere in this
        // test: the H5P editor has its own autosave/draft-restore feature
        // that persists unsaved form state in localStorage across "new
        // content" page loads, which could make that field pass even
        // without a working paste - see SELECTORS.md's "whole-content
        // copy/paste" note. Title and the "Text blocks" list field are not
        // subject to that autosave quirk, so they are what this test
        // checks.
        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');

        await editor.pasteContent();

        await expect(
            page
                .frameLocator('.h5p-editor-iframe')
                .locator('.field.list.importance-high .ckeditor')
        ).toHaveText('The capital of Norway is *Oslo*.');

        // The pasted image widget re-renders collapsed, like any other
        // "Media" group field - expand it again to check the alt text
        // survived the clipboard round trip. This is a lighter-weight
        // signal than the file's actual bytes, but (unlike the text
        // fields above) it is not subject to the autosave/draft-restore
        // quirk noted below, since no earlier "new content" page load ever
        // had an image in this field.
        await editor.expandGroup('.field-name-media');
        await expect(
            page
                .frameLocator('.h5p-editor-iframe')
                .locator('.field-name-alt input')
        ).toHaveValue('Planet Earth');

        const contentId = await editor.save();

        const player = new PlayerPage(page);
        await expect(player.content).toBeVisible();
        await expect(page.getByText('The capital of Norway is')).toBeVisible();
        await expect(
            page.locator('.h5p-content img[alt="Planet Earth"]')
        ).toBeVisible();

        await editor.gotoEdit(contentId);
        await editor.waitForContentForm('.field-name-text .ckeditor');
        await editor.openMetadata();
        await expect(
            page
                .frameLocator('.h5p-editor-iframe')
                .locator('.h5p-metadata-popup-overlay .field-name-title input')
        ).toHaveValue('Copy Paste Source');
    });
});

test.describe('Round trip: download and re-upload', () => {
    test('downloading a .h5p and re-uploading it produces a structurally equivalent, re-playable content', async ({
        page,
        request
    }) => {
        const title = 'Download Round Trip';
        const sentence = 'The capital of Sweden is *Stockholm*.';

        const editor = new EditorPage(page);
        await editor.gotoNew();
        await editor.chooseContentType('Fill in the Blanks');
        await editor.waitForContentForm('.field-name-text .ckeditor');
        await editor.openMetadata();
        await editor.setTitle(title);
        await editor.saveMetadata();
        await editor.fillRichText(
            '.field.list.importance-high .ckeditor',
            sentence
        );
        const originalContentId = await editor.save();

        const start = new StartPage(page);
        await start.goto();
        const [download] = await Promise.all([
            page.waitForEvent('download'),
            start.downloadLink(title).click()
        ]);
        const downloadedPath = path.join(
            os.tmpdir(),
            `h5p-e2e-round-trip-${originalContentId}.h5p`
        );
        await download.saveAs(downloadedPath);

        // Structural check: unzip in Node rather than trusting the UI - a
        // much stronger assertion than "something downloaded".
        const entries = await readZipEntries(downloadedPath);
        expect(entries.has('h5p.json')).toBe(true);
        expect(entries.has('content/content.json')).toBe(true);
        const h5pJson = JSON.parse(entries.get('h5p.json')!.toString('utf-8'));
        expect(h5pJson.mainLibrary).toBe('H5P.Blanks');
        const contentJson = JSON.parse(
            entries.get('content/content.json')!.toString('utf-8')
        );
        expect(JSON.stringify(contentJson)).toContain('Stockholm');

        // Re-upload through the editor's Hub "Upload" tab and save as a
        // brand new piece of content.
        await editor.gotoNew();
        await editor.switchToUploadTab();
        await editor.uploadH5pPackage(downloadedPath);
        await editor.waitForContentForm('.field-name-text .ckeditor');

        const reuploadedContentId = await editor.save();
        expect(reuploadedContentId).not.toBe(originalContentId);

        const player = new PlayerPage(page);
        await expect(player.content).toBeVisible();
        await expect(page.getByText('The capital of Sweden is')).toBeVisible();

        await fs.rm(downloadedPath, { force: true });

        // Both the original and the re-uploaded copy should still be
        // playable from storage independently.
        const originalResponse = await request.get(
            `/h5p/play/${originalContentId}`
        );
        expect(originalResponse.ok()).toBe(true);
    });
});
