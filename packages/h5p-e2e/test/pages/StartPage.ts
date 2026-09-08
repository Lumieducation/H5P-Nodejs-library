import { Locator, Page } from '@playwright/test';

/**
 * The `/` start page: lists existing content and hosts the library
 * administration and content type cache React panels.
 *
 * Selectors verified against packages/h5p-examples/src/startPageRenderer.ts
 * and h5p-server 10.x / h5p-editor-php-library 1.28.0.
 */
export default class StartPage {
    public constructor(private readonly page: Page) {
        this.libraryAdminContainer = page.locator('#library-admin-container');
        this.contentTypeCacheContainer = page.locator(
            '#content-type-cache-container'
        );
    }

    public readonly libraryAdminContainer: Locator;

    public readonly contentTypeCacheContainer: Locator;

    public async goto(): Promise<void> {
        await this.page.goto('/');
    }

    public heading(): Locator {
        return this.page.getByRole('heading', { name: 'H5P NodeJs Demo' });
    }

    public createNewContentLink(): Locator {
        return this.page.getByRole('link', { name: 'Create new content' });
    }

    /**
     * The list-group-item for a piece of content, identified by its title.
     */
    public contentRow(title: string): Locator {
        return this.page
            .locator('.list-group-item')
            .filter({ has: this.page.getByRole('heading', { name: title }) });
    }

    public editLink(title: string): Locator {
        return this.contentRow(title).getByRole('link', { name: 'edit' });
    }

    public downloadLink(title: string): Locator {
        return this.contentRow(title).getByRole('link', { name: 'download' });
    }

    public downloadHtmlLink(title: string): Locator {
        return this.contentRow(title).getByRole('link', {
            name: 'download HTML'
        });
    }

    public deleteLink(title: string): Locator {
        return this.contentRow(title).getByRole('link', { name: 'delete' });
    }
}
