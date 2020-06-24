import LibraryManager from './LibraryManager';
import ContentManager from './ContentManager';
import H5pError from './helpers/H5pError';
import LibraryName from './LibraryName';
import {
    ILibraryName,
    ILibraryAdministrationOverviewItem,
    IInstalledLibrary
} from './types';

export default class LibraryAdministration {
    constructor(
        protected libraryManager: LibraryManager,
        protected contentManager: ContentManager
    ) {}

    public async deleteLibrary(ubername: string): Promise<void> {
        const libraryName = await this.checkLibrary(ubername);

        // Check if library can be safely deleted
        const usage = await this.contentManager.contentStorage.getUsage(
            libraryName
        );
        const dependentsCount = await this.libraryManager.libraryStorage.getDependentsCount(
            libraryName
        );
        if (usage.asDependency + usage.asMainLibrary + dependentsCount > 0) {
            throw new H5pError('library-used', { library: ubername }, 423);
        }
        await this.libraryManager.libraryStorage.deleteLibrary(libraryName);
    }

    public async getLibraries(): Promise<ILibraryAdministrationOverviewItem[]> {
        const libraryNames = await this.libraryManager.libraryStorage.getInstalledLibraryNames();
        const libraryMetadata = (
            await Promise.all(
                libraryNames.map((lib) => this.libraryManager.getLibrary(lib))
            )
        ).sort((a, b) => a.compare(b));

        return Promise.all(
            libraryMetadata.map(async (metadata) => {
                const usage = await this.contentManager.contentStorage.getUsage(
                    metadata
                );
                const dependentsCount = await this.libraryManager.libraryStorage.getDependentsCount(
                    metadata
                );
                return {
                    title: metadata.title,
                    machineName: metadata.machineName,
                    majorVersion: metadata.majorVersion,
                    minorVersion: metadata.minorVersion,
                    patchVersion: metadata.patchVersion,
                    isAddon: metadata.addTo !== undefined,
                    restricted: metadata.restricted,
                    // We coerce the inconsistent H5P type boolean | 0 | 1 into
                    // boolean.
                    // tslint:disable-next-line: triple-equals
                    runnable: metadata.runnable == true,
                    instancesCount: usage.asMainLibrary,
                    instancesAsDependencyCount: usage.asDependency,
                    dependentsCount,
                    canBeDeleted:
                        usage.asDependency +
                            usage.asMainLibrary +
                            dependentsCount ===
                        0,
                    // libraries can be updated if there is an installed library
                    // with the same machine name but a greater version
                    canBeUpdated: libraryNames.some(
                        (ln) =>
                            ln.machineName === metadata.machineName &&
                            metadata.compareVersions(ln) < 0
                    )
                };
            })
        );
    }

    public async getLibrary(
        ubername: string
    ): Promise<
        IInstalledLibrary & {
            dependentsCount: number;
            instancesAsDependencyCount: number;
            instancesCount: number;
            isAddon: boolean;
        }
    > {
        const libraryName = await this.checkLibrary(ubername);
        const [metadata, usage, dependentsCount] = await Promise.all([
            this.libraryManager.getLibrary(libraryName),
            this.contentManager.contentStorage.getUsage(libraryName),
            this.libraryManager.libraryStorage.getDependentsCount(libraryName)
        ]);
        return {
            ...metadata,
            dependentsCount,
            instancesCount: usage.asMainLibrary,
            instancesAsDependencyCount: usage.asDependency,
            isAddon: metadata.addTo !== undefined
        };
    }

    public async restrictLibrary(
        ubername: string,
        restricted: boolean
    ): Promise<void> {
        const libraryName = await this.checkLibrary(ubername);
        if (restricted === undefined || typeof restricted !== 'boolean') {
            throw new H5pError('invalid-patch-request', undefined, 400);
        }

        await this.libraryManager.libraryStorage.updateAdditionalMetadata(
            libraryName,
            { restricted }
        );
    }

    /**
     * Checks if the ubername is valid and if the library is installed.
     * Throws H5pErrors if the name is invalid (400) or the library is not
     * installed (404).
     * @param ubername the ubername to check
     * @returns the parsed library name
     */
    private async checkLibrary(ubername: string): Promise<ILibraryName> {
        // Check for correct ubername
        const libraryName = LibraryName.fromUberName(ubername);
        if (libraryName === undefined) {
            throw new H5pError('invalid-ubername', { name: ubername }, 400);
        }

        // Check if library is installed
        if (
            !(await this.libraryManager.libraryStorage.isInstalled(libraryName))
        ) {
            throw new H5pError('library-missing', { library: ubername }, 404);
        }
        return libraryName;
    }
}
