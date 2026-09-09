import path from 'path';
import { Page } from '@playwright/test';

import { test, expect, seedLibraries, getStateResetter } from '../fixtures';

import EditorPage from '../pages/EditorPage';
import PlayerPage from '../pages/PlayerPage';
import StartPage from '../pages/StartPage';

/**
 * Reused for every content type's "upload an image" step. Also used by
 * round-trip.spec.ts.
 */
const imagePath = path.join(
    __dirname,
    '../../../../test/data/sample-content/content/earth.jpg'
);

/**
 * One content-type-independent description of everything
 * content-lifecycle.spec.ts needs to do, so the whole content lifecycle
 * (create, edit, delete) runs identically for Blanks and Course
 * Presentation.
 */
interface IContentTypeFixture {
    machineName: string;
    label: string;
    /** A selector unique to the content type's main form, used to know the
     * editor has finished rendering it. */
    waitSelector: string;
    /** Fills in the minimum required fields (beyond title/license/author,
     * which the spec handles generically via the metadata popup). */
    fillMinimalContent(editor: EditorPage): Promise<void>;
    /** Uploads `imagePath` into the content type's own image field. */
    uploadImage(editor: EditorPage): Promise<void>;
    /** Course Presentation only: adds two more subcontent types to the
     * slide, per the manual plan's "with 2 subtypes" note. */
    addSubcontent?(editor: EditorPage): Promise<void>;
    /** Asserts the freshly created content rendered correctly, including the
     * uploaded image and (if present) the subcontent added by
     * `addSubcontent`. */
    assertPlayerRendersCreated(page: Page): Promise<void>;
    /** Makes one visible change to the already-created content. */
    editContent(editor: EditorPage): Promise<void>;
    /** Asserts the change made by `editContent` is visible in the player. */
    assertPlayerRendersEdited(page: Page): Promise<void>;
}

const contentTypes: IContentTypeFixture[] = [
    {
        machineName: 'H5P.Blanks',
        label: 'Fill in the Blanks',
        waitSelector: '.field-name-text .ckeditor',
        async fillMinimalContent(editor) {
            await editor.fillRichText(
                '.field-name-text .ckeditor',
                'Fill in the missing word.'
            );
            await editor.fillRichText(
                '.field.list.importance-high .ckeditor',
                'The capital of Norway is *Oslo*.'
            );
        },
        async uploadImage(editor) {
            await editor.expandGroup('.field-name-media');
            // No explicit "select Image as the media type" step: with only
            // H5P.Blanks (and its own dependencies, which include
            // H5P.Image but not H5P.Video/H5P.Audio) seeded, the `type`
            // library field has exactly one real option besides its "-"
            // placeholder, and the H5P media widget auto-selects it and
            // hides the now-redundant `<select>` entirely. See
            // SELECTORS.md.
            await editor.uploadImage(imagePath, 'Planet Earth');
        },
        async assertPlayerRendersCreated(page) {
            await expect(
                page.getByText('The capital of Norway is')
            ).toBeVisible();
            await expect(
                page.locator('.h5p-content img[alt="Planet Earth"]')
            ).toBeVisible();
        },
        async editContent(editor) {
            await editor.fillRichText(
                '.field.list.importance-high .ckeditor',
                'The capital of Sweden is *Stockholm*.'
            );
        },
        async assertPlayerRendersEdited(page) {
            await expect(
                page.getByText('The capital of Sweden is')
            ).toBeVisible();
        }
    },
    {
        machineName: 'H5P.CoursePresentation',
        label: 'Course Presentation',
        waitSelector: '.h5p-slide',
        async fillMinimalContent(editor) {
            await editor.addSlideElement('advancedtext');
            await editor.fillRichText(
                '.field-name-text .ckeditor',
                'Welcome to the course.'
            );
            await editor.finishElementForm();
        },
        async uploadImage(editor) {
            await editor.addSlideElement('image');
            await editor.uploadImage(imagePath, 'Planet Earth');
            await editor.finishElementForm();
        },
        async addSubcontent(editor) {
            // Per the manual plan's "with 2 subtypes" note: add two more
            // subcontent elements to the slide, beyond the Text element
            // `fillMinimalContent` already placed. True/False Question and
            // a second Text element are used because both have no required
            // fields beyond what a single `fillRichText`/default supplies,
            // keeping this deterministic without having to reverse-engineer
            // every other subtype's validation rules.
            await editor.addSlideElement('truefalse');
            await editor.fillRichText(
                '.field-name-question .ckeditor',
                'Is H5P open source?'
            );
            await editor.finishElementForm();

            await editor.addSlideElement('advancedtext');
            await editor.fillRichText(
                '.field-name-text .ckeditor',
                'This slide has extra subcontent.'
            );
            await editor.finishElementForm();
        },
        async assertPlayerRendersCreated(page) {
            await expect(
                page.getByText('Welcome to the course.')
            ).toBeVisible();
            await expect(
                page.locator('.h5p-content img[alt="Planet Earth"]')
            ).toBeVisible();
            await expect(page.getByText('Is H5P open source?')).toBeVisible();
            await expect(
                page.getByText('This slide has extra subcontent.')
            ).toBeVisible();
        },
        async editContent(editor) {
            // Editing the *last*-added element ("This slide has extra
            // subcontent.", added by `addSubcontent` above), not the first
            // one ("Welcome to the course."): every element added via the
            // dragnbar toolbar defaults to the exact same position and size
            // until manually repositioned, so on a slide with several
            // elements they all visually overlap. The most recently added
            // one is last in the elements array and therefore paints on
            // top, making it the only one `editSlideElement()` can reliably
            // click without another element's overlay intercepting the
            // click first.
            await editor.editSlideElement('This slide has extra subcontent.');
            await editor.fillRichText(
                '.field-name-text .ckeditor',
                'This slide has updated subcontent.'
            );
            await editor.finishElementForm();
        },
        async assertPlayerRendersEdited(page) {
            await expect(
                page.getByText('This slide has updated subcontent.')
            ).toBeVisible();
        }
    }
];

