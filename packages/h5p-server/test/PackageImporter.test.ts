import * as fsExtra from 'fs-extra';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import H5PConfig from '../src/implementation/H5PConfig';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import ContentStorer from '../src/ContentStorer';
import { LaissezFairePermissionSystem } from '../src/implementation/LaissezFairePermissionSystem';
import { IUser, ContentPermission, GeneralPermission } from '../src/types';

import User from './User';

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
                    new H5PConfig(null),
                    new LaissezFairePermissionSystem()
                );
                const installedLibraryNames =
                    await packageImporter.installLibrariesFromPackage(
                        path.resolve('test/data/validator/valid2.h5p')
                    );

                expect(installedLibraryNames.length).toEqual(1);
                expect(installedLibraryNames[0].type).toEqual('new');
                expect(installedLibraryNames[0].oldVersion).toBeUndefined();
                expect(installedLibraryNames[0].newVersion).toMatchObject({
                    machineName: 'H5P.GreetingCard',
                    majorVersion: 1,
                    minorVersion: 0,
                    patchVersion: 6
                });

                // Check if library was installed correctly
                const installedLibraries =
                    await libraryManager.listInstalledLibraries();
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

                const contentManager = new ContentManager(
                    new FileContentStorage(contentDir),
                    new LaissezFairePermissionSystem()
                );
                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageImporter = new PackageImporter(
                    libraryManager,
                    new H5PConfig(null),
                    new LaissezFairePermissionSystem(),
                    contentManager,
                    new ContentStorer(contentManager, libraryManager, undefined)
                );
                const contentId = (
                    await packageImporter.addPackageLibrariesAndContent(
                        path.resolve('test/data/validator/valid2.h5p'),
                        user
                    )
                ).id;

                // Check if library was installed
                const installedLibraries =
                    await libraryManager.listInstalledLibraries();
                expect(installedLibraries['H5P.GreetingCard']).toBeDefined();

                // Check if metadata (h5p.json) was added correctly
                expect(
                    (await contentManager.getContentMetadata(contentId, user))
                        .title
                ).toEqual('Greeting card');
                expect(
                    (await contentManager.getContentMetadata(contentId, user))
                        .mainLibrary
                ).toEqual('H5P.GreetingCard');

                // Check if content (content/content.json) was added correctly
                expect(
                    (
                        (await contentManager.getContentParameters(
                            contentId,
                            user
                        )) as any
                    ).greeting
                ).toEqual('Hello world!');
                const fileStream = await contentManager.getContentFileStream(
                    contentId,
                    'earth.jpg',
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

    it('rejects content if libraries are missing', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await fsExtra.ensureDir(contentDir);
                await fsExtra.ensureDir(libraryDir);

                const user = new User();

                const permissionSystem =
                    new (class extends LaissezFairePermissionSystem {
                        async checkForGeneralAction(
                            _actingUser: IUser,
                            permission: GeneralPermission
                        ): Promise<boolean> {
                            return (
                                permission !==
                                GeneralPermission.UpdateAndInstallLibraries
                            );
                        }
                    })();

                const contentManager = new ContentManager(
                    new FileContentStorage(contentDir),
                    permissionSystem
                );
                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const packageImporter = new PackageImporter(
                    libraryManager,
                    new H5PConfig(null),
                    permissionSystem,
                    contentManager,
                    new ContentStorer(contentManager, libraryManager, undefined)
                );
                await expect(
                    packageImporter.addPackageLibrariesAndContent(
                        path.resolve('test/data/validator/valid2.h5p'),
                        user
                    )
                ).rejects.toThrow('install-missing-libraries');
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
