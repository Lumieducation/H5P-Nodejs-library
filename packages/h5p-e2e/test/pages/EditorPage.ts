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

    /**
     * Adds an author entry via the metadata popup's author widget
     * (`.h5p-metadata-author-widget`, not a generic list widget - it has its
     * own name input, role select and "Save author" button). The role
     * defaults to "Author" and is left as-is.
     */
    public async addAuthor(name: string): Promise<void> {
        const authorWidget = this.metadataOverlay.locator(
            '.h5p-metadata-author-widget'
        );
        await authorWidget.locator('.field-name-name input').fill(name);
        await authorWidget.locator('.h5p-save-author').click();
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

    /**
     * Expands a collapsed group field (e.g. Blanks' "Media" group), which
     * renders as a `<fieldset class="field ... field-name-<x>">` whose
     * `> .title` element toggles the `expanded` class via a click handler
     * (`role="button"` but not a real `<button>`).
     */
    public async expandGroup(groupSelector: string): Promise<void> {
        await this.frame.locator(`${groupSelector} > .title`).click();
    }

    /**
     * Selects an option in a "library" field's type `<select>` (e.g.
     * Blanks' `media.type` field, which offers Image/Video/Audio). Scoped
     * with a direct-child chain (`> .content > .field.library`) rather than
     * a bare descendant `select` - once a type like Image is chosen, that
     * type's own widget (e.g. its copyright dialog) can render further
     * `<select>` elements (License/License Version) nested much deeper
     * inside the same group, and a bare descendant selector would match
     * those too. See SELECTORS.md.
     */
    public async selectLibraryType(
        groupSelector: string,
        optionLabel: string
    ): Promise<void> {
        await this.frame
            .locator(`${groupSelector} > .content > .field.library > select`)
            .selectOption({ label: optionLabel });
    }

    /**
     * Uploads an image into the (single, currently visible) `image` widget
     * field and fills its required alternative text. Both Blanks' Media
     * group and Course Presentation's per-element image form render the
     * same `.field-name-file` structure with an "Add" link that lazily
     * creates the actual `<input type="file">` - see SELECTORS.md. Only one
     * such field is ever visible at a time in either flow, so this needs no
     * further scoping.
     */
    public async uploadImage(
        imagePath: string,
        altText: string
    ): Promise<void> {
        await this.frame.locator('.field-name-file .file a.add').click();
        await this.frame
            .locator('input[type="file"][accept*="image"]')
            .setInputFiles(imagePath);
        await this.frame.locator('.field-name-alt input').fill(altText);
    }

    /**
     * Clicks a Course Presentation slide toolbar button
     * (`.h5p-dragnbar-a.h5p-dragnbar-<type>-button`) to add a new element to
     * the current slide. Most element types immediately open their own
     * sub-form (a "form manager" wizard, breadcrumbed under "Course
     * Presentation") rather than dropping a default onto the canvas -
     * `finishElementForm()` returns to the canvas once it is filled in.
     */
    public async addSlideElement(buttonTypeClass: string): Promise<void> {
        await this.frame
            .locator(`.h5p-dragnbar-a.h5p-dragnbar-${buttonTypeClass}-button`)
            .click();
    }

    /**
     * Clicks "Done" on a Course Presentation element's sub-form, returning
     * to the slide canvas. Also used to close the sub-form opened by
     * `editSlideElement()`.
     *
     * The element placed/edited stays selected afterwards, with its
     * floating `.h5p-dragnbar-context-menu` still positioned over it. That
     * menu (and, further back, this element's own selection outline) can
     * then intercept clicks meant for the slide toolbar, so this presses
     * Escape to deselect before returning - do this even if the next step
     * looks unrelated to the element just placed.
     */
    public async finishElementForm(): Promise<void> {
        await this.frame.getByRole('button', { name: 'Done' }).first().click();
        await this.page.keyboard.press('Escape');
    }

    /**
     * Selects an already-placed slide element (identified by its visible
     * text) and opens its edit sub-form via the "Edit" button in the
     * context menu that appears once an element is selected
     * (`.h5p-dragnbar-context-menu-button.edit`, `aria-label="Edit"`).
     *
     * Every `.h5p-element` has a `.h5p-element-overlay` sibling that is
     * stacked on top of its actual content for drag/resize handling - it,
     * not the text itself, is the real click target; clicking the text
     * directly gets blocked by that overlay intercepting pointer events.
     *
     * **Caveat for slides with more than one element:** every element
     * added via the dragnbar toolbar defaults to the exact same
     * position/size (`left: 30%; top: 30%; width: 40%; height: 40%`) until
     * manually repositioned, so their overlays fully overlap and later
     * (later in the elements array, later in DOM order) ones paint over
     * earlier ones. This method can therefore only reliably select the
     * *last*-added element on such a slide - real clicks resolve to
     * whichever element the browser's own hit-testing puts on top,
     * regardless of which one Playwright's locator matched, and `{ force:
     * true }` would not change that. Callers needing to edit an earlier
     * element would first have to reposition the ones on top of it via the
     * "Transform" panel (`.h5p-dragnbar-context-menu-button.transform`),
     * which no spec needs yet.
     */
    public async editSlideElement(elementText: string): Promise<void> {
        const element = this.frame
            .locator('.h5p-slide')
            .first()
            .locator('.h5p-element')
            .filter({ hasText: elementText });
        await element.locator('.h5p-element-overlay').click();
        await this.frame
            .getByRole('button', { name: 'Edit', exact: true })
            .click();
    }

    /**
     * Clicks the top-level "Copy" button (copies the entire content to the
     * H5P editor's clipboard, distinct from the per-widget copy/paste
     * buttons some fields also have, which stay disabled until that
     * specific field has content).
     */
    public async copyContent(): Promise<void> {
        await this.frame
            .locator('.h5peditor-copy-button:not(.disabled)')
            .click();
    }

    /**
     * Clicks the top-level "Paste & Replace" button and confirms the
     * resulting "Replace Content" dialog. Only enabled once `copyContent()`
     * has been used earlier in the same browser (the clipboard is
     * browser-local, not server-side).
     */
    public async pasteContent(): Promise<void> {
        await this.frame
            .locator(
                '.h5peditor-paste-button[title="Replace existing content with H5P Content from the clipboard"]'
            )
            .click();
        await this.frame
            .getByRole('button', { name: 'Replace content' })
            .click();
    }

    /**
     * Switches the H5P Hub's content type picker to its "Upload" tab, where
     * a `.h5p` package can be imported instead of picking a content type.
     */
    public async switchToUploadTab(): Promise<void> {
        await this.frame.getByText('Upload', { exact: true }).click();
    }

    /**
     * Picks a local `.h5p` file on the Hub's upload tab and confirms it via
     * the "Use" button, which parses the package and swaps in its content
     * type's editor form pre-filled with the package's `content.json`.
     */
    public async uploadH5pPackage(filePath: string): Promise<void> {
        await this.frame
            .locator('.h5p-hub-input-wrapper input[type="file"]')
            .setInputFiles(filePath);
        await this.frame.getByRole('button', { name: 'Use' }).click();
    }
}
