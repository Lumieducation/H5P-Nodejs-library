import fsExtra from 'fs-extra';
import path from 'path';
import { withDir } from 'tmp-promise';

import User from './User';

import { createH5PEditor } from './helpers/H5PEditor';

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
                const { h5pEditor, temporaryStorage } = createH5PEditor(
                    tempDirPath
                );
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
});
