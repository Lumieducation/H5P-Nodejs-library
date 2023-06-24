import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir, withFile } from 'tmp-promise';
import yauzlPromise from 'yauzl-promise';

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
                    const writeStream = fsExtra.createWriteStream(
                        fileResult.path
                    );
                    await packageExporter.createPackage(
                        contentId,
                        writeStream,
                        user
                    );
                    await new Promise<void>((resolve, reject) => {
                        const whenStreamClosed = jest.fn();
                        writeStream.on('close', whenStreamClosed);
                        writeStream.on('close', async () => {
                            expect(whenStreamClosed).toBeCalled();

                            const oldZipFile = await yauzlPromise.open(
                                packagePath
                            );
                            const oldEntries = (await oldZipFile.readEntries())
                                .map((e) => e.fileName)
                                .sort();

                            const newZipFile = await yauzlPromise.open(
                                fileResult.path
                            );
                            const newEntries = (await newZipFile.readEntries())
                                .map((e) => e.fileName)
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
});
