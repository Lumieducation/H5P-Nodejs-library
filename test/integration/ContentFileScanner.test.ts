import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { dir, DirectoryResult } from 'tmp-promise';

import { ContentFileScanner } from '../../src/ContentFileScanner';
import ContentManager from '../../src/ContentManager';
import LibraryManager from '../../src/LibraryManager';
import PackageImporter from '../../src/PackageImporter';
import TranslationService from '../../src/TranslationService';
import { ContentId } from '../../src/types';

import EditorConfig from '../../examples/implementation/EditorConfig';
import FileContentStorage from '../../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../../examples/implementation/FileLibraryStorage';
import User from '../../examples/implementation/User';

describe('ContentFileScanner (integration test with H5P Hub examples)', () => {
    // scan all Hub examples for their file references and compare to directory contents
    const directory = path.resolve('test/data/hub-content/');
    let h5pPackages;
    try {
        h5pPackages = fsExtra.readdirSync(directory);
    } catch {
        throw new Error(
            "The directory test/data/hub-content does not exist. Execute 'npm run download:content' to fetch example data from the H5P Hub!"
        );
    }

    // Install all packages from the H5P Hub before running tests for indidual content.
    // (This is necessary, as some packages have unfulfilled dependencies if you just install them. The
    // tests for these packages will fail because the semantics.json file is missing for them.)

    let tmpDir: DirectoryResult;
    let tmpDirPath: string;
    let contentManager: ContentManager;
    let contentScanner: ContentFileScanner = null;
    let packageIdMap: Map<string, ContentId>;
    const user = new User();
    user.canUpdateAndInstallLibraries = true;

    // We have to use beforeAll as describe(...) doesn't accept async functions
    beforeAll(async () => {
        tmpDir = await dir({ unsafeCleanup: true });
        tmpDirPath = tmpDir.path;

        // create required dependencies
        const contentDir = path.join(tmpDirPath, 'content');
        const libraryDir = path.join(tmpDirPath, 'libraries');
        await fsExtra.ensureDir(contentDir);
        await fsExtra.ensureDir(libraryDir);

        contentManager = new ContentManager(new FileContentStorage(contentDir));
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

        packageIdMap = new Map<string, ContentId>();

        for (const file of h5pPackages.filter(f => f.endsWith('.h5p'))) {
            packageIdMap.set(
                file,
                await packageImporter.addPackageLibrariesAndContent(
                    path.join(directory, file),
                    user
                )
            );
        }

        contentScanner = new ContentFileScanner(contentManager, libraryManager);
    }, 120000); // long timeout because we install a lot of packages

    afterAll(async () => {
        tmpDir.cleanup();
    });

    for (const file of h5pPackages.filter(f => f.endsWith('.h5p'))) {
        it(`finds all files in ${file}`, async () => {
            const contentId = packageIdMap.get(file);
            const foundFiles = await contentScanner.scanForFiles(
                contentId,
                user
            );

            const fileSystemFiles = await contentManager.getContentFiles(
                contentId,
                user
            );

            expect(foundFiles.map(f => path.normalize(f.path)).sort()).toEqual(
                fileSystemFiles.map(p => path.normalize(p)).sort()
            );
        });
    }
});
