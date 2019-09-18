import { IDependency, IMetadata } from './types';

/**
 * Stores information about H5P libraries.
 */
export default class Library implements IDependency {
    /**
     * Creates a library object from a library name
     * @param {string} libraryName The library name in a format H5P.Example-1.0
     * @param {boolean} restricted true if the library is restricted
     * @returns {Library}
     */
    public static createFromName(
        libraryName: string,
        restricted?: boolean
    ): Library {
        const nameRegex: RegExp = /([^\s]+)-(\d+)\.(\d+)/;
        const result: RegExpExecArray = nameRegex.exec(libraryName);

        if (!result) {
            throw new Error(`Library name ${libraryName} is invalid.`);
        }

        return new Library(
            result[1],
            Number.parseInt(result[2], 10),
            Number.parseInt(result[3], 10),
            undefined,
            restricted
        );
    }

    /**
     * Creates a library object from a library metadata object (contents of library.json).
     * @param {any} metadata The library metadata as in library.json
     * @param {boolean} restricted true if the library is restricted
     * @returns {Library}
     */
    public static createFromMetadata(
        metadata: IMetadata,
        restricted?: boolean
    ): Library {
        return new Library(
            metadata.machineName,
            metadata.majorVersion,
            metadata.minorVersion,
            metadata.patchVersion,
            restricted
        );
    }

    public machineName: string;
    public majorVersion: number;
    public minorVersion: number;
    public patchVersion: number;
    public preloadedDependencies: IDependency[];

    private id: string;
    private title: string;
    private runnable: boolean;
    private restricted: boolean;

    constructor(
        machineName: string,
        majorVersion: number,
        minorVersion: number,
        patchVersion?: number,
        restricted: boolean = false
    ) {
        this.machineName = machineName;
        this.majorVersion = majorVersion;
        this.minorVersion = minorVersion;
        this.patchVersion = patchVersion;
        this.id = undefined;
        this.title = undefined;
        this.runnable = undefined;
        this.restricted = restricted;
    }

    /**
     * Compares libraries by giving precedence to title, then major version, then minor version
     * @param {Library} otherLibrary
     */
    public compare(otherLibrary: Library): number {
        return (
            this.title.localeCompare(otherLibrary.title) ||
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion
        );
    }

    /**
     * Compares libraries by giving precedence to major version, then minor version, then patch version.
     * @param {Library} otherLibrary
     */
    public compareVersions(otherLibrary: Library): number {
        return (
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion ||
            this.patchVersion - otherLibrary.patchVersion
        );
    }

    /**
     * Returns the directory name that is used for this library (e.g. H5P.ExampleLibrary-1.0)
     */
    public getDirName(): string {
        return `${this.machineName}-${this.majorVersion}.${this.minorVersion}`;
    }
}
