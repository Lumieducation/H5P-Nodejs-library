import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { test, expect } from '@playwright/test';

import { seedLibraries, getStateResetter } from '../fixtures';
import EditorPage from '../pages/EditorPage';

/**
 * Deliberately imports `test`/`expect` from `@playwright/test` directly, not
 * `../fixtures`. That module's `test` fails any spec on an unallowlisted
 * browser console error, and a rejected upload always logs one - but not,
 * as first suspected, via `H5P.error()`: that is only reached from
 * `h5peditor-file-uploader.js`'s `JSON.parse` failure branch, which a
 * well-formed `{success: false, message: ...}` rejection response never
 * hits. What actually fires is Chrome itself logging "Failed to load
 * resource: the server responded with a status of ..." for the upload
 * XHR's own non-2xx response - unavoidable, and unrelated to whether the
 * editor's own error handling is correct. Widening the shared
 * `ALLOWED_CONSOLE_ERRORS` allowlist to cover it would blind every other
 * spec to real upload errors, so this spec instead asserts on the console
 * directly (below) - turning the incidental log into a deliberate
 * assertion that exactly this one, expected message was logged and nothing
 * else.
 */

const imagePath = path.join(
    __dirname,
    '../../../../test/data/sample-content/content/earth.jpg'
);

interface IUploadRejectionCase {
    name: string;
    expectedMessage: string;
    /** Both cases here happen to be 400s - see `contentFileValidation.ts`'s
     * `upload-validation-error` - but the server does not use the same
     * status for every rejection reason (e.g. `not-in-whitelist` is a 500),
     * so this is tracked per case rather than assumed. */
    expectedStatus: number;
    buildFixture(dir: string): Promise<string>;
}

const cases: IUploadRejectionCase[] = [
    {
        name: 'HTML content named .png',
        expectedMessage: "The file you've uploaded is invalid.",
        expectedStatus: 400,
        async buildFixture(dir) {
            const filePath = path.join(dir, 'disguised-html.png');
            await fs.writeFile(
                filePath,
                '<html><body><script>alert(1)</script></body></html>'
            );
            return filePath;
        }
    },
    {
        name: 'SVG content named .png',
        // Sidesteps https://github.com/Lumieducation/H5P-Nodejs-library/issues/4619
        // (prolog-bearing SVGs are rejected while prolog-less ones are
        // accepted) by disguising the file as .png, same as the server-side
        // "invalid file" case above - the point here is the editor's error
        // handling, not SVG validation itself.
        expectedMessage: "The file you've uploaded is invalid.",
        expectedStatus: 400,
        async buildFixture(dir) {
            const filePath = path.join(dir, 'disguised-svg.png');
            await fs.writeFile(
                filePath,
                '<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>'
            );
            return filePath;
        }
    }
];

test.describe('Upload rejections', () => {
    test.beforeAll(async () => {
        await getStateResetter().reset();
    });

    test.beforeAll(async ({ request }) => {
        await seedLibraries(request, ['H5P.Blanks']);
    });

    for (const uploadCase of cases) {
        test(`shows the server's error for ${uploadCase.name} instead of hanging, and recovers`, async ({
            page
        }) => {
            const consoleErrors: string[] = [];
            page.on('console', (message) => {
                if (message.type() === 'error') {
                    consoleErrors.push(message.text());
                }
            });

            const tmpDir = await fs.mkdtemp(
                path.join(os.tmpdir(), 'h5p-upload-rejection-')
            );
            try {
                const fixturePath = await uploadCase.buildFixture(tmpDir);

                const editor = new EditorPage(page);
                await editor.gotoNew();
                await editor.chooseContentType('Fill in the Blanks');
                await editor.waitForContentForm('.field-name-text .ckeditor');
                await editor.expandGroup('.field-name-media');
                await editor.selectLibraryTypeIfVisible(
                    '.field-name-media',
                    'Image'
                );

                await editor.attemptFileUpload(fixturePath);

                // The error names the rejection (proves the message was
                // plumbed through, not replaced by `unknownFileUploadError`)...
                await expect(editor.fileFieldError()).toHaveText(
                    uploadCase.expectedMessage
                );
                // ...and the field recovered instead of hanging on the
                // upload throbber.
                await expect(editor.fileFieldAddLink()).toBeVisible();

                // The failure did not wedge the widget: a subsequent valid
                // upload into the same field still succeeds.
                await editor.uploadImage(imagePath, 'Planet Earth');
                await expect(
                    editor.frame.locator('.field-name-file a.thumbnail')
                ).toBeVisible();

                // The only console error is Chrome's own network-status
                // notice for the upload XHR's non-2xx response (see the
                // module doc comment above) - proves nothing else went
                // wrong along the way. Matched by status code, not the
                // trailing reason phrase (e.g. "Bad Request"), since that
                // phrase depends on the status and this only asserts the
                // code that `expectedStatus` documents per case.
                expect(consoleErrors).toHaveLength(1);
                expect(consoleErrors[0]).toContain(
                    `a status of ${uploadCase.expectedStatus}`
                );
                expect(consoleErrors[0]).toContain('Failed to load resource');
            } finally {
                await fs.rm(tmpDir, { recursive: true, force: true });
            }
        });
    }
});
