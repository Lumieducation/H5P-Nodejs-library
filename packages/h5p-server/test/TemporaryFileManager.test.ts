import fsExtra from 'fs-extra';
import mockdate from 'mockdate';
import path from 'path';
import promisepipe from 'promisepipe';
import { WritableStreamBuffer } from 'stream-buffers';
import { withDir } from 'tmp-promise';

import H5PConfig from '../src/implementation/H5PConfig';
import DirectoryTemporaryFileStorage from '../src/implementation/fs/DirectoryTemporaryFileStorage';
import TemporaryFileManager from '../src/TemporaryFileManager';
import { LaissezFairePermissionSystem } from '../src';

import User from './User';

describe('TemporaryFileManager', () => {
    it('stores files and lets you retrieve them', async () => {
        const config = new H5PConfig(null);
        config.temporaryFileLifetime = 100000;
        const user = new User();

        await withDir(
            async ({ path: tempDirPath }) => {
                const tmpManager = new TemporaryFileManager(
                    new DirectoryTemporaryFileStorage(tempDirPath),
                    config,
                    new LaissezFairePermissionSystem()
                );
                const newFilename = await tmpManager.addFile(
                    'real-content-types.json',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/content-type-cache/real-content-types.json'
                        )
                    ),
                    user
                );
                expect(newFilename).toBeDefined();

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
    it('stores two files with same filename under unique names', async () => {
        const config = new H5PConfig(null);
        config.temporaryFileLifetime = 100000;
        const user = new User();

        await withDir(
            async ({ path: tempDirPath }) => {
                const tmpManager = new TemporaryFileManager(
                    new DirectoryTemporaryFileStorage(tempDirPath),
                    config,
                    new LaissezFairePermissionSystem()
                );
                const newFilename1 = await tmpManager.addFile(
                    'real-content-types.json',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/content-type-cache/real-content-types.json'
                        )
                    ),
                    user
                );
                const newFilename2 = await tmpManager.addFile(
                    'real-content-types.json',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/content-type-cache/real-content-types.json'
                        )
                    ),
                    user
                );

                expect(newFilename1 === newFilename2).toBeFalsy();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
    it('deletes expired files, but keep unexpired ones', async () => {
        const config = new H5PConfig(null);
        config.temporaryFileLifetime = 100000;
        const user = new User();
        try {
            await withDir(
                async ({ path: tempDirPath }) => {
                    const tmpManager = new TemporaryFileManager(
                        new DirectoryTemporaryFileStorage(tempDirPath),
                        config,
                        new LaissezFairePermissionSystem()
                    );

                    // add files that will expire
                    const expiringFilename1 = await tmpManager.addFile(
                        'dir/expiring.json',
                        fsExtra.createReadStream(
                            path.resolve(
                                'test/data/content-type-cache/real-content-types.json'
                            )
                        ),
                        user
                    );
                    const expiringFilename2 = await tmpManager.addFile(
                        'expiring.json',
                        fsExtra.createReadStream(
                            path.resolve(
                                'test/data/content-type-cache/real-content-types.json'
                            )
                        ),
                        user
                    );

                    // move the clock to add second file
                    mockdate.set(Date.now() + config.temporaryFileLifetime / 2);

                    // add second file that won't expire
                    const nonExpiringFilename = await tmpManager.addFile(
                        'dir/non-expiring.json',
                        fsExtra.createReadStream(
                            path.resolve(
                                'test/data/content-type-cache/real-content-types.json'
                            )
                        ),
                        user
                    );

                    // move the clock to expire the file
                    mockdate.set(
                        Date.now() + config.temporaryFileLifetime / 2 + 1000
                    );

                    // remove expired files
                    await tmpManager.cleanUp();

                    // check if only one file remains
                    await expect(
                        tmpManager.getFileStream(expiringFilename1, user)
                    ).rejects.toThrow();
                    await expect(
                        tmpManager.getFileStream(expiringFilename2, user)
                    ).rejects.toThrow();
                    const stream = await tmpManager.getFileStream(
                        nonExpiringFilename,
                        user
                    );
                    if ((stream as any).close) {
                        (stream as any).close(); // we have to close the stream, as the file must be deleted later
                    }
                },
                { keep: false, unsafeCleanup: true }
            );
        } finally {
            mockdate.reset();
        }
    });
    it('prevents unauthorized users from accessing a file', async () => {
        const config = new H5PConfig(null);
        config.temporaryFileLifetime = 100000;
        const user1 = new User();
        const user2 = new User();
        user2.id = '2';

        await withDir(
            async ({ path: tempDirPath }) => {
                const tmpManager = new TemporaryFileManager(
                    new DirectoryTemporaryFileStorage(tempDirPath),
                    config,
                    new LaissezFairePermissionSystem()
                );
                const newFilename1 = await tmpManager.addFile(
                    'real-content-types.json',
                    fsExtra.createReadStream(
                        path.resolve(
                            'test/data/content-type-cache/real-content-types.json'
                        )
                    ),
                    user1
                );

                await expect(
                    tmpManager.getFileStream(newFilename1, user2)
                ).rejects.toThrow();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
