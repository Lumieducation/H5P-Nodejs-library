import fsExtra from 'fs-extra';
import path from 'path';
import { withDir } from 'tmp-promise';

import User from '../examples/implementation/User';

import { H5PEditor, TranslationService } from '../src';

import DirectoryTemporaryFileStorage from '../examples/implementation/DirectoryTemporaryFileStorage';
import EditorConfig from '../examples/implementation/EditorConfig';
import FileContentStorage from '../examples/implementation/FileContentStorage';
import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';
import InMemoryStorage from '../examples/implementation/InMemoryStorage';

describe('H5PEditor.saveH5P()', () => {
    it('can save all real-world examples from the content-type-hub', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const contentPath = `${__dirname}/data/hub-content-extracted`;
                const contentTypes = await fsExtra.readdir(contentPath);

                contentTypes.forEach(async contentType => {
                    const metadata = require(`${contentPath}/${contentType}/h5p.json`);
                    const parameters = require(`${contentPath}/${contentType}/content/content.json`);

                    await fsExtra.copy(
                        path.join(contentPath, contentType),
                        path.join(tempDirPath, contentType),
                        {
                            overwrite: true,
                            recursive: true
                        }
                    );
                    const h5pEditor = new H5PEditor(
                        new InMemoryStorage(),
                        new EditorConfig(new InMemoryStorage()),
                        new FileLibraryStorage(
                            path.join(tempDirPath, contentType)
                        ),
                        new FileContentStorage(
                            path.join(tempDirPath, 'content')
                        ),
                        new TranslationService({}),
                        () => '',
                        new DirectoryTemporaryFileStorage(
                            path.join(tempDirPath, 'tmp')
                        )
                    );
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
