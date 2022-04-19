/* eslint-disable no-await-in-loop */

import fsExtra from 'fs-extra';
import path from 'path';
import { withDir } from 'tmp-promise';

import { createH5PEditor } from '../helpers/H5PEditor';

import User from '../User';
import { ContentMetadata } from '../../src/ContentMetadata';

describe('H5PEditor.saveH5P()', () => {
    it('can save all real-world examples from the content-type-hub', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const contentPath = path.resolve(`test/data/hub-content`);
                const contentTypes = await fsExtra.readdir(contentPath);

                const { h5pEditor } = createH5PEditor(tempDirPath);

                for (const contentType of contentTypes) {
                    const { metadata, parameters } =
                        await h5pEditor.uploadPackage(
                            await fsExtra.readFile(
                                path.join(contentPath, contentType)
                            ),
                            user
                        );

                    await h5pEditor.saveOrUpdateContent(
                        undefined,
                        parameters,
                        metadata,
                        ContentMetadata.toUbername(metadata),
                        user
                    );
                }
            },
            { keep: false, unsafeCleanup: true }
        );
    }, 120000);
});
