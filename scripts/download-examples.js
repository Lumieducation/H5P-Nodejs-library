const axios = require('axios');
const { accessSync, createWriteStream } = require('fs');
const { readFile, access, mkdir } = require('fs/promises');
const path = require('path');

/**
 * Downloads H5P packages from the H5P Hub for testing purposes.
 * @param contentTypeCacheFilePath Path to the JSON file in the test directory containing the content types to download (should be a copy of the one obtained by the ContentTypeCache from the Hub)
 * @param directoryPath Path to a directory on the disk to save the downloaded H5P to.
 */
const downloadH5pPackages = async (contentTypeCacheFilePath, directoryPath) => {
    const machineNames = (
        await JSON.parse(await readFile(contentTypeCacheFilePath, 'utf-8'))
    ).contentTypes.map((ct) => ct.id);

    console.log(`Found ${machineNames.length} packages.`);

    // Create the directory if it doesn't exist
    try {
        await access(directoryPath);
    }
    catch {
        await mkdir(directoryPath, { recursive: true });
    }

    // Counts how many downloads have been finished
    let downloadsFinished = 0;

    // Promise.all allows parallel downloads
    return await Promise.all(
        machineNames
            .filter((machineName) => machineName !== 'H5P.IFrameEmbed') // IFrameEmbed is broken and is deprecated
            .filter((machineName) => {
                try {
                    accessSync(
                        path.join(directoryPath, `${machineName}.h5p`)
                    );
                } catch {
                    return true;
                }
                downloadsFinished += 1;
                console.log(
                    `${downloadsFinished}/${machineNames.length} ${machineName}.h5p has already been downloaded. Skipping!`
                );
                return false;
            })
            .map((contentType) =>
                axios.default
                    .get(`http://api.h5p.org/v1/content-types/${contentType}`, {
                        responseType: 'stream'
                    })
                    .then((response) => {
                        return new Promise((resolve) => {
                            const file = createWriteStream(
                                `${directoryPath}/${contentType}.h5p`
                            );
                            file.on('finish', () => {
                                downloadsFinished += 1;
                                console.log(
                                    `Downloaded example ${downloadsFinished}/${machineNames.length}: ${contentType}.h5p`
                                );
                                resolve(`${contentType}.h5p`);
                            });
                            response.data.pipe(file);
                        });
                    })
                    .catch((error) => {
                        downloadsFinished += 1;
                        console.error(
                            `${downloadsFinished}/${machineNames.length} Error downloading ${contentType}: ${error.response.status} ${error.response.statusText}`
                        );
                        return Promise.reject();
                    })
            )
    );
};

const contentTypeCacheFile = path.resolve(process.argv[2]);
const directory = path.resolve(process.argv[3]);

console.log('Downloading content type examples from H5P Hub.');
console.log(`Using content types from ${contentTypeCacheFile}`);
console.log(`Downloading to ${directory}`);

downloadH5pPackages(contentTypeCacheFile, directory)
    .then((files) => {
        console.log(`Download finished! Downloaded ${files.length} files.`);
    })
    .catch((error) => {
        console.log(`There was an error downloading files: ${error}`);
        process.exit(1);
    });
