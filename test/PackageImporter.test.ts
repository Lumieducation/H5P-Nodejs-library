import * as fsExtra from 'fs-extra';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import EditorConfig from '../src/EditorConfig';
import FileContentStorage from '../src/FileContentStorage';
import FileLibraryStorage from '../src/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';
import User from '../src/User';

describe('package importer', () => {
    it('installs libraries', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await fsExtra.ensureDir(libraryDir);

                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageImporter = new PackageImporter(
                    libraryManager,
                    new TranslationService({}),
                    new EditorConfig(null)
                );
                await packageImporter.installLibrariesFromPackage(
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
                const packageImporter = new PackageImporter(
                    libraryManager,
                    new TranslationService({}),
                    new EditorConfig(null),
                    contentManager
                );
                const contentId = await packageImporter.addPackageLibrariesAndContent(
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
});
