import H5pError from './helpers/H5pError';
import { IDependency, ILibraryJson } from './types';

/**
 * Stores information about H5P libraries.
 */
export default class Library implements IDependency {
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

    public id: number;
    public machineName: string;
    public majorVersion: number;
    public minorVersion: number;
    public patchVersion: number;
    public preloadedDependencies?: IDependency[];
    public restricted: boolean;
    public runnable: boolean;
    public title: string;

    /**
     * Creates a library object from a library metadata object (contents of library.json).
     * @param {any} metadata The library metadata as in library.json
     * @param {boolean} restricted true if the library is restricted
     * @returns {Library}
     */
    public static createFromMetadata(
        metadata: ILibraryJson,
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

    /**
     * Creates a library object from a library name
     * @param {string} libraryName The library name in a format "H5P.Example-1.0" or "H5P.Example 1.0" (see options)
     * @param {boolean} restricted true if the library is restricted
     * @param {boolean} useWhitespace true if the parser should accept names like "H5P.Library 1.0"
     * @param {boolean} useHyphen true if the parser should accept names like "H5P.Library-1.0"
     * @returns {Library} undefined if the name could not be parsed
     */
    public static createFromUberName(
        libraryName: string,
        options: {
            restricted?: boolean;
            useHyphen?: boolean;
            useWhitespace?: boolean;
        } = {
            restricted: false,
            useHyphen: true,
            useWhitespace: false
        }
    ): Library {
        if (!options.useHyphen && !options.useWhitespace) {
            throw new H5pError(
                'You must call createFromUberName with either the useHyphen or useWhitespace option, or both!'
            );
        }
        const nameRegex: RegExp =
            options.useHyphen && options.useWhitespace
                ? /([^\s]+)[-\s](\d+)\.(\d+)/
                : options.useHyphen
                ? /([^\s]+)-(\d+)\.(\d+)/
                : /([^\s]+)\s(\d+)\.(\d+)/;

        const result: RegExpExecArray = nameRegex.exec(libraryName);

        if (!result) {
            return undefined;
        }

        return new Library(
            result[1],
            Number.parseInt(result[2], 10),
            Number.parseInt(result[3], 10),
            undefined,
            options.restricted
        );
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
