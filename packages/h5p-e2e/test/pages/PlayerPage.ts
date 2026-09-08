import { Locator, Page } from '@playwright/test';

/**
 * The `/h5p/play/:contentId` player page.
 *
 * Unlike the editor, the player does NOT create a nested iframe when loaded
 * as a top-level page: content renders directly into `.h5p-content`. (H5P
 * core only wraps content in an iframe when it is embedded via
 * `iframe.h5p-iframe` on a third-party page, e.g. through h5p-embed.js - not
 * the case here.)
 *
 * The action bar always shows a "Reuse" button and a link to h5p.org.
 * Copyright/Embed/Download buttons are conditional on the render options
 * passed to `h5pPlayer.render()` (see expressRoutes.ts) and on the content's
 * metadata/export URL being present.
 *
 * Selectors verified against h5p-php-library (H5P core) 1.28.0.
 */
export default class PlayerPage {
    public constructor(private readonly page: Page) {
        this.content = page.locator('.h5p-content');
        this.reuseButton = page.getByRole('button', { name: 'Reuse' });
    }

    public readonly content: Locator;

    public readonly reuseButton: Locator;

    public async goto(contentId: string): Promise<void> {
        await this.page.goto(`/h5p/play/${contentId}`);
    }
}
