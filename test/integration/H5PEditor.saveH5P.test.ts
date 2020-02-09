import fsExtra from 'fs-extra';
import path from 'path';
import { withDir } from 'tmp-promise';

import User from '../../examples/implementation/User';

import { createH5PEditor } from '../helpers/H5PEditor';

describe('H5PEditor.saveH5P()', () => {
    it('can save all real-world examples from the content-type-hub', async done => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const contentPath = `${__dirname}/../data/hub-content`;
                const contentTypes = await fsExtra.readdir(contentPath);

                Promise.all(
                    contentTypes.map(async contentType => {
                        const { h5pEditor } = createH5PEditor(tempDirPath);

                        const {
                            metadata,
                            parameters
                        } = await h5pEditor.uploadPackage(
                            await fsExtra.readFile(
                                path.join(contentPath, contentType)
                            ),
                            user
                        );

                        await h5pEditor.saveH5P(
                            undefined,
                            parameters,
                            metadata,
                            h5pEditor.getUbernameFromMetadata(metadata),
                            user
                        );

                        return;
                    })
                ).then(() => done());
            },
            { keep: false, unsafeCleanup: true }
        );
    }, 50000);
});
