import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';
import { WritableStreamBuffer } from 'stream-buffers';

import { withDir } from 'tmp-promise';
import TemporaryFileManager from '../src/TemporaryFileManager';

import DirectoryTemporaryFileStorage from '../examples/implementation/DirectoryTemporaryFileStorage';
import EditorConfig from '../examples/implementation/EditorConfig';
import User from '../examples/implementation/User';

describe('TemporaryFileManager', () => {
    it('stores files and lets you retrieve them', async () => {
        const config = new EditorConfig(null);
        config.temporaryFileLifetime = 100000;
        const user = new User();

        await withDir(
            async ({ path: tempDirPath }) => {
                const tmpManager = new TemporaryFileManager(
                    new DirectoryTemporaryFileStorage(tempDirPath),
                    config
                );
                const newFilename = await tmpManager.saveFile(
                    'real-content-types.json',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/content-type-cache/real-content-types.json'
                        )
                    ),
                    user
                );
                const copiedStream = await tmpManager.getFileStream(
                    newFilename,
                    user
                );
                expect(copiedStream).toBeDefined();

                // we do nothing with the write stream, as we just check if the file is fully readable
                const writeStream = new WritableStreamBuffer({
                    incrementAmount: 100 * 1024,
                    initialSize: 500 * 1024
                });
                await expect(
                    promisepipe(copiedStream, writeStream)
                ).resolves.toBeDefined();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
    it('stores two files with same filename under unique names', async () => {});
    it('deletes files after expiration time', async () => {});
    it('prevents unauthorized users from accessing a file', async () => {});
});
