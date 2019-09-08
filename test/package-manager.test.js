const { withDir } = require('tmp-promise');
const path = require('path');
const fs = require('fs-extra');
const { BufferWritableMock } = require('stream-mock');
const promisePipe = require('promisepipe');

const PackageManager = require('../src/package-manager');
const FileContentyStorage = require('../src/file-content-storage');
const FileLibraryStorage = require('../src/file-library-storage');
const ContentManager = require('../src/content-manager');
const LibraryManager = require('../src/library-manager');
const TranslationService = require('../src/translation-service');
const H5PConfig = require('../src/config');
const User = require('../src/user');

describe('basic package manager functionality', () => {
    it('installs libraries', async () => {
        await withDir(async ({ path: tmpDirPath }) => {
            const libraryDir = path.join(tmpDirPath, "libraries")
            await fs.ensureDir(libraryDir);

            const libraryManager = new LibraryManager(new FileLibraryStorage(libraryDir));
            const packageManager = new PackageManager(libraryManager, new TranslationService({}), new H5PConfig());
            await packageManager.installLibrariesFromPackage(path.resolve('test/data/validator/valid2.h5p'));

            // Check if library was installed correctly
            const installedLibraries = await libraryManager.getInstalled();
            expect(installedLibraries["H5P.GreetingCard"]).toBeDefined();
            expect(installedLibraries["H5P.GreetingCard"].length).toEqual(1);
            expect(installedLibraries["H5P.GreetingCard"][0].majorVersion).toEqual(1);
            expect(installedLibraries["H5P.GreetingCard"][0].minorVersion).toEqual(0);
        }, { keep: false, unsafeCleanup: true });
    });

    it('adds content', async () => {
        await withDir(async ({ path: tmpDirPath }) => {
            const contentDir = path.join(tmpDirPath, "content");
            const libraryDir = path.join(tmpDirPath, "libraries")
            await fs.ensureDir(contentDir);
            await fs.ensureDir(libraryDir);

            const user = new User();
            user.canUpdateAndInstallLibraries = true;

            const contentManager = new ContentManager(new FileContentyStorage(contentDir));
            const libraryManager = new LibraryManager(new FileLibraryStorage(libraryDir));
            const packageManager = new PackageManager(libraryManager, new TranslationService({}), new H5PConfig(), contentManager);
            const contentId = await packageManager.addPackageLibrariesAndContent(path.resolve('test/data/validator/valid2.h5p'), user);

            // Check if library was installed
            const installedLibraries = await libraryManager.getInstalled();
            expect(installedLibraries["H5P.GreetingCard"]).toBeDefined();

            // Check if metadata (h5p.json) was added correctly
            expect((await contentManager.loadH5PJson(contentId, user)).title).toEqual("Greeting card");
            expect((await contentManager.loadH5PJson(contentId, user)).mainLibrary).toEqual("H5P.GreetingCard");

            // Check if content (content/content.json) was added correctly
            expect((await contentManager.loadContent(contentId, user)).greeting).toEqual("Hello world!");
            const fileStream = contentManager.getContentFileStream(contentId, 'content/earth.jpg', user);
            expect(fileStream).toBeDefined();

            // Check if image can be read
            const mockWriteStream = new BufferWritableMock();            
            const onFinish = jest.fn();
            mockWriteStream.on("finish", onFinish);
            await promisePipe(fileStream, mockWriteStream);
            expect(onFinish).toHaveBeenCalled();
        }, { keep: false, unsafeCleanup: true });
    });
});
