import H5pError from './helpers/H5pError';
import { ILibraryName } from './types';

export default class LibraryName implements ILibraryName {
    constructor(
        public machineName: string,
        public majorVersion: number,
        public minorVersion: number
    ) {}

    /**
     * Checks if two libraries are identical.
     * @param library1
     * @param library2
     */
    public static equal(
        library1: ILibraryName,
        library2: ILibraryName
    ): boolean {
        return (
            library1.machineName === library2.machineName &&
            library1.majorVersion === library2.majorVersion &&
            library1.minorVersion === library2.minorVersion
        );
    }

    /**
     * Creates a library object from a library name
     * @param libraryName The library name in a format "H5P.Example-1.0" or "H5P.Example 1.0" (see options)
     * @param restricted true if the library is restricted
     * @param useWhitespace true if the parser should accept names like "H5P.Library 1.0"
     * @param useHyphen true if the parser should accept names like "H5P.Library-1.0"
     * @returns undefined if the name could not be parsed
     */
    public static fromUberName(
        libraryName: string,
        options: {
            useHyphen?: boolean;
            useWhitespace?: boolean;
        } = {
            useHyphen: true,
            useWhitespace: false
        }
    ): ILibraryName {
        if (!options.useHyphen && !options.useWhitespace) {
            throw new Error(
                'You must call fromUberName with either the useHyphen or useWhitespace option, or both!'
            );
        }
        const nameRegex: RegExp =
            options.useHyphen && options.useWhitespace
                ? /([^\s]+)[-\s](\d+)\.(\d+)/
                : options.useHyphen
                ? /([^\s]+)-(\d+)\.(\d+)/
                : /([^\s]+)\s(\d+)\.(\d+)/;

        const result = nameRegex.exec(libraryName);

        if (!result) {
            let example = '';
            if (options.useHyphen && options.useWhitespace) {
                example = 'H5P.Example-1.0 or H5P.Example 1.0';
            } else if (options.useHyphen && !options.useWhitespace) {
                example = 'H5P.Example-1.0';
            } else {
                example = 'H5P.Example 1.0';
            }

            throw new H5pError(
                'invalid-ubername-pattern',
                {
                    example,
                    name: libraryName
                },
                400
            );
        }

        return new LibraryName(
            result[1],
            Number.parseInt(result[2], 10),
            Number.parseInt(result[3], 10)
        );
    }

    /**
     * Returns the directory name that is used for this library (e.g. H5P.ExampleLibrary-1.0)
     */
    public static toUberName(
        libraryName: ILibraryName,
        options: {
            useHyphen?: boolean;
            useWhitespace?: boolean;
        } = {
            useHyphen: true,
            useWhitespace: false
        }
    ): string {
        if (options.useHyphen) {
            return `${libraryName.machineName}-${libraryName.majorVersion}.${libraryName.minorVersion}`;
        }
        if (options.useWhitespace) {
            return `${libraryName.machineName} ${libraryName.majorVersion}.${libraryName.minorVersion}`;
        }
        return '';
    }
}
