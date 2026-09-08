import { test, expect } from '@playwright/test';

test('start page renders', async ({ page }) => {
    await page.goto('/');

    await expect(
        page.getByRole('heading', { name: 'H5P NodeJs Demo' })
    ).toBeVisible();
    await expect(
        page.getByRole('link', { name: 'Create new content' })
    ).toBeVisible();
});
