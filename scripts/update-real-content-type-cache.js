/**
 * Downloads a current list of content types from the H5P Hub. This list is stored in the repository for mocking up the real hub without calling it 
 * too often. Run this script to update the content type cache mockup. Expect necessary changes in the tests if the hub content changes.
 */

const fs = require('fs-extra');
const path = require('path');

const H5PEditorConfig = require('../src/config');
const InMemoryStorage = require('../src/in-memory-storage');
const ContentTypeCache = require('../src/content-type-cache');

const start = async () => {
    const keyValueStorage = new InMemoryStorage();
    const config = new H5PEditorConfig(keyValueStorage);
    config.uuid = "8de62c47-f335-42f6-909d-2d8f4b7fb7f5";

    const contentTypeCache = new ContentTypeCache(config, keyValueStorage)
    if ((!await contentTypeCache.forceUpdate())) {
        console.error("Could not download content type cache from H5P Hub.");
        return;
    }

    const contentTypes = await contentTypeCache._downloadContentTypesFromHub();
    await fs.writeJSON(path.resolve("test/data/content-type-cache/real-content-types.json"), { contentTypes });
    console.log("Wrote current content type cache to test/content-type-cache/real-content-types.json");
};

start();