import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import ContentParser from '../src/ContentParser';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';

import EditorConfig from '../examples/implementation/EditorConfig';
import FileContentStorage from '../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';
import User from '../examples/implementation/User';

describe('ContentParser', () => {
    it('parsers content', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                // install content & libraries
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
                    // path.resolve('test/data/validator/valid2.h5p'),
                    path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                    user
                );

                // parse content
                const contentParser = new ContentParser(
                    contentManager,
                    libraryManager
                );

                await expect(
                    contentParser.parseContent(contentId, user)
                ).resolves.toBeUndefined();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
