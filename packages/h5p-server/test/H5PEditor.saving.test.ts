import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir, withFile } from 'tmp-promise';

import LibraryName from '../src/LibraryName';
import {
    IContentMetadata,
    IContentStorage,
    IEditorModel,
    IH5PConfig,
    IKeyValueStorage,
    ILibraryFileUrlResolver,
    ILibraryStorage,
    ITemporaryFileStorage
} from '../src/types';

import User from './User';
import { fsImplementations, H5PEditor } from '../src';
import H5PConfig from '../src/implementation/H5PConfig';
import UrlGenerator from '../src/UrlGenerator';
import { validatePackage } from './helpers/PackageValidatorHelper';

import MockContentUserDataStorage from './__mocks__/ContentUserDataStorage';

describe('H5PEditor', () => {
    const mockContentUserDataStorage = new MockContentUserDataStorage();
    function createH5PEditor(
        tempPath: string,
        options?: { withUrlGenerator?: boolean }
    ): {
        config: IH5PConfig;
        contentStorage: IContentStorage;
        h5pEditor: H5PEditor;
        keyValueStorage: IKeyValueStorage;
        libraryFileUrlResolver: ILibraryFileUrlResolver;
        libraryStorage: ILibraryStorage;
        temporaryStorage: ITemporaryFileStorage;
    } {
        const keyValueStorage = new fsImplementations.InMemoryStorage();
        const config = new H5PConfig(keyValueStorage);
        const libraryStorage = new fsImplementations.FileLibraryStorage(
            path.join(tempPath, 'libraries')
        );
        const contentStorage = new fsImplementations.FileContentStorage(
            path.join(tempPath, 'content')
        );
        const libraryFileUrlResolver = (): string => '';
        const temporaryStorage =
            new fsImplementations.DirectoryTemporaryFileStorage(
                path.join(tempPath, 'tmp')
            );

        const h5pEditor = new H5PEditor(
            keyValueStorage,
            config,
            libraryStorage,
            contentStorage,
            temporaryStorage,
            undefined,
            options?.withUrlGenerator
                ? new UrlGenerator(config, {
                      protectAjax: true,
                      protectContentUserData: true,
                      protectSetFinished: true,
                      queryParamGenerator: (user) => ({
                          name: '_csrf',
                          value: 'token'
                      })
                  })
                : undefined,
            undefined,
            mockContentUserDataStorage
        );

        return {
            config,
            contentStorage,
            h5pEditor,
            keyValueStorage,
            libraryFileUrlResolver,
            libraryStorage,
            temporaryStorage
        };
    }

    const mockupMetadata: IContentMetadata = {
        embedTypes: ['div'],
        language: 'und',
        license: 'U',
        mainLibrary: 'H5P.GreetingCard',
        preloadedDependencies: [
            {
                machineName: 'H5P.GreetingCard',
                majorVersion: 1,
                minorVersion: 0
            }
        ],
        title: 'Greeting card',
        defaultLanguage: 'en'
    };

    const mockupMainLibraryName = LibraryName.toUberName(
        mockupMetadata.preloadedDependencies[0],
        {
            useWhitespace: true
        }
    );

    const mockupParametersWithoutImage = {
        greeting: 'Hello world!'
    };

    const mockupParametersWithImage = {
        greeting: 'Hello world!',
        image: {
            copyright: { license: 'U' },
            height: 300,
            path: 'earth.jpg',
            width: 300
        }
    };

    it('stores content files for unsaved content and returns it', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.jpg',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                expect(savedFilePath).toBeDefined();
                expect(savedFilePath.endsWith('#tmp')).toBeTruthy();
                const cleanSavedFilePath = savedFilePath.substr(
                    0,
                    savedFilePath.length - 4
                );

                const returnedStream = await h5pEditor.getContentFileStream(
                    undefined,
                    cleanSavedFilePath,
                    user
                );

                expect(returnedStream).toBeDefined();

                const mockWriteStream1 = new BufferWritableMock();
                const onFinish1 = jest.fn();
                mockWriteStream1.on('finish', onFinish1);
                await promisepipe(returnedStream, mockWriteStream1);
                expect(onFinish1).toHaveBeenCalled();
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('stores content files with UPPERCASE extensions', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.JPG',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                expect(savedFilePath).toBeDefined();
                expect(savedFilePath.endsWith('#tmp')).toBeTruthy();
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('saves content and returns the data', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save the content
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    LibraryName.toUberName(
                        mockupMetadata.preloadedDependencies[0],
                        {
                            useWhitespace: true
                        }
                    ),
                    user
                );

                // check if contentId is valid
                expect(contentId).toBeDefined();
                expect(contentId).not.toEqual('');

                // get data we've stored previously and check if everything is in order
                const { h5p, library, params } = await h5pEditor.getContent(
                    contentId,
                    user
                );
                expect(library).toEqual(mockupMainLibraryName);
                expect(params.params).toEqual(mockupParametersWithoutImage);
                expect(params.metadata).toEqual(mockupMetadata);
                expect(h5p).toEqual(mockupMetadata);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('adds files to previously existing content and deletes them again', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save content without an image
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // save image
                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.jpg',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                // put path of image into parameters (like the H5P editor client would)
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object
                await h5pEditor.saveOrUpdateContent(
                    contentId,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // get data we've stored and check if the #tmp tag has been removed from the image
                const { h5p, library, params } = await h5pEditor.getContent(
                    contentId,
                    user
                );
                const newFilename = savedFilePath.substr(
                    0,
                    savedFilePath.length - 4
                );
                expect(params.params.image.path).toEqual(newFilename);

                // check if image is now in permanent storage
                await expect(
                    contentStorage.fileExists(contentId, newFilename)
                ).resolves.toEqual(true);

                // update content type without image
                await h5pEditor.saveOrUpdateContent(
                    contentId,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // check if file was deleted from storage
                await expect(
                    contentStorage.fileExists(contentId, newFilename)
                ).resolves.toEqual(false);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('adds files to previously existing content and deletes them again', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save content without an image
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // save the H5P content object
                await h5pEditor.saveOrUpdateContent(
                    contentId,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                expect(
                    mockContentUserDataStorage.deleteInvalidatedContentUserData
                ).toHaveBeenCalledWith(contentId);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('produces two identical copies with dependent files if the user presses "save" twice on unsaved content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save image
                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.jpg',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                // put path of image into parameters (like the H5P editor client would)
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object
                const contentId1 = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // we write the filename into the path again as it was modified by the previous call to saveH5P
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object a second time
                const contentId2 = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // we pressed save twice, so the content should have been saved to two different places
                expect(contentId1).not.toEqual(contentId2);

                // expect the image to be present in both pieces of content
                const cleanFilePath = savedFilePath.substr(
                    0,
                    savedFilePath.length - 4
                );
                await expect(
                    contentStorage.fileExists(contentId1, cleanFilePath)
                ).resolves.toEqual(true);
                await expect(
                    contentStorage.fileExists(contentId2, cleanFilePath)
                ).resolves.toEqual(true);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('gracefully changes temporary paths to regular paths if the user presses "save" twice on already saved content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save content without an image
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // save image
                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.jpg',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                // check if the temporary file can be read
                const cleanFilePath = savedFilePath.substr(
                    0,
                    savedFilePath.length - 4
                );
                const fileStream =
                    await h5pEditor.temporaryFileManager.getFileStream(
                        cleanFilePath,
                        user
                    );
                await expect(fileStream).toBeDefined();
                if ((fileStream as any).close) {
                    (fileStream as any).close();
                }

                // put path of image into parameters (like the H5P editor client would)
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object
                await h5pEditor.saveOrUpdateContent(
                    contentId,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // the temporary file must have been deleted
                await expect(
                    h5pEditor.temporaryFileManager.getFileStream(
                        cleanFilePath,
                        user
                    )
                ).rejects.toThrow();

                // we write the filename into the path again as it was modified by the previous call to saveH5P
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object a second time
                await h5pEditor.saveOrUpdateContent(
                    contentId,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );
                // expect the image to be exist in the content
                await expect(
                    contentStorage.fileExists(contentId, cleanFilePath)
                ).resolves.toEqual(true);

                // the temporary file marker must not be present in the content parameters
                const { params } = await h5pEditor.getContent(contentId, user);
                expect(params.params.image.path).toEqual(cleanFilePath);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('copies pasted image from saved content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save image
                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );
                const fileBuffer = fsExtra.readFileSync(originalPath);
                const { path: savedFilePath } = await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        data: fileBuffer,
                        mimetype: 'image/jpeg',
                        name: 'earth.jpg',
                        size: fsExtra.statSync(originalPath).size
                    },
                    user
                );

                // put path of image into parameters (like the H5P editor client would)
                mockupParametersWithImage.image.path = savedFilePath;

                // save the H5P content object
                const contentId1 = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // remove the #tmp tag
                const cleanSavedFilePath = savedFilePath.substr(
                    0,
                    savedFilePath.length - 4
                );

                // save pasted content
                const pastedMockupParametersWithImage = {
                    greeting: 'Hello pasted!',
                    image: {
                        copyright: { license: 'U' },
                        height: 300,
                        path: `../content/${contentId1}/${cleanSavedFilePath}`,
                        width: 300
                    }
                };
                const contentId2 = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    pastedMockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                // check if newly saved content has a different file name than the original (to prevent collisions)
                const { params: params2 } = await h5pEditor.getContent(
                    contentId2,
                    user
                );
                expect(params2.params.image.path).not.toEqual(
                    cleanSavedFilePath
                );
                // check if the relative path was removed
                expect(params2.params.image.path.startsWith('../')).toBeFalsy();

                // check if first saved content still has content file
                await expect(
                    contentStorage.fileExists(contentId1, cleanSavedFilePath)
                ).resolves.toEqual(true);

                // check if second saved content has copy of content file
                await expect(
                    contentStorage.fileExists(
                        contentId2,
                        params2.params.image.path
                    )
                ).resolves.toEqual(true);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('ignores relative paths in content', async () => {
        // This tests deals with the unlikely case that something went
        // wrong after pasting a file into the new content. For example the
        // source could have been deleted after the image was pasted. This can
        // lead to unresolved relative paths remaining in the "path" property of
        // images, videos, etc. The library should remove references to relative
        // paths it can't resolve.
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                mockupParametersWithImage.image.path =
                    '../deletedContent/images/image.jpg';

                // save the H5P content object
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithImage,
                    mockupMetadata,
                    mockupMainLibraryName,
                    user
                );

                const newParameters = await h5pEditor.getContent(contentId);
                expect(newParameters.params.params.image.path).toEqual('');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('returns a helpful error if libraryName is invalid', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                // save the content
                await expect(
                    h5pEditor.saveOrUpdateContent(
                        undefined,
                        mockupParametersWithoutImage,
                        mockupMetadata,
                        'abc',
                        user
                    )
                ).rejects.toThrowError('invalid-main-library-name');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('throws an error if content metadata is invalid', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save the content
                await expect(
                    h5pEditor.saveOrUpdateContent(
                        undefined,
                        mockupParametersWithoutImage,
                        { someIllegal: 'attribute' } as any,
                        'H5P.GreetingCard 1.0',
                        user
                    )
                ).rejects.toThrowError('Metadata does not conform to schema.');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('saving content returns a valid H5P package', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, config } = createH5PEditor(tempDirPath);
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save the content
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    {
                        embedTypes: ['iframe'],
                        language: 'und',
                        mainLibrary: 'H5P.GreetingCard',
                        preloadedDependencies: [
                            {
                                machineName: 'H5P.GreetingCard',
                                majorVersion: 1,
                                minorVersion: 0
                            }
                        ],
                        title: 'Greeting card',
                        defaultLanguage: 'en',
                        license: 'U'
                    },
                    'H5P.GreetingCard 1.0',
                    user
                );

                // export to H5P package in a temporary file
                await withFile(
                    async ({ path: h5pFilePath }) => {
                        const writeStream =
                            fsExtra.createWriteStream(h5pFilePath);
                        const packageFinishedPromise = new Promise<void>(
                            (resolve) => {
                                writeStream.on('close', () => {
                                    resolve();
                                });
                            }
                        );
                        await h5pEditor.exportContent(
                            contentId,
                            writeStream,
                            user
                        );
                        await packageFinishedPromise;
                        writeStream.close();

                        // check if saved H5P package is valid
                        await expect(
                            validatePackage(
                                h5pEditor.libraryManager,
                                config,
                                h5pFilePath,
                                true,
                                true
                            )
                        ).resolves.toEqual(true);
                    },
                    { keep: false, postfix: '.h5p' }
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('generates AJAX urls with CSRF token', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath, {
                    withUrlGenerator: true
                });
                const user = new User();

                // install the test library so that we can work with the test content we want to upload
                await h5pEditor.libraryManager.installFromDirectory(
                    path.resolve(
                        'test/data/sample-content/H5P.GreetingCard-1.0'
                    )
                );

                // save the content
                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    mockupParametersWithoutImage,
                    mockupMetadata,
                    LibraryName.toUberName(
                        mockupMetadata.preloadedDependencies[0],
                        {
                            useWhitespace: true
                        }
                    ),
                    user
                );

                h5pEditor.setRenderer((model) => model);
                const editorModel: IEditorModel = await h5pEditor.render(
                    contentId,
                    'en',
                    user
                );
                expect(editorModel.integration.ajaxPath).toEqual(
                    '/h5p/ajax?_csrf=token&action='
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
