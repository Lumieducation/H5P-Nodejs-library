import { Locator, Page } from '@playwright/test';

/**
 * The "H5P Hub content type list" React panel embedded on the start page
 * (`#content-type-cache-container`, rendered by ContentTypeCacheComponent.tsx).
 *
 * Note: as of this writing the panel has no download/export button for the
 * cache file - it only shows the last update time and an "Update now"
 * button.
 *
 * Selectors verified against packages/h5p-examples/src/client/ContentTypeCacheComponent.tsx.
 */
export default class ContentTypeCachePanel {
    public constructor(private readonly page: Page) {
        this.container = page.locator('#content-type-cache-container');
        this.updateNowButton = this.container.getByRole('button', {
            name: 'Update now'
        });
    }

    public readonly container: Locator;

    public readonly updateNowButton: Locator;

    public lastUpdateText(): Locator {
        return this.container.getByText('Last update:');
    }
}
