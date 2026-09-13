import { createWriteStream } from 'fs';
import { mkdir, readdir, readFile, stat, writeFile } from 'fs/promises';
import * as path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir } from 'tmp-promise';
import yazl from 'yazl';

import AggregateH5pError from '../src/helpers/AggregateH5pError';
import ContentManager from '../src/ContentManager';
import ContentStorer from '../src/ContentStorer';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import H5PConfig from '../src/implementation/H5PConfig';
import { LaissezFairePermissionSystem } from '../src/implementation/LaissezFairePermissionSystem';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import {
    GeneralPermission,
    IFileMalwareScanner,
    IUser,
    MalwareScanResult
} from '../src/types';

import User from './User';

/**
 * Recursively zips a directory into a .h5p package file. Used by tests that
 * need a package fixture that isn't already checked in as a .h5p file.
 */
async function zipDirectory(
    sourceDir: string,
    targetZipPath: string
): Promise<void> {
    const zipFile = new yazl.ZipFile();
    const outputFinished = new Promise<void>((resolve, reject) => {
        const writeStream = createWriteStream(targetZipPath);
        writeStream.on('close', resolve);
        writeStream.on('error', reject);
        zipFile.outputStream.pipe(writeStream);
    });

    async function addDirectory(dir: string, prefix: string): Promise<void> {
        const entries = await readdir(dir);
        for (const entry of entries) {
            const entryPath = path.join(dir, entry);
            const entryPrefix = prefix ? `${prefix}/${entry}` : entry;
            // eslint-disable-next-line no-await-in-loop
            const stats = await stat(entryPath);
            if (stats.isDirectory()) {
                // eslint-disable-next-line no-await-in-loop
                await addDirectory(entryPath, entryPrefix);
            } else {
                zipFile.addFile(entryPath, entryPrefix);
            }
        }
    }
    await addDirectory(sourceDir, '');
    zipFile.end();
    await outputFinished;
}

describe('package importer', () => {
    it('installs libraries', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await mkdir(libraryDir, { recursive: true });

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
                await mkdir(contentDir, { recursive: true });
                await mkdir(libraryDir, { recursive: true });

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
                const onFinish = vi.fn();
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
                await mkdir(contentDir, { recursive: true });
                await mkdir(libraryDir, { recursive: true });

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
                // The only dependency valid2.h5p's h5p.json declares is its
                // own main library (H5P.GreetingCard), so this exercises the
                // "missing main library" shape of the aggregate error.
                let thrownError: unknown;
                try {
                    await packageImporter.addPackageLibrariesAndContent(
                        path.resolve('test/data/validator/valid2.h5p'),
                        user
                    );
                } catch (error) {
                    thrownError = error;
                }
                expect(thrownError).toBeInstanceOf(AggregateH5pError);
                const aggregateError = thrownError as AggregateH5pError;
                expect(aggregateError.errorId).toEqual(
                    'install-missing-libraries'
                );
                const errorIds = aggregateError
                    .getErrors()
                    .map((e) => e.errorId);
                expect(errorIds).toContain('install-missing-libraries');
                expect(errorIds).toContain('missing-main-library');
                expect(errorIds).not.toContain('missing-required-library');
                const mainLibraryError = aggregateError
                    .getErrors()
                    .find((e) => e.errorId === 'missing-main-library');
                expect(mainLibraryError.replacements.library).toEqual(
                    'H5P.GreetingCard-1.0'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('rejects content if a non-main dependency is missing', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
                const extractDir = path.join(tmpDirPath, 'extracted');
                await mkdir(contentDir, { recursive: true });
                await mkdir(libraryDir, { recursive: true });
                await mkdir(extractDir, { recursive: true });

                // Build a package fixture based on valid2.h5p, but with an
                // additional preloadedDependency in h5p.json that is neither
                // shipped inside the package nor installed on the system.
                await PackageImporter.extractPackage(
                    path.resolve('test/data/validator/valid2.h5p'),
                    extractDir,
                    {
                        includeContent: true,
                        includeLibraries: true,
                        includeMetadata: true
                    }
                );
                const h5pJsonPath = path.join(extractDir, 'h5p.json');
                const h5pJson = JSON.parse(
                    await readFile(h5pJsonPath, 'utf-8')
                );
                h5pJson.preloadedDependencies.push({
                    machineName: 'H5P.NotShipped',
                    majorVersion: '1',
                    minorVersion: '0'
                });
                await writeFile(h5pJsonPath, JSON.stringify(h5pJson), 'utf-8');
                const packagePath = path.join(
                    tmpDirPath,
                    'package-with-missing-dependency.h5p'
                );
                await zipDirectory(extractDir, packagePath);

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

                let thrownError: unknown;
                try {
                    await packageImporter.addPackageLibrariesAndContent(
                        packagePath,
                        user
                    );
                } catch (error) {
                    thrownError = error;
                }
                expect(thrownError).toBeInstanceOf(AggregateH5pError);
                const aggregateError = thrownError as AggregateH5pError;
                expect(aggregateError.errorId).toEqual(
                    'install-missing-libraries'
                );
                const errorIds = aggregateError
                    .getErrors()
                    .map((e) => e.errorId);
                expect(errorIds).toContain('install-missing-libraries');
                expect(errorIds).toContain('missing-required-library');
                expect(errorIds).not.toContain('missing-main-library');
                const requiredLibraryError = aggregateError
                    .getErrors()
                    .find((e) => e.errorId === 'missing-required-library');
                expect(requiredLibraryError.replacements.library).toEqual(
                    'H5P.NotShipped-1.0'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('rejects content with virus', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                // prepare
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
                await mkdir(contentDir, { recursive: true });
                await mkdir(libraryDir, { recursive: true });

                const user = new User();

                const contentManager = new ContentManager(
                    new FileContentStorage(contentDir),
                    new LaissezFairePermissionSystem()
                );
                const libraryManager = new LibraryManager(
                    new FileLibraryStorage(libraryDir)
                );
                const mockMalwareScanner: IFileMalwareScanner = {
                    name: 'Mock malware scanner',
                    scan: async (filepath) => {
                        if (filepath.includes('eicar')) {
                            return {
                                result: MalwareScanResult.MalwareFound,
                                viruses: 'EICAR test virus'
                            };
                        }
                        return { result: MalwareScanResult.Clean };
                    }
                };
                const malwareScannerSpy = vi.spyOn(mockMalwareScanner, 'scan');
                const packageImporter = new PackageImporter(
                    libraryManager,
                    new H5PConfig(null),
                    new LaissezFairePermissionSystem(),
                    contentManager,
                    new ContentStorer(
                        contentManager,
                        libraryManager,
                        undefined,
                        {
                            malwareScanners: [mockMalwareScanner]
                        }
                    )
                );
                // act + assert
                await expect(
                    packageImporter.addPackageLibrariesAndContent(
                        path.resolve('test/data/validator/h5p-with-virus.h5p'),
                        user
                    )
                ).rejects.toThrow('upload-malware-found');

                expect(malwareScannerSpy).toHaveBeenCalled();
                const addedContent = await contentManager.listContent();
                expect(addedContent.length).toBe(0);
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
