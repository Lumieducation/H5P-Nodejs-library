import fsExtra from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';

import exportPackage from './helpers/exportPackage';

describe('e2e test: play content', () => {
    const examplesPath = path.resolve('test/data/hub-content');
    const contentPath = path.resolve('h5p/content');
    const librariesPath = path.resolve('h5p/libraries');

    let browser: puppeteer.Browser;
    let page: puppeteer.Page;

    beforeAll(async () => {
        browser = await puppeteer.launch({});
    });

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        page = await browser.newPage();
    });

    afterEach(async () => {
        await page.close();
    });

    for (const file of fsExtra.readdirSync(examplesPath)) {
        it(`playing ${file}`, async () => {
            const contentId = await exportPackage(
                path.join(examplesPath, file),
                librariesPath,
                contentPath,
                {
                    clearDirs: true
                }
            );

            const errorHandler = jest.fn();
            page.on('pageerror', (error) => {
                // tslint:disable-next-line: no-console
                console.error(`Error when playing ${file}: ${error}`);
                errorHandler();
            });
            await page.goto(`http://localhost:8080/h5p/play/${contentId}`, {
                waitUntil: ['networkidle0', 'load']
            });
            expect(errorHandler).not.toHaveBeenCalled();
        }, 10000);
    }
});
