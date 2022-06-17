import { dir, DirectoryResult } from 'tmp-promise';

import FileContentUserDataStorage from '../../src/implementation/fs/FileContentUserDataStorage';
import { IContentUserDataStorage } from '../../src/types';

import ContentUserDataStorageTests from './ContentUserDataStorage';

describe('FileContentUserDataStorage', () => {
    let dirResult: DirectoryResult;
    let dirname: string;
    let storage: IContentUserDataStorage;
    const getStorage = (): IContentUserDataStorage => storage;

    beforeEach(async () => {
        dirResult = await dir({ unsafeCleanup: true });
        dirname = dirResult.path;
        storage = new FileContentUserDataStorage(dirname);
    });

    afterEach(async () => {
        await dirResult.cleanup();
    });

    ContentUserDataStorageTests(getStorage);
});
