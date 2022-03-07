/* eslint-disable no-await-in-loop */

import fsExtra from 'fs-extra';
import path from 'path';
import { withDir, file, FileResult } from 'tmp-promise';

import User from './User';
import { createH5PEditor } from './helpers/H5PEditor';

import { ContentMetadata } from '../src/ContentMetadata';

describe('H5PEditor', () => {
    it('returns metadata and parameters of package uploads', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                const fileBuffer = fsExtra.readFileSync(
                    path.resolve('test/data/validator/valid2.h5p')
                );
                const { metadata, parameters } = await h5pEditor.uploadPackage(
                    fileBuffer,
                    user
                );

                expect(metadata).toMatchObject({
                    embedTypes: ['div'],
                    language: 'und',
                    license: 'U',
                    mainLibrary: 'H5P.GreetingCard',
                    preloadedDependencies: [
                        {
                            machineName: 'H5P.GreetingCard',
                            majorVersion: '1',
                            minorVersion: '0'
                        }
                    ],
                    title: 'Greeting card'
                });

                expect(parameters).toMatchObject({
                    greeting: 'Hello world!',
                    image: {
                        copyright: { license: 'U' },
                        height: 300,
                        // we've left out the image as the path must have been changed
                        width: 300
                    }
                });
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('adds files in uploaded package to temporary storage', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, temporaryStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                const fileBuffer = fsExtra.readFileSync(
                    path.resolve('test/data/validator/valid2.h5p')
                );
                const { parameters } = await h5pEditor.uploadPackage(
                    fileBuffer,
                    user
                );

                expect(
                    temporaryStorage.fileExists(
                        parameters.image.path.substr(
                            0,
                            parameters.image.path.length - 4
                        ),
                        user
                    )
                ).resolves.toEqual(true);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('keeps filenames short in multiple uploads', async () => {
        // Regression check for a bug in which content filenames became very
        // long when users exported and uploaded h5ps repeatedly. (#1852)
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();
                let currentFilename = path.resolve(
                    'test/data/validator/valid2.h5p'
                );
                let tempFile: FileResult;

                for (let x = 0; x < 10; x++) {
                    // Upload h5p
                    let fileBuffer = await fsExtra.readFile(currentFilename);
                    const { metadata, parameters } =
                        await h5pEditor.uploadPackage(fileBuffer, user);

                    // Delete old h5p file on disk if it exists
                    await tempFile?.cleanup();

                    const contentId = await h5pEditor.saveOrUpdateContent(
                        undefined,
                        parameters,
                        metadata,
                        ContentMetadata.toUbername(metadata),
                        user
                    );

                    // Download h5p
                    tempFile = await file({ keep: false, postfix: '.h5p' });
                    currentFilename = tempFile.path;
                    const writeStream =
                        fsExtra.createWriteStream(currentFilename);
                    const packageFinishedPromise = new Promise<void>(
                        (resolve) => {
                            writeStream.on('close', () => {
                                resolve();
                            });
                        }
                    );
                    await h5pEditor.exportContent(contentId, writeStream, user);
                    await packageFinishedPromise;
                    writeStream.close();

                    // Check if filename remains short
                    expect(
                        /^earth-[0-9a-z]+\.jpg$/i.test(parameters?.image?.path)
                    ).toBe(true);
                }
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    // context: activity contains 3 images; image1 uploaded, image2
    // copy/pasted from image1, image3 uploaded
    it(
        'returns parameters containing items 1 and 2 referencing file 1, and ' +
            'item 3 referencing file 2',
        async () => {
            await withDir(
                async ({ path: tempDirPath }) => {
                    const { h5pEditor, temporaryStorage } =
                        createH5PEditor(tempDirPath);
                    const user = new User();

                    const fileBuffer = fsExtra.readFileSync(
                        path.resolve('test/data/validator/valid3-3-images.h5p')
                    );
                    const { parameters } = await h5pEditor.uploadPackage(
                        fileBuffer,
                        user
                    );

                    const tmpFilePath1 =
                        parameters.items[0].image.params.file.path;
                    const tmpFilePath2 =
                        parameters.items[1].image.params.file.path;
                    const tmpFilePath3 =
                        parameters.items[2].image.params.file.path;
                    expect(tmpFilePath1).toEqual(tmpFilePath2);
                    expect(tmpFilePath2).not.toEqual(tmpFilePath3);

                    const files = await temporaryStorage.listFiles(user);
                    expect(files).toHaveLength(2);

                    expect(
                        temporaryStorage.fileExists(
                            tmpFilePath1.substr(0, tmpFilePath1.length - 4),
                            user
                        )
                    ).resolves.toEqual(true);

                    expect(
                        temporaryStorage.fileExists(
                            tmpFilePath3.substr(0, tmpFilePath3.length - 4),
                            user
                        )
                    ).resolves.toEqual(true);
                },
                { keep: false, unsafeCleanup: true }
            );
        }
    );

    // context: activity contains 3 images; image1 uploaded, image2
    // copy/pasted from image1, image3 uploaded
    it('saves uploaded package as new content; 2 images saved to permanent storage', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor, contentStorage } =
                    createH5PEditor(tempDirPath);
                const user = new User();

                const fileBuffer = fsExtra.readFileSync(
                    path.resolve('test/data/validator/valid3-3-images.h5p')
                );
                const { metadata, parameters } = await h5pEditor.uploadPackage(
                    fileBuffer,
                    user
                );

                const tmpFilePath1 = parameters.items[0].image.params.file.path;
                const tmpFilePath3 = parameters.items[2].image.params.file.path;

                const contentId = await h5pEditor.saveOrUpdateContent(
                    undefined,
                    parameters,
                    metadata,
                    ContentMetadata.toUbername(metadata),
                    user
                );

                const files = await contentStorage.listFiles(contentId, user);
                expect(files).toHaveLength(2);

                // get data we've stored and check if the #tmp tag has been removed from the image
                const { params } = await h5pEditor.getContent(contentId, user);

                // FIRST IMAGE =======================
                const newFilename1 = tmpFilePath1.substr(
                    0,
                    tmpFilePath1.length - 4
                );
                expect(params.params.items[0].image.params.file.path).toEqual(
                    newFilename1
                );
                // check if image is now in permanent storage
                await expect(
                    contentStorage.fileExists(contentId, newFilename1)
                ).resolves.toEqual(true);

                // SECOND IMAGE =======================
                const newFilename2 = tmpFilePath3.substr(
                    0,
                    tmpFilePath3.length - 4
                );
                expect(params.params.items[2].image.params.file.path).toEqual(
                    newFilename2
                );
                // check if image is now in permanent storage
                await expect(
                    contentStorage.fileExists(contentId, newFilename2)
                ).resolves.toEqual(true);
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
