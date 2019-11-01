import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import { ContentFileScanner } from '../src/ContentFileScanner';
import ContentManager from '../src/ContentManager';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';
import { ContentId, IUser } from '../src/types';

import EditorConfig from '../examples/implementation/EditorConfig';
import FileContentStorage from '../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';
import User from '../examples/implementation/User';

describe('ContentFileScanner', () => {
    async function createContentFileScanner(
        file: string,
        user: IUser,
        tmpDirPath: string
    ): Promise<{
        contentId: ContentId;
        contentManager: ContentManager;
        contentScanner: ContentFileScanner;
    }> {
        // create required dependencies
        const contentDir = path.join(tmpDirPath, 'content');
        const libraryDir = path.join(tmpDirPath, 'libraries');
        await fsExtra.ensureDir(contentDir);
        await fsExtra.ensureDir(libraryDir);

        const contentManager = new ContentManager(
            new FileContentStorage(contentDir)
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(libraryDir)
        );

        // install content & libraries
        const packageImporter = new PackageImporter(
            libraryManager,
            new TranslationService({}),
            new EditorConfig(null),
            contentManager
        );
        const contentId = await packageImporter.addPackageLibrariesAndContent(
            file,
            user
        );

        // create ContentScanner
        return {
            contentId,
            contentManager,
            contentScanner: new ContentFileScanner(
                contentManager,
                libraryManager
            )
        };
    }

    it('finds the image in H5P.Blanks example', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const {
                    contentScanner,
                    contentId
                } = await createContentFileScanner(
                    path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                    user,
                    tmpDirPath
                );

                const foundImages = await contentScanner.scanForFiles(
                    contentId,
                    user
                );

                expect(foundImages.length).toEqual(1);
                expect(path.normalize(foundImages[0].filePath)).toEqual(
                    path.normalize('images/file-5885c18261805.jpg')
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('finds the image in H5P.Questionnaire example (= weird group single fields entry behaviour)', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const {
                    contentScanner,
                    contentId
                } = await createContentFileScanner(
                    path.resolve('test/data/hub-content/H5P.Questionnaire.h5p'),
                    user,
                    tmpDirPath
                );

                const foundImages = await contentScanner.scanForFiles(
                    contentId,
                    user
                );

                expect(foundImages.length).toEqual(1);
                expect(path.normalize(foundImages[0].filePath)).toEqual(
                    path.normalize('images/file-5a4d06a8cbabc.jpg')
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
