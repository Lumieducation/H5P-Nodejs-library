import {
    IInstalledLibrary,
    ILibraryMetadata,
    ILibraryName,
    IPath
} from './types';

/**
 * Stores information about installed H5P libraries.
 */
export default class InstalledLibrary implements IInstalledLibrary {
    constructor(
        public machineName: string,
        public majorVersion: number,
        public minorVersion: number,
        public patchVersion: number,
        public restricted: boolean = false
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

    public author?: string;
    public coreApi?: { majorVersion: number; minorVersion: number };
    public description?: string;
    // tslint:disable-next-line: prefer-array-literal
    public dropLibraryCss?: Array<{ machineName: string }>;
    public dynamicDependencies?: ILibraryName[];
    public editorDependencies?: ILibraryName[];
    // tslint:disable-next-line: prefer-array-literal
    public embedTypes?: Array<'iframe' | 'div'>;
    public fullscreen?: 0 | 1;
    public h?: number;
    public id: number;
    public libraryId: number;
    public license?: string;
    public metadataSettings?: { disable: 0 | 1; disableExtraTitleField: 0 | 1 };
    public preloadedCss?: IPath[];
    public preloadedDependencies?: ILibraryName[];
    public preloadedJs?: IPath[];
    public runnable: boolean;
    public title: string;
    public w?: number;

    public static fromMetadata(name: ILibraryMetadata): InstalledLibrary {
        return new InstalledLibrary(
            name.machineName,
            name.majorVersion,
            name.minorVersion,
            name.patchVersion,
            undefined
        );
    }

    public static fromName(name: ILibraryName): InstalledLibrary {
        return new InstalledLibrary(
            name.machineName,
            name.majorVersion,
            name.minorVersion,
            undefined,
            undefined
        );
    }

    /**
     * Compares libraries by giving precedence to title, then major version, then minor version
     * @param {InstalledLibrary} otherLibrary
     */
    public compare(otherLibrary: InstalledLibrary): number {
        return (
            this.title.localeCompare(otherLibrary.title) ||
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion
        );
    }

    /**
     * Compares libraries by giving precedence to major version, then minor version, then patch version.
     * @param {InstalledLibrary} otherLibrary
     */
    public compareVersions(otherLibrary: InstalledLibrary): number {
        return (
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion ||
            this.patchVersion - otherLibrary.patchVersion
        );
    }
}
