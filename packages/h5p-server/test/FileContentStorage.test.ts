import fsExtra from 'fs-extra';
import { Readable } from 'stream';
import { withDir } from 'tmp-promise';

import FileContentStorage from '../src/implementation/fs/FileContentStorage';
import { IContentMetadata } from '../src/types';

import User from './User';

describe('FileContentStorage (repository that saves content objects to a local directory)', () => {
    function createMetadataMock(): IContentMetadata {
        return {
            embedTypes: ['iframe'],
            language: '',
            mainLibrary: '',
            preloadedDependencies: [],
            title: '',
            defaultLanguage: 'en',
            license: 'U'
        };
    }

    it('assigns a new id for new content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const storage = new FileContentStorage(tempDirPath);
                let id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    new User()
                );
                expect(typeof id).toBe('number');
                id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    new User(),
                    null
                );
                expect(typeof id).toBe('number');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('throws an error if the passed path is not writable', async () => {
        expect(() => new FileContentStorage('/*:%illegal-path')).toThrow();
    });

    it('throws an error if you add content to non-existent contentId', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const storage = new FileContentStorage(tempDirPath);
                const filename = 'test.png';
                const user = new User();

                const id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    user
                );
                await expect(
                    storage.addFile(id + 1, 'test.png', null, user)
                ).rejects.toThrow(
                    'storage-file-implementations:add-file-content-not-found'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('deletes content', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const storage = new FileContentStorage(tempDirPath);
                const id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    user
                );
                expect((await fsExtra.readdir(tempDirPath)).length).toEqual(1);
                await storage.deleteContent(id, user);
                expect((await fsExtra.readdir(tempDirPath)).length).toEqual(0);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('Throws an error if non-existent content is deleted', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const storage = new FileContentStorage(tempDirPath);
                await expect(
                    storage.deleteContent('1', new User())
                ).rejects.toEqual(
                    new Error(
                        'storage-file-implementations:delete-content-not-found'
                    )
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('correctly checks if content exists', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const storage = new FileContentStorage(tempDirPath);
                const id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    user
                );
                await expect(storage.contentExists(id)).resolves.toEqual(true);
                const unusedId = 'unused-123';
                await expect(storage.contentExists(unusedId)).resolves.toEqual(
                    false
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('gets a list of content files', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const storage = new FileContentStorage(tempDirPath);
                const id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    user
                );
                const stream1 = new Readable();
                // eslint-disable-next-line no-underscore-dangle
                stream1._read = () => {};
                stream1.push('dummy');
                stream1.push(null);
                await storage.addFile(id, 'file1.txt', stream1, user);
                const stream2 = new Readable();
                // eslint-disable-next-line no-underscore-dangle
                stream2._read = () => {};
                stream2.push('dummy');
                stream2.push(null);
                await storage.addFile(id, 'file2.txt', stream2, user);
                const files = await storage.listFiles(id, user);
                expect(files.sort()).toMatchObject(['file1.txt', 'file2.txt']);
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it("doesn't accept relative paths", async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const user = new User();
                const storage = new FileContentStorage(tempDirPath);
                const id = await storage.addContent(
                    createMetadataMock(),
                    {},
                    user
                );
                const stream1 = new Readable();
                // eslint-disable-next-line no-underscore-dangle
                stream1._read = () => {};
                stream1.push('dummy');
                stream1.push(null);
                await expect(
                    storage.addFile(id, '../file1.txt', stream1, user)
                ).rejects.toThrow(
                    'storage-file-implementations:illegal-relative-filename'
                );
                await expect(
                    storage.fileExists(id, '../file1.txt')
                ).rejects.toThrow(
                    'storage-file-implementations:illegal-relative-filename'
                );
                await expect(
                    storage.deleteFile(id, '../file1.txt')
                ).rejects.toThrow(
                    'storage-file-implementations:illegal-relative-filename'
                );
                expect(
                    storage.getFileStream(id, '../file1.txt', user)
                ).rejects.toThrow(
                    'storage-file-implementations:illegal-relative-filename'
                );
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
