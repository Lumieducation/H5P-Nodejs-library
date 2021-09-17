import LibraryManager from './LibraryManager';
import ContentManager from './ContentManager';
import H5pError from './helpers/H5pError';
import LibraryName from './LibraryName';
import {
    ILibraryName,
    ILibraryAdministrationOverviewItem,
    IInstalledLibrary
} from './types';
import Logger from './helpers/Logger';

const log = new Logger('LibraryAdministration');

/**
 * This class has methods that perform library administration, i.e, deleted
 * libraries. All parameters undergo validation and proper exceptions are thrown
 * when something went wrong.
 */
export default class LibraryAdministration {
    constructor(
        protected libraryManager: LibraryManager,
        protected contentManager: ContentManager
    ) {}

    /**
     * Deletes a library.
     *
     * Throws H5pError with HTTP status code 423 if the library cannot be
     * deleted because it is still in use.
     * @param ubername the ubername of the library to delete
     */
    public async deleteLibrary(ubername: string): Promise<void> {
        const libraryName = await this.checkLibrary(ubername);

        // Check if library can be safely deleted
        const usage = await this.contentManager.contentStorage.getUsage(
            libraryName
        );
        const dependentsCount =
            await this.libraryManager.libraryStorage.getDependentsCount(
                libraryName
            );
        if (usage.asDependency + usage.asMainLibrary + dependentsCount > 0) {
            throw new H5pError('library-used', { library: ubername }, 423);
        }
        await this.libraryManager.libraryStorage.deleteLibrary(libraryName);
    }

    /**
     * Lists all installed libraries. This operation can be relatively costly
     * as it has to go through the whole library metadata and calculate
     * usage of libraries across all content objects on the system.
     */
    public async getLibraries(): Promise<ILibraryAdministrationOverviewItem[]> {
        log.debug('Getting all libraries');
        const libraryNames =
            await this.libraryManager.libraryStorage.getInstalledLibraryNames();
        const libraryMetadata = (
            await Promise.all(
                libraryNames.map((lib) => this.libraryManager.getLibrary(lib))
            )
        ).sort((a, b) => a.compare(b));

        log.debug('Getting all dependents count');
        const dependents =
            await this.libraryManager.libraryStorage.getAllDependentsCount();

        return Promise.all(
            libraryMetadata.map(async (metadata) => {
                log.debug(
                    `Getting usage data of ${LibraryName.toUberName(metadata)}`
                );
                const usage = await this.contentManager.contentStorage.getUsage(
                    metadata
                );
                const dependentsCount =
                    dependents[LibraryName.toUberName(metadata)] ?? 0;
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
                    // eslint-disable-next-line eqeqeq
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

    /**
     * Returns detailed information about the library and its use.
     * @param ubername
     */
    public async getLibrary(ubername: string): Promise<
        IInstalledLibrary & {
            /**
             * How many libraries depend on this library.
             */
            dependentsCount: number;
            /**
             * How often this library is used in content objects, but only as a
             * dependency.
             */
            instancesAsDependencyCount: number;
            /**
             * How often this library is used in content object as main library.
             */
            instancesCount: number;
            /**
             * Whether the library is an addon.
             */
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

    /**
     * Changes the restricted status of a library
     * @param ubername the library's ubername you want to change
     * @param restricted the new value
     */
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
            throw new H5pError(
                'invalid-ubername-pattern',
                { name: ubername },
                400
            );
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
