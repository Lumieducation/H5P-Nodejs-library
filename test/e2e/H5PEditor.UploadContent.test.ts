import path from 'path';
import puppeteer from 'puppeteer';

declare var window;

describe('e2e test: upload content', () => {
    const examplesPath = path.resolve('test/data/hub-content');

    let browser: puppeteer.Browser;
    let page: puppeteer.Page;
    let errorFunction;

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--headless',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            ignoreDefaultArgs: ['--mute-audio']
        });
        page = await browser.newPage();
        await page.setCacheEnabled(true);
        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36'
        );
    });

    afterAll(async () => {
        await page.close();
        await browser.close();
    });

    it(`uploading and then saving file`, async () => {
        if (errorFunction) {
            page.removeListener('pageerror', errorFunction);
        }
        const errorHandler = jest.fn();
        errorFunction = (error) => {
            // tslint:disable-next-line: no-console
            console.error(`Error when playing file: ${error}`);
            errorHandler();
        };
        page.on('pageerror', errorFunction);

        await page.goto('http://localhost:8080/h5p/new', {
            waitUntil: ['load', 'networkidle0']
        });

        await page.waitFor('iframe.h5p-editor-iframe');
        const contentFrame = await (
            await page.$('iframe.h5p-editor-iframe')
        ).contentFrame();

        // This code listens for a H5P event to detect when the editor has
        // fully loaded
        let resolve;
        const editorLoadedEvent = new Promise((res) => {
            resolve = res;
        });
        await page.exposeFunction('oneditorloaded', () => {
            resolve();
        });

        await page.evaluate(() => {
            window.H5P.externalDispatcher.on('editorloaded', () => {
                window.oneditorloaded();
            });
        });

        await contentFrame.waitForSelector('#upload');
        await contentFrame.click('#upload');
        await contentFrame.waitForSelector(".input-wrapper input[type='file']");
        const uploadHandle = await contentFrame.$(
            ".input-wrapper input[type='file']"
        );
        await uploadHandle.uploadFile(
            path.resolve('test/data/hub-content/H5P.CoursePresentation.h5p')
        );
        await contentFrame.waitForSelector('button.use-button');
        await contentFrame.click('button.use-button');
        await contentFrame.waitForSelector('div.h5p-hub-message.info');

        await editorLoadedEvent;

        expect(errorHandler).not.toHaveBeenCalled();
    });
});
