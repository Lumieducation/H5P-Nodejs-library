import * as fsExtra from 'fs-extra';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir, withFile } from 'tmp-promise';
import yauzlPromise from 'yauzl-promise';

import ContentManager from '../src/ContentManager';
import EditorConfig from '../src/EditorConfig';
import FileContentStorage from '../src/FileContentStorage';
import FileLibraryStorage from '../src/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageManager from '../src/PackageManager';
import TranslationService from '../src/TranslationService';
import User from '../src/User';

describe('basic package manager functionality', () => {
    it('installs libraries', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await fsExtra.ensureDir(libraryDir);

                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageManager = new PackageManager(
                    libraryManager,
                    new TranslationService({}),
                    new EditorConfig(null)
                );
                await packageManager.installLibrariesFromPackage(
                    path.resolve('test/data/validator/valid2.h5p')
                );

                // Check if library was installed correctly
                const installedLibraries = await libraryManager.getInstalled();
                expect(installedLibraries['H5P.GreetingCard']).toBeDefined();
                expect(installedLibraries['H5P.GreetingCard'].length).toEqual(
                    1
                );
                expect(
                    installedLibraries['H5P.GreetingCard'][0].majorVersion
                ).toEqual(1);
                expect(
                    installedLibraries['H5P.GreetingCard'][0].minorVersion
                ).toEqual(0);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('adds content', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await fsExtra.ensureDir(contentDir);
                await fsExtra.ensureDir(libraryDir);

                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const contentManager = new ContentManager(
                    new FileContentStorage(contentDir)
                );
                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageManager = new PackageManager(
                    libraryManager,
                    new TranslationService({}),
                    new EditorConfig(null),
                    contentManager
                );
                const contentId = await packageManager.addPackageLibrariesAndContent(
                    path.resolve('test/data/validator/valid2.h5p'),
                    user
                );

                // Check if library was installed
                const installedLibraries = await libraryManager.getInstalled();
                expect(installedLibraries['H5P.GreetingCard']).toBeDefined();

                // Check if metadata (h5p.json) was added correctly
                expect(
                    (await contentManager.loadH5PJson(contentId, user)).title
                ).toEqual('Greeting card');
                expect(
                    (await contentManager.loadH5PJson(contentId, user))
                        .mainLibrary
                ).toEqual('H5P.GreetingCard');

                // Check if content (content/content.json) was added correctly
                expect(
                    ((await contentManager.loadContent(contentId, user)) as any)
                        .greeting
                ).toEqual('Hello world!');
                const fileStream = contentManager.getContentFileStream(
                    contentId,
                    'content/earth.jpg',
                    user
                );
                expect(fileStream).toBeDefined();

                // Check if image can be read
                const mockWriteStream = new BufferWritableMock();
                const onFinish = jest.fn();
                mockWriteStream.on('finish', onFinish);
                await promisepipe(fileStream, mockWriteStream);
                expect(onFinish).toHaveBeenCalled();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
    it('creates h5p packages', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await fsExtra.ensureDir(contentDir);
                await fsExtra.ensureDir(libraryDir);

                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const contentManager = new ContentManager(
                    new FileContentStorage(contentDir)
                );
                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageManager = new PackageManager(
                    libraryManager,
                    new TranslationService({}),
                    new EditorConfig(null),
                    contentManager
                );
                const contentId = await packageManager.addPackageLibrariesAndContent(
                    path.resolve('test/data/validator/valid2.h5p'),
                    user
                );

                await withFile(
                    async fileResult => {
                        const writeStream = fsExtra.createWriteStream(
                            fileResult.path
                        );
                        await packageManager.createPackage(
                            contentId,
                            writeStream,
                            user
                        );
                        await new Promise(async (resolve, reject) => {
                            const whenStreamClosed = jest.fn();
                            writeStream.on('close', whenStreamClosed);
                            writeStream.on('close', async () => {
                                expect(whenStreamClosed).toBeCalled();

                                const oldZipFile = await yauzlPromise.open(
                                    path.resolve(
                                        'test/data/validator/valid2.h5p'
                                    )
                                );
                                const oldEntries = (await oldZipFile.readEntries())
                                    .map(e => e.fileName)
                                    .sort();

                                const newZipFile = await yauzlPromise.open(
                                    fileResult.path
                                );
                                const newEntries = (await newZipFile.readEntries())
                                    .map(e => e.fileName)
                                    .sort();

                                expect(newEntries).toMatchObject(oldEntries);

                                resolve();
                            });
                        });
                    },
                    { postfix: '.h5p', keep: false }
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
