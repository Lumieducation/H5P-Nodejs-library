import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import { ContentScanner } from '../src/ContentScanner';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';
import { ContentId, IUser } from '../src/types';

import EditorConfig from '../examples/implementation/EditorConfig';
import FileContentStorage from '../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';
import User from '../examples/implementation/User';

describe('ContentScanner', () => {
    async function createContentScanner(
        file: string,
        user: IUser,
        tmpDirPath: string
    ): Promise<{ contentId: ContentId; contentScanner: ContentScanner }> {
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
            contentScanner: new ContentScanner(contentManager, libraryManager)
        };
    }

    it('scans the semantic structure of H5P.Blanks example', async () => {
        await withDir(
            async ({ path: tmpDirPath }) => {
                const user = new User();
                user.canUpdateAndInstallLibraries = true;

                const {
                    contentScanner,
                    contentId
                } = await createContentScanner(
                    path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                    user,
                    tmpDirPath
                );

                const calledPaths: string[] = [];
                await contentScanner.scanContent(
                    contentId,
                    user,
                    (semantics, params, p) => {
                        calledPaths.push(p);
                        return false;
                    }
                );
                expect(calledPaths.sort()).toEqual(
                    [
                        '.media',
                        '.media.type',
                        '.media.type.file',
                        '.media.type.alt',
                        '.media.type.title',
                        '.media.type.contentName',
                        '.media.disableImageZooming',
                        '.text',
                        '.questions',
                        '.questions[0].question',
                        '.questions[1].question',
                        '.questions[2].question',
                        '.overallFeedback',
                        '.overallFeedback[0].overallFeedback',
                        '.overallFeedback[0].overallFeedback.feedback',
                        '.overallFeedback[0].overallFeedback.from',
                        '.overallFeedback[0].overallFeedback.to',
                        '.showSolutions',
                        '.tryAgain',
                        '.checkAnswer',
                        '.notFilledOut',
                        '.answerIsCorrect',
                        '.answerIsWrong',
                        '.answeredCorrectly',
                        '.answeredIncorrectly',
                        '.solutionLabel',
                        '.inputLabel',
                        '.inputHasTipLabel',
                        '.tipLabel',
                        '.behaviour',
                        '.behaviour.enableRetry',
                        '.behaviour.enableSolutionsButton',
                        '.behaviour.enableCheckButton',
                        '.behaviour.autoCheck',
                        '.behaviour.caseSensitive',
                        '.behaviour.showSolutionsRequiresInput',
                        '.behaviour.separateLines',
                        '.behaviour.confirmCheckDialog',
                        '.behaviour.confirmRetryDialog',
                        '.behaviour.acceptSpellingErrors',
                        '.confirmCheck',
                        '.confirmCheck.header',
                        '.confirmCheck.body',
                        '.confirmCheck.cancelLabel',
                        '.confirmCheck.confirmLabel',
                        '.confirmRetry',
                        '.confirmRetry.header',
                        '.confirmRetry.body',
                        '.confirmRetry.cancelLabel',
                        '.confirmRetry.confirmLabel',
                        '.scoreBarLabel'
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

                const {
                    contentScanner,
                    contentId
                } = await createContentScanner(
                    path.resolve('test/data/hub-content/H5P.Blanks.h5p'),
                    user,
                    tmpDirPath
                );

                const calledPaths: string[] = [];
                await contentScanner.scanContent(
                    contentId,
                    user,
                    (semantics, params, p) => {
                        calledPaths.push(p);
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
                expect(calledPaths.sort()).toEqual(
                    [
                        '.media',
                        '.text',
                        '.questions',
                        '.questions[0].question',
                        '.questions[1].question',
                        '.questions[2].question',
                        '.overallFeedback',
                        '.overallFeedback[0].overallFeedback',
                        '.overallFeedback[0].overallFeedback.feedback',
                        '.overallFeedback[0].overallFeedback.from',
                        '.overallFeedback[0].overallFeedback.to',
                        '.showSolutions',
                        '.tryAgain',
                        '.checkAnswer',
                        '.notFilledOut',
                        '.answerIsCorrect',
                        '.answerIsWrong',
                        '.answeredCorrectly',
                        '.answeredIncorrectly',
                        '.solutionLabel',
                        '.inputLabel',
                        '.inputHasTipLabel',
                        '.tipLabel',
                        '.behaviour',
                        '.confirmCheck',
                        '.confirmRetry',
                        '.confirmRetry.header',
                        '.confirmRetry.body',
                        '.confirmRetry.cancelLabel',
                        '.confirmRetry.confirmLabel',
                        '.scoreBarLabel'
                    ].sort()
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
