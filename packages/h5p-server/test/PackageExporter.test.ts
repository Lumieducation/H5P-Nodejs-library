import * as path from 'path';
import { Readable } from 'stream';
import { withDir, withFile } from 'tmp-promise';
import yauzl from 'yauzl-promise';
import { mkdir } from 'fs/promises';
import { createWriteStream } from 'fs';

import ContentManager from '../src/ContentManager';
import H5PConfig from '../src/implementation/H5PConfig';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageExporter from '../src/PackageExporter';
import PackageImporter from '../src/PackageImporter';
import ContentStorer from '../src/ContentStorer';

import User from './User';
import { LaissezFairePermissionSystem } from '../src/implementation/LaissezFairePermissionSystem';

export function importAndExportPackage(
    packagePath: string,
    exportMaxContentPathLength: number = 255
): Promise<void> {
    return withDir(
        async ({ path: tmpDirPath }) => {
            const contentDir = path.join(tmpDirPath, 'content');
            const libraryDir = path.join(tmpDirPath, 'libraries');
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

            const packageExporter = new PackageExporter(
                libraryManager,
                contentStorage,
                { exportMaxContentPathLength }
            );
            const contentId = (
                await packageImporter.addPackageLibrariesAndContent(
                    packagePath,
                    user
                )
            ).id;

            await withFile(
                async (fileResult) => {
                    const writeStream = createWriteStream(fileResult.path);
                    await packageExporter.createPackage(
                        contentId,
                        writeStream,
                        user
                    );
                    await new Promise<void>((resolve, reject) => {
                        const whenStreamClosed = vi.fn();
                        writeStream.on('close', whenStreamClosed);
                        writeStream.on('close', async () => {
                            expect(whenStreamClosed).toHaveBeenCalled();

                            const oldZipFile = await yauzl.open(packagePath);
                            const oldEntries = (await oldZipFile.readEntries())
                                .map((e) => e.filename)
                                .sort();

                            const newZipFile = await yauzl.open(
                                fileResult.path
                            );
                            const newEntries = (await newZipFile.readEntries())
                                .map((e) => e.filename)
                                .sort();

                            if (exportMaxContentPathLength === 255) {
                                expect(newEntries).toMatchObject(oldEntries);
                            } else {
                                for (const newEntry of newEntries) {
                                    expect(newEntry.length).toBeLessThanOrEqual(
                                        exportMaxContentPathLength
                                    );
                                }
                            }

                            resolve();
                        });
                    });
                },
                { postfix: '.h5p', keep: false }
            );
        },
        { keep: false, unsafeCleanup: true }
    );
}
describe('PackageExporter', () => {
    it('creates h5p packages', async () => {
        await importAndExportPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );
    });

    it('shortens long filenames', async () => {
        await importAndExportPackage(
            path.resolve(
                'packages/h5p-server/test/data/PackageExporter/long_content_file_name.h5p'
            ),
            50
        );
    });

    it('includes installed addons in the exported package', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const contentDir = path.join(tmpDirPath, 'content');
                const libraryDir = path.join(tmpDirPath, 'libraries');
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
                        path.resolve('test/data/validator/valid2.h5p'),
                        user
                    )
                ).id;

                // Install an addon library that is not a dependency of the
                // content but should still be included in the export.
                const addonLibrary = await libraryStorage.addLibrary(
                    {
                        machineName: 'H5P.TestAddon',
                        majorVersion: 1,
                        minorVersion: 0,
                        patchVersion: 0,
                        runnable: 0,
                        title: 'Test addon',
                        addTo: {
                            player: {
                                machineNames: ['*']
                            }
                        }
                    } as any,
                    false
                );
                const addonFileContent = 'console.log("addon");';
                const addonFileStream = new Readable();
                // eslint-disable-next-line no-underscore-dangle
                addonFileStream._read = () => {};
                addonFileStream.push(addonFileContent);
                addonFileStream.push(null);
                await libraryStorage.addFile(
                    addonLibrary,
                    'addon.js',
                    addonFileStream
                );

                const packageExporter = new PackageExporter(
                    libraryManager,
                    contentStorage,
                    { exportMaxContentPathLength: 255 }
                );

                await withFile(
                    async (fileResult) => {
                        const writeStream = createWriteStream(fileResult.path);
                        await packageExporter.createPackage(
                            contentId,
                            writeStream,
                            user
                        );
                        await new Promise<void>((resolve) => {
                            writeStream.on('close', async () => {
                                const zipFile = await yauzl.open(
                                    fileResult.path
                                );
                                const entries = (
                                    await zipFile.readEntries()
                                ).map((e) => e.filename);
                                expect(entries).toContain(
                                    'H5P.TestAddon-1.0/addon.js'
                                );
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
