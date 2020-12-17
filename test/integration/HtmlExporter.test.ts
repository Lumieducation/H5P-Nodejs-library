import puppeteer from 'puppeteer';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir, withFile } from 'tmp-promise';

import ContentManager from '../../src/ContentManager';
import H5PConfig from '../../src/implementation/H5PConfig';
import FileContentStorage from '../../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../../src/LibraryManager';
import PackageImporter from '../../src/PackageImporter';

import User from '../../examples/User';
import { HtmlExporter } from '../../src/HtmlExporter';

let browser: puppeteer.Browser;
let page: puppeteer.Page;

async function importAndExportHtml(packagePath: string): Promise<void> {
    await withDir(
        async ({ path: tmpDirPath }) => {
            const contentDir = path.join(tmpDirPath, 'content');
            const libraryDir = path.join(tmpDirPath, 'libraries');
            await fsExtra.ensureDir(contentDir);
            await fsExtra.ensureDir(libraryDir);

            const user = new User();
            user.canUpdateAndInstallLibraries = true;

            const contentStorage = new FileContentStorage(contentDir);
            const contentManager = new ContentManager(contentStorage);
            const libraryStorage = new FileLibraryStorage(libraryDir);
            const libraryManager = new LibraryManager(libraryStorage);
            const config = new H5PConfig(null);

            const packageImporter = new PackageImporter(
                libraryManager,
                config,
                contentManager
            );

            const htmlExporter = new HtmlExporter(
                libraryStorage,
                contentStorage,
                config,
                path.resolve('h5p/core'),
                path.resolve('h5p/editor')
            );
            const contentId = (
                await packageImporter.addPackageLibrariesAndContent(
                    packagePath,
                    user
                )
            ).id;
            const exportedHtml = await htmlExporter.createSingleBundle(
                contentId,
                user
            );
            await withFile(
                async (result) => {
                    await fsExtra.writeFile(result.path, exportedHtml);
                    await page.goto(`file://${result.path}`, {
                        waitUntil: ['networkidle0', 'load'],
                        timeout: 30000
                    });
                },
                {
                    keep: false,
                    postfix: '.html'
                }
            );
        },
        { keep: false, unsafeCleanup: true }
    );
}
describe('HtmlExporter', () => {
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
                // response.url().startsWith(serverHost) &&
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

    const directory = `${path.resolve('')}/test/data/hub-content/`;
    let files;
    try {
        files = fsExtra.readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }
    /*
    for (const file of files.filter((f) => f.endsWith('.h5p'))) {
        it(`creates html exports (${file})`, async () => {
            await importAndExportHtml(path.join(directory, file));
        }, 30000);
    }*/
    it(`creates html exports (H5P.BranchingScenario.h5p)`, async () => {
        await importAndExportHtml(
            path.join(directory, 'H5P.BranchingScenario.h5p')
        );
    }, 30000);
});
