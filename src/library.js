/**
 * Stores information about H5P libraries.
 */
class Library {
    constructor(machineName, major, minor, patch, restricted = false) {
        this.machineName = machineName;
        this.majorVersion = major;
        this.minorVersion = minor;
        this.patchVersion = patch;
        this.id = undefined;
        this.title = undefined;
        this.runnable = undefined;
        this.restricted = restricted;
    }

    /**
     * Compares libraries by giving precedence to title, then major version, then minor version 
     * @param {Library} otherLibrary 
     */
    compare(otherLibrary) {
        return this.title.localeCompare(otherLibrary.title) || this.majorVersion - otherLibrary.majorVersion || this.minorVersion - otherLibrary.minorVersion;
    }

    /**
     * Compares libraries by giving precedence to major version, then minor version, then patch version. 
     * @param {Library} otherLibrary 
     */
    compareVersions(otherLibrary) {
        return this.majorVersion - otherLibrary.majorVersion || this.minorVersion - otherLibrary.minorVersion || this.patchVersion - otherLibrary.patchVersion;
    }

    /**
     * Returns the directory name that is used for this library (e.g. H5P.ExampleLibrary-1.0)
     */
    getDirName() {
        return `${this.machineName}-${this.majorVersion}.${this.minorVersion}`;
    }

    /**
     * Creates a library object from a library name
     * @param {string} libraryName The library name in a format H5P.Example-1.0
     * @param {boolean} restricted true if the library is restricted 
     * @returns {Library}
     */
    static createFromName(libraryName, restricted) {
        const nameRegex = /([^\s]+)-(\d+)\.(\d+)/;
        const result = nameRegex.exec(libraryName);

        if (!result) {
            throw new Error(`Library name ${libraryName} is invalid.`);
        }

        return new Library(result[1], result[2], result[3], undefined, restricted)
    }

    /**
     * Creates a library object from a library metadata object (contents of library.json).
     * @param {any} metadata The library metadata as in library.json
     * @param {boolean} restricted true if the library is restricted 
     * @returns {Library}
     */
    static createFromMetadata(metadata, restricted) {
        return new Library(metadata.machineName, metadata.majorVersion, metadata.minorVersion, metadata.patchVersion, restricted);
    }
}

module.exports = Library;