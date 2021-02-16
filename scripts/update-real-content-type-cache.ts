/**
 * Downloads a current list of content types from the H5P Hub. This list is stored in the repository for mocking up the real hub without calling it
 * too often. Run this script to update the content type cache mockup. Expect necessary changes in the tests if the hub content changes.
 */

import * as fsExtra from 'fs-extra';
import * as path from 'path';

import ContentTypeCache from '../packages/h5p-server/src/ContentTypeCache';
import H5PConfig from '../packages/h5p-server/src/implementation/H5PConfig';
import InMemoryStorage from '../packages/h5p-server/src/implementation/InMemoryStorage';
import { IKeyValueStorage } from '../packages/h5p-server/src/types';

const start = async () => {
    const keyValueStorage: IKeyValueStorage = new InMemoryStorage();
    const config: H5PConfig = new H5PConfig(keyValueStorage);
    config.uuid = '8de62c47-f335-42f6-909d-2d8f4b7fb7f5';

    const contentTypeCache: ContentTypeCache = new ContentTypeCache(
        config,
        keyValueStorage
    );
    if (!(await contentTypeCache.forceUpdate())) {
        console.error('Could not download content type cache from H5P Hub.');
        return;
    }

    const contentTypes: any = await contentTypeCache.downloadContentTypesFromHub();
    await fsExtra.writeJSON(
        path.resolve('test/data/content-type-cache/real-content-types.json'),
        { contentTypes }
    );
    console.log(
        'Wrote current content type cache to test/content-type-cache/real-content-types.json'
    );
};

start();
