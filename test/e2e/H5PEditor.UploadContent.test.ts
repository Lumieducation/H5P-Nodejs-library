import path from 'path';
import puppeteer from 'puppeteer';
import fsExtra from 'fs-extra';

declare var window;

describe('e2e test: upload content', () => {
    const examplesPath = path.resolve('test/data/hub-content');
    const host = 'http://localhost:8080';

    let browser: puppeteer.Browser;
    let page: puppeteer.Page;
    let errorFunction;
    const resolveEditorFunctions: { [key: string]: () => void } = {};

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
        await page.exposeFunction('oneditorloaded', (key) => {
            resolveEditorFunctions[key]();
            resolveEditorFunctions[key] = undefined;
        });

        page.on('response', async (response) => {
            if (
                response.status() >= 400 &&
                response.status() < 600 &&
                // we ignore requests that result in errors on different servers
                response.url().startsWith(host) &&
                // we ignore requests that result from missing resource files
                // in packages
                !/\/content\/(\d+)\/$/.test(response.url()) &&
                // we ignore missing favicons
                !/favicon\.ico$/.test(response.url())
            ) {
                throw new Error(
                    `Received status code ${response.status()} ${response.statusText()} for ${response
                        .request()
                        .method()} request to ${response.url()}\n${await response.text()}`
                );
            }
        });
    });

    afterAll(async () => {
        await page.close();
        await browser.close();
    });

    for (const file of fsExtra
        .readdirSync(examplesPath)
        // We ignore H5P.Audio as the requests for the OGG file is never
        // resolved in some cases See #553 for more details.
        .filter((f) => f !== 'H5P.Audio.h5p')) {
        it(`uploading and then saving ${file}`, async () => {
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

            await page.goto(`${host}/h5p/new`, {
                waitUntil: ['load', 'networkidle0']
            });

            await page.waitFor('iframe.h5p-editor-iframe');
            const contentFrame = await (
                await page.$('iframe.h5p-editor-iframe')
            ).contentFrame();

            // This code listens for a H5P event to detect when the editor has
            // fully loaded

            const editorLoadedPromise = new Promise((res) => {
                resolveEditorFunctions[file] = res;
            });

            await page.evaluate((browserFile) => {
                window.H5P.externalDispatcher.on('editorloaded', () => {
                    window.oneditorloaded(browserFile);
                });
            }, file);

            await contentFrame.waitForSelector('#upload');
            await contentFrame.click('#upload');
            await contentFrame.waitForSelector(
                ".input-wrapper input[type='file']"
            );
            const uploadHandle = await contentFrame.$(
                ".input-wrapper input[type='file']"
            );
            await uploadHandle.uploadFile(path.join(examplesPath, file));
            await contentFrame.waitForSelector('button.use-button');
            await contentFrame.click('button.use-button');
            if (!(await contentFrame.$('div.h5p-hub-message.info'))) {
                await contentFrame.waitForSelector('div.h5p-hub-message.info', {
                    timeout: 60000 // increased timeout as validation can take
                    // ages
                });
            }

            await editorLoadedPromise;

            await page.waitFor(500);
            await page.waitForSelector('#save-h5p');
            const navPromise = page.waitForNavigation({
                waitUntil: ['load', 'networkidle0'],
                timeout: 30000
            });
            await page.click('#save-h5p');
            await navPromise;

            expect(errorHandler).not.toHaveBeenCalled();
        }, 60000);
    }
});
