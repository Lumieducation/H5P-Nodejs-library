const yauzl = require('yauzl-promise');
const fs = require('fs-extra');
const path = require('path');
const promisePipe = require('promisepipe');

// eslint-disable-next-line import/prefer-default-export
export async function extractPackage(packagePath, directoryPath, { includeLibraries = false, includeContent = false, includeMetadata = false }) {
    const zipFile = await yauzl.open(packagePath);
    await zipFile.walkEntries(async (entry) => {
        if ((includeContent && entry.fileName.startsWith("content/"))
            || (includeLibraries && entry.fileName.includes("/") && !entry.fileName.startsWith("content/"))
            || (includeMetadata && entry.fileName === "h5p.json")) {
            const readStream = await entry.openReadStream();
            const writePath = path.join(directoryPath, entry.fileName);
            
            await fs.mkdirp(path.dirname(writePath));
            const writeStream = fs.createWriteStream(writePath);
            await promisePipe(readStream, writeStream);
        }
        return Promise.resolve();
    })
}
