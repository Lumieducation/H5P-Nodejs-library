//eslint-disable-next-line import/no-extraneous-dependencies
import puppeteer from 'puppeteer';

// On 4th Oct 2020, the Puppeteer types didn't include waitForTimeout, so we
// added it manually. Can be removed when
// https://github.com/DefinitelyTyped/DefinitelyTyped/pull/48129 is merged
declare module 'puppeteer' {
    export interface Page {
        waitForTimeout(duration: number): Promise<void>;
    }
}

declare const window;

let serverHost;
let browser: puppeteer.Browser;
let page: puppeteer.Page;
let resolveEditorFunctions: { [key: string]: () => void } = {};

export async function beforeAll(host: string): Promise<void> {
    serverHost = host;
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

    // the function onEditorLoaded is called in the browser when the H5P
    // editor has finished loading. To be able to wait for this event, we
    // collect the resolve function of the promises in the
    // resolveEditorFunctions object.
    await page.exposeFunction('onEditorLoaded', (key) => {
        resolveEditorFunctions[key]();
        resolveEditorFunctions[key] = undefined;
    });

    // Tests should fail when there is an error on the page
    page.on('pageerror', (error) => {
        throw new Error(`There was in error in the page: ${error.message}`);
    });

    // Tests should fail when there is a failed request to our server
    page.on('response', async (response) => {
        if (
            response.status() >= 400 &&
            response.status() < 600 &&
            // we ignore requests that result in errors on different servers
            response.url().startsWith(serverHost) &&
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
}

export async function afterAll(): Promise<void> {
    await page.close();
    await browser.close();
    resolveEditorFunctions = {};
}

export async function uploadSave(file: string): Promise<void> {
    await page.goto(`${serverHost}/h5p/new`, {
        waitUntil: ['load', 'networkidle0']
    });
    // The editor is displayed within an iframe, so we must get it
    await page.waitForSelector('iframe.h5p-editor-iframe');
    const contentFrame = await (
        await page.$('iframe.h5p-editor-iframe')
    ).contentFrame();

    // This code listens for a H5P event to detect when the editor has
    // fully loaded. Later, the test waits for editorLoadedPromise to
    // resolve.
    const editorLoadedPromise = new Promise<void>((res) => {
        resolveEditorFunctions[file] = res;
    });

    // Inject the code to catch the editorloaded event.
    await page.evaluate((browserFile) => {
        window.H5P.externalDispatcher.on('editorloaded', () => {
            window.onEditorLoaded(browserFile);
        });
    }, file);
    await contentFrame.waitForSelector('#upload');
    await contentFrame.focus('#upload');
    await contentFrame.click('#upload');
    await contentFrame.waitForSelector(".input-wrapper input[type='file']");
    const uploadHandle = await contentFrame.$(
        ".input-wrapper input[type='file']"
    );
    await uploadHandle.uploadFile(file);
    await contentFrame.waitForSelector('button.use-button');
    await contentFrame.focus('button.use-button');
    await contentFrame.click('button.use-button');

    // Wait until the file was validated.
    if (!(await contentFrame.$('div.h5p-hub-message.info'))) {
        await contentFrame.waitForSelector('div.h5p-hub-message.info', {
            timeout: 60000 // increased timeout as validation can take
            // ages
        });
    }
    // editorLoadedPromise resolves when the H5P editor signals that it
    // was fully loaded
    await editorLoadedPromise;

    // some content type editors still to some things after the
    // editorloaded event was sent, so we wait for an arbitrary time
    await page.waitForTimeout(500);

    // Press save and wait until the player has loaded
    await page.waitForSelector('#save-h5p');
    const navPromise = page.waitForNavigation({
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000
    });
    await page.focus('#save-h5p');
    await page.click('#save-h5p');
    await navPromise;
}