for (const contentType of contentTypes) {
    test.describe(`Content lifecycle: ${contentType.label}`, () => {
        // Each content type's create -> play -> edit -> delete steps build
        // on the content id created in the first test, so they must run in
        // order against the same library installation.
        test.describe.serial(contentType.machineName, () => {
            let contentId: string;
            const title = `E2E ${contentType.label} content`;

            test.beforeAll(async () => {
                await getStateResetter().reset();
            });

            test.beforeAll(async ({ request }) => {
                await seedLibraries(request, [contentType.machineName]);
            });

            test('creates content with metadata, an image and minimal content, then plays it', async ({
                page
            }) => {
                const editor = new EditorPage(page);
                await editor.gotoNew();
                await editor.chooseContentType(contentType.label);
                await editor.waitForContentForm(contentType.waitSelector);

                await editor.openMetadata();
                await editor.setTitle(title);
                await editor.setLicense('Attribution (CC BY)');
                await editor.addAuthor('E2E Test Author');
                await editor.saveMetadata();

                await contentType.uploadImage(editor);
                await contentType.fillMinimalContent(editor);
                if (contentType.addSubcontent) {
                    await contentType.addSubcontent(editor);
                }

                contentId = await editor.save();
                expect(contentId).toBeTruthy();

                const player = new PlayerPage(page);
                await expect(player.content).toBeVisible();
                await contentType.assertPlayerRendersCreated(page);
            });

            test('edits the content and the change persists after saving', async ({
                page
            }) => {
                const editor = new EditorPage(page);
                await editor.gotoEdit(contentId);
                await editor.waitForContentForm(contentType.waitSelector);

                await contentType.editContent(editor);

                const savedContentId = await editor.save();
                expect(savedContentId).toBe(contentId);

                await contentType.assertPlayerRendersEdited(page);

                // Reloading independently (not just trusting the redirect)
                // proves the edit was actually persisted to storage.
                const player = new PlayerPage(page);
                await player.goto(contentId);
                await contentType.assertPlayerRendersEdited(page);
            });

            test('deletes the content and it disappears from the start page and storage', async ({
                page,
                request
            }) => {
                const start = new StartPage(page);
                await start.goto();
                await expect(start.contentRow(title)).toBeVisible();

                await start.deleteLink(title).click();
                await expect(
                    page.getByText('Content successfully deleted.')
                ).toBeVisible();

                await start.goto();
                await expect(start.contentRow(title)).toHaveCount(0);

                const playResponse = await request.get(
                    `/h5p/play/${contentId}`
                );
                // expressRoutes.ts's play route has no not-found branch of
                // its own - h5pPlayer.render() rejects when the content is
                // gone and the route's catch-all turns that into a 500, not
                // a 404. Tracked as
                // https://github.com/Lumieducation/H5P-Nodejs-library/issues/4615 -
                // update this assertion to expect 404 once that's fixed.
                expect(playResponse.status()).toBe(500);
            });
        });
    });
}
