import * as fsExtra from 'fs-extra';
import jsonpath from 'jsonpath';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import { ContentFileScanner } from '../src/ContentFileScanner';
import ContentManager from '../src/ContentManager';
import H5PConfig from '../src/implementation/H5PConfig';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import { ContentId, IUser } from '../src/types';
import ContentStorer from '../src/ContentStorer';
import { LaissezFairePermissionSystem } from '../src/implementation/LaissezFairePermissionSystem';

import User from './User';
import { getContentDetails } from './ContentScanner.test';

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
            new FileContentStorage(contentDir),
            new LaissezFairePermissionSystem()
        );
        const libraryManager = new LibraryManager(
            new FileLibraryStorage(libraryDir)
        );

        // install content & libraries
        const packageImporter = new PackageImporter(
            libraryManager,
            new H5PConfig(null),
            new LaissezFairePermissionSystem(),
            contentManager,
            new ContentStorer(contentManager, libraryManager, undefined)
        );
        const contentId = (
            await packageImporter.addPackageLibrariesAndContent(file, user)
        ).id;

        // create ContentScanner
        return {
            contentId,
            contentManager,
            contentScanner: new ContentFileScanner(libraryManager)
        };
    }

    it('finds the image in H5P.Blanks example', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();

                const { contentScanner, contentId, contentManager } =
                    await createContentFileScanner(
                        path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                        user,
                        tmpDirPath
                    );

                const { params, mainLibraryName } = await getContentDetails(
                    contentId,
                    user,
                    contentManager
                );

                const foundImages = await contentScanner.scanForFiles(
                    params,
                    mainLibraryName
                );

                expect(foundImages.length).toEqual(1);
                expect(path.normalize(foundImages[0].filePath)).toEqual(
                    path.normalize('images/file-5885c18261805.jpg')
                );
                const parameters = await contentManager.getContentParameters(
                    contentId,
                    user
                );
                expect(
                    jsonpath.query(
                        parameters,
                        foundImages[0].context.jsonPath
                    )[0].path
                ).toEqual(foundImages[0].filePath);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('finds the image in H5P.Questionnaire example (= weird group single fields entry behaviour)', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();

                const { contentScanner, contentId, contentManager } =
                    await createContentFileScanner(
                        path.resolve(
                            'test/data/hub-content/H5P.Questionnaire.h5p'
                        ),
                        user,
                        tmpDirPath
                    );

                const { params, mainLibraryName } = await getContentDetails(
                    contentId,
                    user,
                    contentManager
                );

                const foundImages = await contentScanner.scanForFiles(
                    params,
                    mainLibraryName
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
