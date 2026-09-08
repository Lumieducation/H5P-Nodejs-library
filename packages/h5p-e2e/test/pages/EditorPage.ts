import { expect, FrameLocator, Locator, Page } from '@playwright/test';

/**
 * The `/h5p/new` and `/h5p/edit/:contentId` editor pages.
 *
 * The outer document (rendered by h5p-server's renderers/default.ts) hosts
 * the H5P editor client, which replaces `.h5p-editor` with an
 * `iframe.h5p-editor-iframe` (created by h5peditor-editor.js) that all editor
 * widgets render into. The save button (`#save-h5p`), however, lives on the
 * *outer* page, not inside the iframe.
 *
 * Selectors verified against h5p-editor-php-library 1.28.0 (H5P core) and
 * the H5P.Blanks 1.14 content type editor. See ../../SELECTORS.md.
 */
export default class EditorPage {
    public constructor(private readonly page: Page) {
        this.frame = page.frameLocator('.h5p-editor-iframe');
        this.saveButton = page.locator('#save-h5p');
        this.metadataOverlay = this.frame.locator(
            '.h5p-metadata-popup-overlay'
        );
    }

    public readonly frame: FrameLocator;

    public readonly saveButton: Locator;

    private readonly metadataOverlay: Locator;

    public async gotoNew(): Promise<void> {
        await this.page.goto('/h5p/new');
    }

    public async gotoEdit(contentId: string): Promise<void> {
        await this.page.goto(`/h5p/edit/${contentId}`);
    }

    /**
     * Chooses a content type from the H5P Hub tile list. Only works for
     * content types that are already installed (tiles for uninstalled types
     * show a "Get" button and require an install step first).
     */
    public async chooseContentType(label: string): Promise<void> {
        const tile = this.frame
            .locator('li.h5p-hub-media')
            .filter({ hasText: label });
        await tile.waitFor({ state: 'visible' });
        await tile.click();
    }

    /**
     * Waits for the content type's main form to be ready. `fieldSelector`
     * identifies a field unique to that content type's semantics, e.g.
     * `.field-name-text .ckeditor` for H5P.Blanks' task description.
     */
    public async waitForContentForm(fieldSelector: string): Promise<void> {
        await this.frame.locator(fieldSelector).waitFor({ state: 'visible' });
    }

    public async openMetadata(): Promise<void> {
        await this.frame
            .getByRole('button', { name: 'Metadata' })
            .first()
            .click();
        await this.metadataOverlay.waitFor({ state: 'visible' });
    }

    public async setTitle(title: string): Promise<void> {
        await this.metadataOverlay
            .locator('.field-name-title input')
            .fill(title);
    }

    public async setLicense(licenseLabel: string): Promise<void> {
        await this.metadataOverlay
            .locator('.field-name-license select')
            .selectOption({ label: licenseLabel });
    }

    public async saveMetadata(): Promise<void> {
        await this.metadataOverlay
            .locator('.h5p-metadata-button.h5p-save')
            .click();
        await this.metadataOverlay.waitFor({ state: 'hidden' });
    }

    /**
     * Fills a CKEditor-backed rich text field. `fieldSelector` must resolve
     * to the `.ckeditor` contenteditable element itself (not a wrapper).
     * Do not click the element before filling it - CKEditor shows an
     * "important description" helper overlay on click that can cover the
     * element and make it fail Playwright's actionability check.
     */
    public async fillRichText(
        fieldSelector: string,
        text: string
    ): Promise<void> {
        await this.frame.locator(fieldSelector).fill(text);
    }

    /**
     * Clicks the outer page's save button and waits for the redirect to the
     * player, returning the new content id parsed from the `/h5p/play/:id`
     * URL.
     */
    public async save(): Promise<string> {
        await this.saveButton.click();
        await this.page.waitForURL(/\/h5p\/play\/[^/]+$/);
        const match = /\/h5p\/play\/([^/]+)$/.exec(this.page.url());
        expect(match).not.toBeNull();
        return match![1];
    }
}
