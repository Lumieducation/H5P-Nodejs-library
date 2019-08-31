/**
 * Returns a list of top-level directories in the zip file
 * @param {IZipEntry[]} zipEntries 
 * @returns {string[]} list of top-level directories
 */
function getTopLevelDirectories(zipEntries) {
    return Object.keys(zipEntries.reduce((directorySet, entry) => {
        const split = entry.entryName.split("/");
        if (split.length > 1) {
            directorySet[split[0]] = true;
        }
        return directorySet;
    }, {}));
}

module.exports = {
    getTopLevelDirectories
}