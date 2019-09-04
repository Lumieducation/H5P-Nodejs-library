const { withDir } = require('tmp-promise');
const fs = require('fs-extra');

const FileContentStorage = require('../src/file-content-storage');

describe("FileContentStorage (repository that saves content objects to a local directory)", () => {
    it("assigns a new id for new content", async () => {
        await withDir(async ({ path: tempDirPath }) => {
            const storage = new FileContentStorage(tempDirPath);
            let id = await storage.createContent({}, {}, {});
            expect(typeof (id)).toBe('number');
            id = await storage.createContent({}, {}, {}, null);
            expect(typeof (id)).toBe('number');
        }, { keep: false, unsafeCleanup: true });
    })

    it("throws an error if the passed path is not writable", async () => {
        const storage = new FileContentStorage('/*:%illegal-path');
        await expect(storage.createContent({}, {}, {})).rejects.toBeInstanceOf(Error);
    })

    it("throws an error if you add content to non-existent contentId", async () => {
        await withDir(async ({ path: tempDirPath }) => {
            const storage = new FileContentStorage(tempDirPath);
            const filename = "test.png";

            const id = await storage.createContent({}, {}, {});
            await expect(storage.addContentFile(id + 1, "test.png", null, {})).rejects.toEqual(new Error(`Cannot add file ${filename} to content with id ${id + 1}: Content with this id does not exist.`))
        }, { keep: false, unsafeCleanup: true });
    })

    it("deletes content", async () => {
        await withDir(async ({ path: tempDirPath }) => {
            const storage = new FileContentStorage(tempDirPath);
            const id = await storage.createContent({}, {}, {});
            expect((await fs.readdir(tempDirPath)).length).toEqual(1);
            await storage.deleteContent(id, {});
            expect((await fs.readdir(tempDirPath)).length).toEqual(0);
        }, { keep: false, unsafeCleanup: true });
    })

    it("Throws an error if non-existent content is deleted", async () => {
        await withDir(async ({ path: tempDirPath }) => {
            const storage = new FileContentStorage(tempDirPath);
            await expect(storage.deleteContent(1, {})).rejects.toEqual(new Error("Cannot delete content with id 1: It does not exist."));
        }, { keep: false, unsafeCleanup: true });
    })
})
