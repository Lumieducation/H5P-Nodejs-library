import H5pError from './helpers/H5pError';
import { ILibraryName } from './types';

export default class LibraryName implements ILibraryName {
    /**
     * Constructs the object and validates the parameters.
     * @throws errors if the validation fails
     */
    constructor(
        public machineName: string,
        public majorVersion: number,
        public minorVersion: number
    ) {
        if (typeof this.majorVersion === 'string') {
            this.majorVersion = Number.parseInt(this.majorVersion, 10);
        }
        if (typeof this.minorVersion === 'string') {
            this.minorVersion = Number.parseInt(this.minorVersion, 10);
        }
        LibraryName.validate(this);
    }

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
     * Creates a library object from a library name. Also validates the ubername
     * to protect against attempts to manipulate the server by creating library
     * names.
     * @param ubername The library name in a format "H5P.Example-1.0" or
     * "H5P.Example 1.0" (see options)
     * @param restricted true if the library is restricted
     * @param useWhitespace true if the parser should accept names like
     * "H5P.Library 1.0"
     * @param useHyphen true if the parser should accept names like
     * "H5P.Library-1.0"
     * @returns undefined if the name could not be parsed
     * @throws H5pError with 400 when the ubername is invalid
     */
    public static fromUberName(
        ubername: string,
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
                ? /^([\w.]+)[-\s](\d+)\.(\d+)$/i
                : options.useHyphen
                ? /^([\w.]+)-(\d+)\.(\d+)$/i
                : /^([\w.]+)\s(\d+)\.(\d+)$/i;

        const result = nameRegex.exec(ubername);

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
                    name: ubername
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
     * Returns the ubername for a library (e.g. H5P.ExampleLibrary-1.0).
     * Also validates the ubername to protect against attempts to manipulate the
     * server by creating invalid ubernames.
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
            const ubername = `${libraryName.machineName}-${libraryName.majorVersion}.${libraryName.minorVersion}`;
            if (!/^([\w.]+)-(\d+)\.(\d+)$/.test(ubername)) {
                throw new Error(
                    `Ubername ${ubername} is not a valid ubername with hyphen separator.`
                );
            }
            return ubername;
        }
        if (options.useWhitespace) {
            const ubername = `${libraryName.machineName} ${libraryName.majorVersion}.${libraryName.minorVersion}`;
            if (!/^([\w.]+)\s(\d+)\.(\d+)$/.test(ubername)) {
                throw new Error(
                    `Ubername ${ubername} is not a valid ubername with whitespace separator.`
                );
            }
            return ubername;
        }
        throw new Error(
            'You must specify either the useHyphen or useWhitespace option'
        );
    }

    /**
     * Checks if the library name is valid.
     * @throws errors if the library name is invalid
     */
    public static validate(library: ILibraryName): void {
        LibraryName.validateMachineName(library.machineName);
        if (
            typeof library.majorVersion !== 'number' ||
            Number.isNaN(library.majorVersion)
        ) {
            throw new Error(
                `Major version of library is invalid. Only numbers are allowed`
            );
        }
        if (
            typeof library.minorVersion !== 'number' ||
            Number.isNaN(library.minorVersion)
        ) {
            throw new Error(
                `Minor version of library is invalid. Only numbers are allowed`
            );
        }
    }

    /**
     * Throws an error if the machine name is not valid.
     * @param machineName
     */
    public static validateMachineName(machineName: string): void {
        if (!/^[\w.]+$/i.test(machineName)) {
            throw new Error(`Machine name "${machineName}" is illegal.`);
        }
    }
}
