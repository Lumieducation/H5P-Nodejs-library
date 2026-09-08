import { Locator, Page } from '@playwright/test';

/**
 * The "Installed libraries" React panel embedded on the start page
 * (`#library-admin-container`, rendered by LibraryAdminComponent.tsx).
 *
 * Selectors verified against packages/h5p-examples/src/client/LibraryAdminComponent.tsx.
 */
export default class LibraryAdminPanel {
    public constructor(private readonly page: Page) {
        this.container = page.locator('#library-admin-container');
        this.uploadInput = this.container.locator('#file2');
    }

    public readonly container: Locator;

    /**
     * Hidden `<input type="file">` used for uploading a `.h5p` library
     * package. It has no accessible label, so it must be targeted directly.
     */
    public readonly uploadInput: Locator;

    public async uploadLibrary(filePath: string): Promise<void> {
        await this.uploadInput.setInputFiles(filePath);
    }

    /**
     * The table row for an installed library, identified by its title as
     * shown in the "Title" column (e.g. "Fill in the Blanks (1.14.13)").
     */
    public row(titleSubstring: string): Locator {
        return this.container
            .locator('tbody tr')
            .filter({ hasText: titleSubstring });
    }

    public deleteButton(titleSubstring: string): Locator {
        return this.row(titleSubstring).getByRole('button', {
            name: 'delete'
        });
    }

    public detailsButton(titleSubstring: string): Locator {
        return this.row(titleSubstring).getByRole('button', {
            name: 'details'
        });
    }
}
