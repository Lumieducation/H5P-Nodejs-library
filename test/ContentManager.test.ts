import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';
import { BufferWritableMock } from 'stream-mock';
import { withDir } from 'tmp-promise';

import ContentManager from '../src/ContentManager';
import { IContentMetadata } from '../src/types';

import FileContentStorage from '../examples/implementation/FileContentStorage';
import User from '../examples/implementation/User';

describe('ContentManager', () => {
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
        title: 'Greeting card'
    };

    const mockupParameters = {
        greeting: 'Hello world!',
        image: {
            copyright: { license: 'U' },
            height: 300,
            path: 'earth.jpg',
            width: 300
        }
    };

    it('creates content and returns new contentId', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const contentManager = new ContentManager(
                    new FileContentStorage(tempDirPath)
                );

                const contentId = await contentManager.createContent(
                    mockupMetadata,
                    mockupParameters,
                    new User()
                );
                expect(contentId).toBeDefined();
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('respects the content id passed to it', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const contentManager = new ContentManager(
                    new FileContentStorage(tempDirPath)
                );

                const contentId = await contentManager.createContent(
                    mockupMetadata,
                    mockupParameters,
                    new User(),
                    '42'
                );
                expect(contentId).toEqual('42');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('creates content and returns the correct metadata and parameters', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const contentManager = new ContentManager(
                    new FileContentStorage(tempDirPath)
                );

                const user = new User();
                const contentId = await contentManager.createContent(
                    mockupMetadata,
                    mockupParameters,
                    user
                );

                await expect(
                    contentManager.contentExists(contentId)
                ).resolves.toEqual(true);

                const returnedMetadata = await contentManager.loadH5PJson(
                    contentId,
                    user
                );
                expect(returnedMetadata).toEqual(mockupMetadata);

                const returnedParameters = await contentManager.loadContent(
                    contentId,
                    user
                );
                expect(returnedParameters).toEqual(mockupParameters);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('deletes content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const contentManager = new ContentManager(
                    new FileContentStorage(tempDirPath)
                );

                const user = new User();
                const contentId = await contentManager.createContent(
                    mockupMetadata,
                    mockupParameters,
                    user
                );

                await expect(
                    contentManager.deleteContent(contentId, user)
                ).resolves.toBeUndefined();
                await expect(
                    contentManager.loadH5PJson(contentId, user)
                ).rejects.toThrow();
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('adds content files, returns a stream to it and deletes it again', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const contentManager = new ContentManager(
                    new FileContentStorage(tempDirPath)
                );

                const user = new User();
                const contentId = await contentManager.createContent(
                    mockupMetadata,
                    mockupParameters,
                    user
                );

                // add content file
                await contentManager.addContentFile(
                    contentId,
                    'earth.jpg',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/sample-content/content/earth.jpg'
                        )
                    ),
                    user
                );

                // check if file exists
                await expect(
                    contentManager.contentFileExists(
                        contentId,
                        'content/earth.jpg'
                    )
                ).resolves.toEqual(true);

                // check if file is in list
                const addedFiles = await contentManager.getContentFiles(
                    contentId,
                    user
                );
                expect(addedFiles).toEqual(['earth.jpg']);

                // check if added file is readable
                const fileStream = await contentManager.getContentFileStream(
                    contentId,
                    'content/earth.jpg',
                    user
                );
                const mockWriteStream1 = new BufferWritableMock();
                const onFinish1 = jest.fn();
                mockWriteStream1.on('finish', onFinish1);
                await promisepipe(fileStream, mockWriteStream1);
                expect(onFinish1).toHaveBeenCalled();

                // delete file
                await contentManager.deleteContentFile(contentId, 'earth.jpg');

                // check if list of content file is empty now
                const remainingFiles = await contentManager.getContentFiles(
                    contentId,
                    user
                );
                expect(remainingFiles).toEqual([]);

                // check if file can't be accessed any more
                await expect(
                    contentManager.getContentFileStream(
                        contentId,
                        'content/earth.jpg',
                        user
                    )
                ).rejects.toThrow();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
