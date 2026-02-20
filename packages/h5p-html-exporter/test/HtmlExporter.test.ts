import * as puppeteer from 'puppeteer';
import * as path from 'path';
import { dir, withDir, withFile } from 'tmp-promise';
import promisePipe from 'promisepipe';
import { mkdir, rm, writeFile } from 'fs/promises';
import { createWriteStream, readdirSync } from 'fs';

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

const hubContentDirectory = path.resolve(
    `${__dirname}/../../../test/data/hub-content/`
);
let h5pFiles: string[];
try {
    h5pFiles = readdirSync(hubContentDirectory).filter((f) =>
        f.endsWith('.h5p')
    );
} catch {
    throw new Error(
        "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
    );
}

const corePath = path.resolve(`${__dirname}/../../h5p-examples/h5p/core`);
const editorPath = path.resolve(`${__dirname}/../../h5p-examples/h5p/editor`);

describe('HtmlExporter', () => {
    let browser: puppeteer.Browser;
    let page: puppeteer.Page;
    let sharedLibraryDir: string;
    let sharedLibraryStorage: FileLibraryStorage;
    let sharedLibraryManager: LibraryManager;
    let sharedConfig: H5PConfig;
    let sharedBundleCache: Map<string, any>;

    beforeAll(async () => {
        // Create shared library directory and pre-install all libraries
        const libDir = await dir({ unsafeCleanup: true });
        sharedLibraryDir = libDir.path;

        sharedLibraryStorage = new FileLibraryStorage(sharedLibraryDir);
        sharedLibraryManager = new LibraryManager(sharedLibraryStorage);
        sharedConfig = new H5PConfig(null);
        sharedBundleCache = new Map();

        // Pre-install libraries from all .h5p packages into shared storage.
        // installLibrariesFromPackage only installs libraries (no content),
        // and LibraryManager.installFromDirectory skips already-installed
        // libraries, so calling this for every package is safe and efficient.
        const user = new User();
        for (const file of h5pFiles) {
            const tmpContentDir = await dir({ unsafeCleanup: true });
            try {
                const cs = new FileContentStorage(tmpContentDir.path);
                const cm = new ContentManager(
                    cs,
                    new LaissezFairePermissionSystem()
                );
                const pi = new PackageImporter(
                    sharedLibraryManager,
                    sharedConfig,
                    new LaissezFairePermissionSystem(),
                    cm,
                    new ContentStorer(cm, sharedLibraryManager, undefined)
                );
                await pi.installLibrariesFromPackage(
                    path.join(hubContentDirectory, file)
                );
            } finally {
                await tmpContentDir.cleanup();
            }
        }

        // Launch browser
        browser = await puppeteer.launch({
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
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
    }, 120000);

    afterAll(async () => {
        await page.close();
        await browser.close();
        await rm(sharedLibraryDir, { recursive: true, force: true });
    });

    async function importAndExportHtml(
        packagePath: string,
        mode: 'singleBundle' | 'externalContentResources'
    ): Promise<void> {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                await mkdir(contentDir, { recursive: true });

                const user = new User();

                const contentStorage = new FileContentStorage(contentDir);
                const contentManager = new ContentManager(
                    contentStorage,
                    new LaissezFairePermissionSystem()
                );

                const packageImporter = new PackageImporter(
                    sharedLibraryManager,
                    sharedConfig,
                    new LaissezFairePermissionSystem(),
                    contentManager,
                    new ContentStorer(
                        contentManager,
                        sharedLibraryManager,
                        undefined
                    )
                );

                const htmlExporter = new HtmlExporter(
                    sharedLibraryStorage,
                    contentStorage,
                    sharedConfig,
                    corePath,
                    editorPath,
                    undefined,
                    undefined,
                    { bundleCache: sharedBundleCache }
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
                            await writeFile(result.path, exportedHtml);
                            await page.goto(`file://${result.path}`, {
                                waitUntil: ['load'],
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
                            await mkdir(result.path, { recursive: true });
                            await writeFile(
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
                                    await mkdir(path.dirname(tempFilePath), {
                                        recursive: true
                                    });
                                    const writer =
                                        createWriteStream(tempFilePath);
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
                                    waitUntil: ['load'],
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

    for (const file of h5pFiles) {
        it(`creates html exports (${file})`, async () => {
            await importAndExportHtml(
                path.join(hubContentDirectory, file),
                'singleBundle'
            );
        }, 60000);
    }
    it(`creates html exports (H5P.Dialogcards.h5p)`, async () => {
        await importAndExportHtml(
            path.join(hubContentDirectory, 'H5P.Dialogcards.h5p'),
            'externalContentResources'
        );
    }, 60000);
});

describe('HtmlExporter template', () => {
    it('uses the optional template', async () => {
        const tmpDir = await dir({ unsafeCleanup: true });
        try {
            const contentDir = path.join(tmpDir.path, 'content');
            const libraryDir = path.join(tmpDir.path, 'libraries');
            await mkdir(contentDir, { recursive: true });
            await mkdir(libraryDir, { recursive: true });

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
                corePath,
                editorPath,
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
        } finally {
            await tmpDir.cleanup();
        }
    });
});
