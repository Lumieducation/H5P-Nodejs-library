import {
    IFullLibraryName,
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
        public restricted: boolean = false,
        optionalProperties?: Partial<IInstalledLibrary>
    ) {
        if (optionalProperties) {
            Object.assign(this, optionalProperties);
        }
        this.machineName = machineName;
        this.majorVersion = majorVersion;
        this.minorVersion = minorVersion;
        this.patchVersion = patchVersion;
        this.restricted = restricted;
    }

    public author?: string;
    public coreApi?: { majorVersion: number; minorVersion: number };
    public description?: string;
    public dropLibraryCss?: { machineName: string }[];
    public dynamicDependencies?: ILibraryName[];
    public editorDependencies?: ILibraryName[];
    public embedTypes?: ('iframe' | 'div')[];
    public fullscreen?: 0 | 1;
    public h?: number;
    public license?: string;
    public metadataSettings?: { disable: 0 | 1; disableExtraTitleField: 0 | 1 };
    public preloadedCss?: IPath[];
    public preloadedDependencies?: ILibraryName[];
    public preloadedJs?: IPath[];
    public runnable: boolean;
    public title: string;
    public w?: number;

    public static fromMetadata(metadata: ILibraryMetadata): InstalledLibrary {
        return new InstalledLibrary(
            metadata.machineName,
            metadata.majorVersion,
            metadata.minorVersion,
            metadata.patchVersion,
            undefined,
            metadata
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
     * @param otherLibrary
     */
    public compare(otherLibrary: IInstalledLibrary): number {
        return (
            this.title.localeCompare(otherLibrary.title) ||
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion
        );
    }

    /**
     * Compares libraries by giving precedence to major version, then minor version, then patch version.
     * @param otherLibrary
     */
    public compareVersions(otherLibrary: IFullLibraryName): number {
        return (
            this.majorVersion - otherLibrary.majorVersion ||
            this.minorVersion - otherLibrary.minorVersion ||
            this.patchVersion - otherLibrary.patchVersion
        );
    }
}
