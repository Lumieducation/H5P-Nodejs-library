import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import { ContentScanner } from '../src/ContentScanner';
import LibraryManager from '../src/LibraryManager';
import PackageImporter from '../src/PackageImporter';
import TranslationService from '../src/TranslationService';

import EditorConfig from '../examples/implementation/EditorConfig';
import FileContentStorage from '../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';
import User from '../examples/implementation/User';

describe('ContentScanner', () => {
    it('scans the semantic structure of H5P.Blanks example', async () => {
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
                const contentParser = new ContentScanner(
                    contentManager,
                    libraryManager
                );

                const calledPaths: string[] = [];
                const logger = (semantics, params, p) => {
                    calledPaths.push(p);
                    return false;
                };

                await contentParser.scanContent(contentId, user, logger);
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
});
