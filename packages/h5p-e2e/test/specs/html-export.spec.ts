import fs from 'fs/promises';
import os from 'os';
import path from 'path';

import {
    test,
    expect,
    seedLibraries,
    getStateResetter,
    readVendoredLibraryVersion
} from '../fixtures';

import StartPage from '../pages/StartPage';

const title = 'HTML Export Round Trip';

/**
 * Seeds one piece of H5P.Blanks content by calling the same JSON endpoint
 * the editor's own "Create" button submits to
 * (`POST /h5p/new` -> `expressRoutes.ts` -> `H5PEditor.saveOrUpdateContent`),
 * rather than driving the editor's CKEditor-based rich text fields through
 * the browser. This spec's actual subject is the downloaded HTML export
 * rendering correctly across browser engines, not the editor UI itself
 * (already covered elsewhere, e.g. content-lifecycle.spec.ts, on Chromium);
 * driving the editor here would make this cross-browser project fail for
 * unrelated reasons - `.fill()` on the "Text blocks" CKEditor field does
 * not reliably commit its value under Mobile Safari's touch emulation.
 *
 * The main library's major/minor version is read from the vendored
 * `H5P.Blanks.h5p` package itself (`readVendoredLibraryVersion()`) rather
 * than hard-coded, so this stays correct if the vendored fixture is ever
 * refreshed to a newer H5P.Blanks release.
 *
 * @returns the new content's id
 */
async function seedBlanksContent(
    request: import('@playwright/test').APIRequestContext,
    contentTitle: string,
    sentence: string
): Promise<string> {
    const { major, minor } = await readVendoredLibraryVersion('H5P.Blanks');
    const response = await request.post('/h5p/new', {
        data: {
            params: {
                params: {
                    media: {},
                    text: 'Fill in the missing word.',
                    questions: [sentence]
                },
                metadata: {
                    embedTypes: ['div'],
                    language: 'und',
                    license: 'U',
                    mainLibrary: 'H5P.Blanks',
                    preloadedDependencies: [
                        {
                            machineName: 'H5P.Blanks',
                            majorVersion: major,
                            minorVersion: minor
                        }
                    ],
                    title: contentTitle,
                    defaultLanguage: 'en'
                }
            },
            library: `H5P.Blanks ${major}.${minor}`
        }
    });
    if (!response.ok()) {
        throw new Error(
            `Failed to seed Blanks content: ${response.status()} ${await response.text()}`
        );
    }
    const { contentId } = await response.json();
    return contentId;
}

/**
 * Console/page errors that are expected and harmless specifically when
 * loading an H5P HTML export via a `file://` URL (not part of the shared,
 * intentionally-short allowlist in `fixtures/index.ts`, since this noise is
 * unique to the `file://` loading path this spec exercises and would be too
 * broad an exemption to grant every other spec).
 *
 * H5P core always tries an XHR (e.g. to check for/save content user state)
 * on load; under `file://` the browser has no origin to make that request
 * from, so it always fails with a CORS error. This is an inherent property
 * of opening an HTML export directly from disk, not a bug in the export
 * itself - the manual test plan's "open the exported HTML file" step has
 * the exact same limitation.
 */
const ALLOWED_FILE_URL_ERRORS: RegExp[] = [
    // Chromium
    /Access to XMLHttpRequest.*has been blocked by CORS policy/,
    /net::ERR_FAILED/,
    // Firefox: two separate console messages for the same failed request -
    // one naming the restriction, one naming the URL it applies to.
    /Cross origin requests are only supported for/,
    /due to access control checks/,
    // Firefox also logs a spurious "XML Parsing Error" for the same
    // file:// document, independent of whether it actually renders as
    // HTML (it does - the page content assertions below run first and
    // pass) - this looks like an internal feed/XML-sniffing pass Firefox
    // runs over local files, not a real parsing failure of the export.
    /XML Parsing Error/,
    // WebKit
    /Cross-Origin Request Blocked/,
    /Not allowed to request resource/
];

test.beforeAll(async () => {
    await getStateResetter().reset();
});

test.beforeAll(async ({ request }) => {
    await seedLibraries(request, ['H5P.Blanks']);
});

test('downloaded HTML export renders standalone from a file:// URL with a clean console', async ({
    page,
    request
}) => {
    await seedBlanksContent(
        request,
        title,
        'The capital of Finland is *Helsinki*.'
    );

    const start = new StartPage(page);
    await start.goto();
    const [download] = await Promise.all([
        page.waitForEvent('download'),
        start.downloadHtmlLink(title).click()
    ]);
    const downloadedPath = path.join(
        os.tmpdir(),
        `h5p-e2e-html-export-${Date.now()}.html`
    );
    await download.saveAs(downloadedPath);

    // A separate page, deliberately not the fixture's console-guarded
    // `page` - the file:// CORS noise above is expected only on this one
    // navigation and would be too broad an exemption to add to the shared
    // allowlist every other spec's `page` fixture also uses.
    const filePage = await page.context().newPage();
    const unexpectedErrors: string[] = [];
    filePage.on('console', (message) => {
        if (
            message.type() === 'error' &&
            !ALLOWED_FILE_URL_ERRORS.some((allowed) =>
                allowed.test(message.text())
            )
        ) {
            unexpectedErrors.push(message.text());
        }
    });
    filePage.on('pageerror', (error) => {
        if (
            !ALLOWED_FILE_URL_ERRORS.some((allowed) =>
                allowed.test(error.message)
            )
        ) {
            unexpectedErrors.push(error.message);
        }
    });

    try {
        await filePage.goto(`file://${downloadedPath}`);
        await expect(filePage.locator('.h5p-content')).toBeVisible();
        await expect(
            filePage.getByText('The capital of Finland is')
        ).toBeVisible();

        expect(
            unexpectedErrors,
            `HTML export triggered unexpected browser console error(s):\n${unexpectedErrors.join('\n')}`
        ).toEqual([]);
    } finally {
        await filePage.close();
        await fs.rm(downloadedPath, { force: true });
    }
});
