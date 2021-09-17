import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import { ContentScanner } from '../src/ContentScanner';
import H5PConfig from '../src/implementation/H5PConfig';
import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import { ContentId, ILibraryName, IUser } from '../src/types';
import ContentStorer from '../src/ContentStorer';

import User from './User';

async function createContentScanner(
    file: string,
    user: IUser,
    tmpDirPath: string
): Promise<{
    contentId: ContentId;
    contentManager: ContentManager;
    contentScanner: ContentScanner;
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
        new H5PConfig(null),
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
        contentScanner: new ContentScanner(libraryManager)
    };
}

export async function getContentDetails(
    contentId: ContentId,
    user: IUser,
    contentManager: ContentManager
): Promise<{ mainLibraryName: ILibraryName; params: any }> {
    // load metadata for content
    const contentMetadata = await contentManager.getContentMetadata(
        contentId,
        user
    );

    // get main library name
    const mainLibraryName = contentMetadata.preloadedDependencies.find(
        (lib) => lib.machineName === contentMetadata.mainLibrary
    );

    // load params
    const params = await contentManager.getContentParameters(contentId, user);

    return { mainLibraryName, params };
}

describe('ContentScanner', () => {
    it('scans the semantic structure of H5P.Blanks example', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                // initialize content manager
                const { contentScanner, contentManager, contentId } =
                    await createContentScanner(
                        path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                        user,
                        tmpDirPath
                    );

                const { mainLibraryName, params } = await getContentDetails(
                    contentId,
                    user,
                    contentManager
                );

                const calledJsonPaths: string[] = [];
                await contentScanner.scanContent(
                    params,
                    mainLibraryName,
                    (semantics, subParams, jsonPath) => {
                        calledJsonPaths.push(jsonPath);
                        return false;
                    }
                );
                expect(calledJsonPaths.sort()).toEqual(
                    [
                        '$.media',
                        '$.media.type',
                        '$.media.type.params.file',
                        '$.media.type.params.alt',
                        '$.media.type.params.title',
                        '$.media.type.params.contentName',
                        '$.media.disableImageZooming',
                        '$.text',
                        '$.questions',
                        '$.questions[0]',
                        '$.questions[1]',
                        '$.questions[2]',
                        '$.overallFeedback',
                        '$.overallFeedback[0]',
                        '$.overallFeedback[0].feedback',
                        '$.overallFeedback[0].from',
                        '$.overallFeedback[0].to',
                        '$.showSolutions',
                        '$.tryAgain',
                        '$.checkAnswer',
                        '$.notFilledOut',
                        '$.answerIsCorrect',
                        '$.answerIsWrong',
                        '$.answeredCorrectly',
                        '$.answeredIncorrectly',
                        '$.solutionLabel',
                        '$.inputLabel',
                        '$.inputHasTipLabel',
                        '$.tipLabel',
                        '$.behaviour',
                        '$.behaviour.enableRetry',
                        '$.behaviour.enableSolutionsButton',
                        '$.behaviour.enableCheckButton',
                        '$.behaviour.autoCheck',
                        '$.behaviour.caseSensitive',
                        '$.behaviour.showSolutionsRequiresInput',
                        '$.behaviour.separateLines',
                        '$.behaviour.confirmCheckDialog',
                        '$.behaviour.confirmRetryDialog',
                        '$.behaviour.acceptSpellingErrors',
                        '$.confirmCheck',
                        '$.confirmCheck.header',
                        '$.confirmCheck.body',
                        '$.confirmCheck.cancelLabel',
                        '$.confirmCheck.confirmLabel',
                        '$.confirmRetry',
                        '$.confirmRetry.header',
                        '$.confirmRetry.body',
                        '$.confirmRetry.cancelLabel',
                        '$.confirmRetry.confirmLabel',
                        '$.scoreBarLabel'
                    ].sort()
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('aborts scanning when requested', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const { contentScanner, contentId, contentManager } =
                    await createContentScanner(
                        path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                        user,
                        tmpDirPath
                    );

                const { mainLibraryName, params } = await getContentDetails(
                    contentId,
                    user,
                    contentManager
                );

                const calledJsonPaths: string[] = [];
                await contentScanner.scanContent(
                    params,
                    mainLibraryName,
                    (semantics, subParams, jsonPath) => {
                        calledJsonPaths.push(jsonPath);
                        if (
                            semantics.name === 'media' ||
                            semantics.name === 'behaviour' ||
                            semantics.name === 'confirmCheck'
                        ) {
                            return true;
                        }
                        return false;
                    }
                );
                expect(calledJsonPaths.sort()).toEqual(
                    [
                        '$.media',
                        '$.text',
                        '$.questions',
                        '$.questions[0]',
                        '$.questions[1]',
                        '$.questions[2]',
                        '$.overallFeedback',
                        '$.overallFeedback[0]',
                        '$.overallFeedback[0].feedback',
                        '$.overallFeedback[0].from',
                        '$.overallFeedback[0].to',
                        '$.showSolutions',
                        '$.tryAgain',
                        '$.checkAnswer',
                        '$.notFilledOut',
                        '$.answerIsCorrect',
                        '$.answerIsWrong',
                        '$.answeredCorrectly',
                        '$.answeredIncorrectly',
                        '$.solutionLabel',
                        '$.inputLabel',
                        '$.inputHasTipLabel',
                        '$.tipLabel',
                        '$.behaviour',
                        '$.confirmCheck',
                        '$.confirmRetry',
                        '$.confirmRetry.header',
                        '$.confirmRetry.body',
                        '$.confirmRetry.cancelLabel',
                        '$.confirmRetry.confirmLabel',
                        '$.scoreBarLabel'
                    ].sort()
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
