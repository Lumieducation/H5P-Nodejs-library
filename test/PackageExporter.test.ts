import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir, withFile } from 'tmp-promise';
import yauzlPromise from 'yauzl-promise';

import ContentManager from '../src/ContentManager';

import LibraryManager from '../src/LibraryManager';
import PackageExporter from '../src/PackageExporter';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';

import EditorConfig from '../examples/EditorConfig';
import User from '../examples/User';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';

export async function importAndExportPackage(
    packagePath: string
): Promise<void> {
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
            const translationService = new TranslationService({});
            const config = new EditorConfig(null);

            const packageImporter = new PackageImporter(
                libraryManager,
                translationService,
                config,
                contentManager
            );

            const packageExporter = new PackageExporter(
                libraryManager,
                translationService,
                config,
                contentManager
            );
            const contentId = (
                await packageImporter.addPackageLibrariesAndContent(
                    packagePath,
                    user
                )
            ).id;

            await withFile(
                async fileResult => {
                    const writeStream = fsExtra.createWriteStream(
                        fileResult.path
                    );
                    await packageExporter.createPackage(
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
                                packagePath
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
}
describe('PackageExporter', () => {
    it('creates h5p packages', async () => {
        await importAndExportPackage(
            path.resolve('test/data/validator/valid2.h5p')
        );
    });
});
