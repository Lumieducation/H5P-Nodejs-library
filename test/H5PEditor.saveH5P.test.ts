import fsExtra from 'fs-extra';
import { withDir } from 'tmp-promise';

import User from '../examples/implementation/User';

import { createH5PEditor } from './helpers/H5PEditor';

describe('H5PEditor.saveH5P()', () => {
    it('can save all real-world examples from the content-type-hub', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath);
                const user = new User();

                const contentPath = `${__dirname}/data/hub-content-extracted`;

                const contentTypes = await fsExtra.readdir(contentPath);

                contentTypes.forEach(async contentType => {
                    const metadata = require(`${contentPath}/${contentType}/h5p.json`);
                    const parameters = require(`${contentPath}/${contentType}/content/content.json`);

                    await expect(
                        h5pEditor.saveH5P(
                            undefined,
                            parameters,
                            metadata,
                            h5pEditor.getUbernameFromH5pJson(metadata),
                            user
                        )
                    ).resolves.toBeDefined();
                });
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
