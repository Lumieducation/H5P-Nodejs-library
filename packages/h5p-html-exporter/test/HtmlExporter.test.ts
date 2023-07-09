import puppeteer from 'puppeteer';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir, withFile } from 'tmp-promise';
import promisePipe from 'promisepipe';

import ContentManager from '../../h5p-server/src/ContentManager';
import ContentStorer from '../../h5p-server/src/ContentStorer';
import FileContentStorage from '../../h5p-server/src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../../h5p-server/src/implementation/fs/FileLibraryStorage';
import H5PConfig from '../../h5p-server/src/implementation/H5PConfig';
import LibraryManager from '../../h5p-server/src/LibraryManager';
import PackageImporter from '../../h5p-server/src/PackageImporter';
import HtmlExporter from '../src/HtmlExporter';
import { IIntegration } from '../../h5p-server/src/types';
import { LaissezFairePermissionSystem } from '../../h5p-server';

import User from './User';

let browser: puppeteer.Browser;
let page: puppeteer.Page;

async function importAndExportHtml(
    packagePath: string,
    mode: 'singleBundle' | 'externalContentResources'
): Promise<void> {
    await withDir(
        async ({ path: tmpDirPath }) => {
            const contentDir = path.join(tmpDirPath, 'content');
            const libraryDir = path.join(tmpDirPath, 'libraries');
            await fsExtra.ensureDir(contentDir);
            await fsExtra.ensureDir(libraryDir);

            const user = new User();

            const contentStorage = new FileContentStorage(contentDir);
            const contentManager = new ContentManager(
                contentStorage,
                new LaissezFairePermissionSystem()
            );
            const libraryStorage = new FileLibraryStorage(libraryDir);
            const libraryManager = new LibraryManager(libraryStorage);
            const config = new H5PConfig(null);

            const packageImporter = new PackageImporter(
                libraryManager,
                config,
                new LaissezFairePermissionSystem(),
                contentManager,
                new ContentStorer(contentManager, libraryManager, undefined)
            );

            const htmlExporter = new HtmlExporter(
                libraryStorage,
                contentStorage,
                config,
                path.resolve(`${__dirname}/../../h5p-examples/h5p/core`),
                path.resolve(`${__dirname}/../../h5p-examples/h5p/editor`)
            );
            const contentId = (
                await packageImporter.addPackageLibrariesAndContent(
                    packagePath,
                    user
                )
            ).id;
            if (mode === 'singleBundle') {
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
            } else if (mode === 'externalContentResources') {
                const res =
                    await htmlExporter.createBundleWithExternalContentResources(
                        contentId,
                        user,
                        contentId.toString()
                    );
                await withDir(
                    async (result) => {
                        await fsExtra.mkdirp(result.path);
                        await fsExtra.writeFile(
                            path.join(result.path, `${contentId}.html`),
                            res.html
                        );
                        for (const f of res.contentFiles) {
                            try {
                                const tempFilePath = path.join(
                                    result.path,
                                    contentId.toString(),
                                    f
                                );
                                await fsExtra.mkdirp(
                                    path.dirname(tempFilePath)
                                );
                                const writer =
                                    fsExtra.createWriteStream(tempFilePath);
                                const readable =
                                    await contentStorage.getFileStream(
                                        contentId,
                                        f,
                                        user
                                    );
                                await promisePipe(readable, writer);
                                writer.close();
                            } catch {
                                // We silently ignore errors here as there is
                                // some example content with invalid file
                                // references.
                            }
                        }
                        await page.goto(
                            `file://${result.path}/${contentId}.html`,
                            {
                                waitUntil: ['networkidle0', 'load'],
                                timeout: 30000
                            }
                        );
                    },
                    {
                        keep: false,
                        unsafeCleanup: true
                    }
                );
            }
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

    const directory = path.resolve(
        `${__dirname}/../../../test/data/hub-content/`
    );
    let files;
    try {
        files = fsExtra.readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }

    for (const file of files.filter((f) => f.endsWith('.h5p'))) {
        it(`creates html exports (${file})`, async () => {
            await importAndExportHtml(
                path.join(directory, file),
                'singleBundle'
            );
        }, 60000);
    }
    it(`creates html exports (H5P.Dialogcards.h5p)`, async () => {
        await importAndExportHtml(
            path.join(directory, 'H5P.Dialogcards.h5p'),
            'externalContentResources'
        );
    }, 60000);
});

describe('HtmlExporter template', () => {
    it('uses the optional template', async () => {
        const tmpDirPath = path.join(__dirname, 'data');
        const contentDir = path.join(tmpDirPath, 'content');
        const libraryDir = path.join(tmpDirPath, 'libraries');
        await fsExtra.ensureDir(contentDir);
        await fsExtra.ensureDir(libraryDir);

        const user = new User();

        const contentStorage = new FileContentStorage(contentDir);
        const contentManager = new ContentManager(
            contentStorage,
            new LaissezFairePermissionSystem()
        );
        const libraryStorage = new FileLibraryStorage(libraryDir);
        const libraryManager = new LibraryManager(libraryStorage);
        const config = new H5PConfig(null);

        const packageImporter = new PackageImporter(
            libraryManager,
            config,
            new LaissezFairePermissionSystem(),
            contentManager,
            new ContentStorer(contentManager, libraryManager, undefined)
        );

        const contentId = (
            await packageImporter.addPackageLibrariesAndContent(
                path.resolve(
                    `${__dirname}/../../../test/data/hub-content/H5P.Accordion.h5p`
                ),
                user
            )
        ).id;

        const htmlExporter = new HtmlExporter(
            libraryStorage,
            contentStorage,
            config,
            path.resolve(`${__dirname}/../../h5p-examples/h5p/core`),
            path.resolve(`${__dirname}/../../h5p-examples/h5p/editor`),
            (
                integration: IIntegration,
                scriptsBundle: string,
                stylesBundle: string,
                contentId2: string
            ) => `${contentId2}`
        );

        const exportedHtml = await htmlExporter.createSingleBundle(
            contentId,
            user
        );

        expect(exportedHtml).toBe(`${contentId}`);
    });
});
