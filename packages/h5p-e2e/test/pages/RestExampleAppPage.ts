import { FrameLocator, Locator, Page } from '@playwright/test';

/**
 * The `packages/h5p-rest-example-client` single-page app (session 9).
 *
 * Unlike `packages/h5p-examples` (a set of server-rendered pages,
 * `StartPage`/`EditorPage`/`PlayerPage`), this is one React page that never
 * navigates: logging in, creating content, playing it and deleting it are
 * all state changes on the same `App` component. The H5P editor/player
 * themselves are still the same H5P core JS, embedded here via
 * `<h5p-editor>`/`<h5p-player>` custom elements
 * (`@lumieducation/h5p-webcomponents`) instead of the server-rendered pages'
 * outer HTML - `.h5p-editor-iframe` and `.h5p-content` are therefore the
 * same selectors `EditorPage`/`PlayerPage` use, just reached through a
 * different outer DOM.
 *
 * A freshly created item is always prepended to the content list
 * (`ContentListComponent.new()`), so `newContentItem()` can always be
 * `'.list-group-item'` `.first()` right after clicking "Create new
 * content".
 */
export default class RestExampleAppPage {
    public constructor(private readonly page: Page) {}

    public async goto(): Promise<void> {
        await this.page.goto('/');
    }

    /**
     * Logs in via the "Login as" dropdown. The example server's users
     * (`teacher1`, `teacher2`, `student1`, `student2`, `admin`) are matched
     * by their display label, e.g. `'Teacher 1'`.
     */
    public async loginAs(displayLabel: string): Promise<void> {
        await this.page.getByRole('button', { name: 'Login as' }).click();
        await this.page.getByText(displayLabel, { exact: true }).click();
    }

    public async logout(): Promise<void> {
        await this.page.getByRole('button', { name: 'Logout' }).click();
    }

    public async createNewContent(): Promise<void> {
        await this.page
            .getByRole('button', { name: 'Create new content' })
            .click();
    }

    /**
     * The most recently created/selected content's list item, scoping
     * every other locator below so multiple items in the list (e.g. left
     * over from a previous run) don't cause ambiguous matches.
     */
    public newContentItem(): Locator {
        return this.page.locator('.list-group-item').first();
    }

    /**
     * The `<h5p-editor>` custom element's editor iframe, scoped to the
     * given list item.
     */
    public editorFrame(item: Locator): FrameLocator {
        return item.frameLocator('.h5p-editor-iframe');
    }

    public async chooseContentType(
        item: Locator,
        label: string
    ): Promise<void> {
        const tile = this.editorFrame(item)
            .locator('li.h5p-hub-media')
            .filter({ hasText: label });
        await tile.waitFor({ state: 'visible' });
        await tile.click();
    }

    public async fillRichText(
        item: Locator,
        fieldSelector: string,
        text: string
    ): Promise<void> {
        await this.editorFrame(item).locator(fieldSelector).fill(text);
    }

    public async openMetadata(item: Locator): Promise<void> {
        await this.editorFrame(item)
            .locator('.h5p-metadata-button-wrapper')
            .first()
            .click();
        await this.editorFrame(item)
            .locator('.h5p-metadata-popup-overlay')
            .waitFor({ state: 'visible' });
    }

    public async setTitle(item: Locator, title: string): Promise<void> {
        await this.editorFrame(item)
            .locator('.h5p-metadata-popup-overlay .field-name-title input')
            .fill(title);
    }

    public async saveMetadata(item: Locator): Promise<void> {
        const overlay = this.editorFrame(item).locator(
            '.h5p-metadata-popup-overlay'
        );
        await overlay.locator('.h5p-metadata-button.h5p-save').click();
        await overlay.waitFor({ state: 'hidden' });
    }

    /**
     * Clicks the item's "save" button (React state, not a page navigation)
     * and waits for the "play" button to appear - the signal that the item
     * received a real `contentId` back from the server and
     * `ContentListEntryComponent.isNew()` became false.
     */
    public async save(item: Locator): Promise<void> {
        await item.getByRole('button', { name: /save/i }).click();
        await item.getByRole('button', { name: /play/i }).waitFor({
            state: 'visible'
        });
    }

    public async play(item: Locator): Promise<void> {
        await item.getByRole('button', { name: /play/i }).click();
    }

    /**
     * The `<h5p-player>` web component always renders its content inside a
     * real `iframe.h5p-iframe` (`h5p-player.ts`'s `createIframe()`), unlike
     * `packages/h5p-examples`' server-rendered player page, which places
     * `.h5p-content` directly on the outer page and only wraps it in an
     * iframe when actually embedded elsewhere (see `PlayerPage.ts`). So
     * this needs a `frameLocator`, not a plain descendant locator.
     */
    public playerFrame(item: Locator): FrameLocator {
        return item.frameLocator('iframe.h5p-iframe');
    }

    public content(item: Locator): Locator {
        return this.playerFrame(item).locator('.h5p-content');
    }

    public async closePlayer(item: Locator): Promise<void> {
        await item.getByRole('button', { name: /close player/i }).click();
    }

    public async delete(item: Locator): Promise<void> {
        await item.getByRole('button', { name: /delete/i }).click();
    }
}
