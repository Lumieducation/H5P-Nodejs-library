import * as express from 'express';

import { IInstalledLibrary, IHubInfo, ILibraryName } from '../../types';
import { ILibraryManagementOverviewItem } from './LibraryManagementTypes';
import ContentManager from '../../ContentManager';
import LibraryManager from '../../LibraryManager';
import LibraryName from '../../LibraryName';
import H5pError from '../../helpers/H5pError';

export default class LibraryManagementExpressController {
    constructor(
        protected libraryManager: LibraryManager,
        protected contentManager: ContentManager
    ) {}

    /**
     * Deletes a library.
     *
     * Used HTTP status codes:
     * - 204 if successful
     * - 400 if library name is not a valid ubername
     * - 404 if library does not exist
     * - 423 if the library can't be deleted because it is used by content
     */
    public deleteLibrary = async (
        req: express.Request<{ ubername: string }>,
        res: express.Response
    ): Promise<void> => {
        const libraryName = await this.checkLibrary(req.params.ubername);

        // Check if library can be safely deleted
        const usage = await this.contentManager.contentStorage.getUsage(
            libraryName
        );
        const dependentsCount = await this.libraryManager.libraryStorage.getDependentsCount(
            libraryName
        );
        if (usage.asDependency + usage.asMainLibrary + dependentsCount > 0) {
            throw new H5pError(
                'library-used',
                { library: req.params.ubername },
                423
            );
        }
        await this.libraryManager.libraryStorage.deleteLibrary(libraryName);
        res.status(204).send();
    };

    /**
     * Returns a list of all installed libraries.
     *
     * Used HTTP status codes:
     * - 200 if successful
     * - 500 if there was an error inside the library
     */
    public getLibraries = async (
        req: express.Request,
        res: express.Response<ILibraryManagementOverviewItem[]>
    ): Promise<void> => {
        const libraryNames = await this.libraryManager.libraryStorage.getInstalledLibraryNames();
        const libraryMetadata = (
            await Promise.all(
                libraryNames.map((lib) => this.libraryManager.getLibrary(lib))
            )
        ).sort((a, b) => a.compare(b));

        const ret = await Promise.all(
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

        res.send(ret).status(200);
    };

    /**
     * Returns detailed information about a library.
     *
     * Used HTTP status codes:
     * - 200 if successful
     * - 400 if library name is not a valid ubername
     * - 404 if the library was not found
     * - 500 if there was an internal error
     */
    public getLibrary = async (
        req: express.Request<{ ubername: string }>,
        res: express.Response<
            IInstalledLibrary & {
                dependentsCount: number;
                instancesAsDependencyCount: number;
                instancesCount: number;
                isAddon: boolean;
            }
        >
    ): Promise<void> => {
        const libraryName = await this.checkLibrary(req.params.ubername);
        const [metadata, usage, dependentsCount] = await Promise.all([
            this.libraryManager.getLibrary(libraryName),
            this.contentManager.contentStorage.getUsage(libraryName),
            this.libraryManager.libraryStorage.getDependentsCount(libraryName)
        ]);
        res.status(200).send({
            ...metadata,
            dependentsCount,
            instancesCount: usage.asMainLibrary,
            instancesAsDependencyCount: usage.asDependency,
            isAddon: metadata.addTo !== undefined
        });
    };

    /**
     * Changes the status of a library. Can currently only be used to set
     * libraries to restricted or back.
     *
     * Used HTTP status codes:
     * - 204 if successful
     * - 400 if library name is not a valid ubername
     * - 404 if the library was not found
     * - 500 if there was an internal error
     */
    public patchLibrary = async (
        req: express.Request<
            { ubername: string },
            any,
            { restricted: boolean }
        >,
        res: express.Response<ILibraryManagementOverviewItem>
    ): Promise<void> => {
        const libraryName = await this.checkLibrary(req.params.ubername);
        if (
            req.body.restricted === undefined ||
            typeof req.body.restricted !== 'boolean'
        ) {
            throw new H5pError('invalid-patch-request', undefined, 400);
        }

        await this.libraryManager.libraryStorage.setRestricted(
            libraryName,
            req.body.restricted
        );
        res.status(204).send();
    };

    /**
     * Uploads H5P packages and installs the libraries inside it. Ignores
     * content in the package.
     *
     * Used HTTP status codes:
     * - 200 if successful
     * - 400 if there was a validation error in the package
     * - 500 if there was an internal error
     */
    public postLibraries = async (
        req: express.Request & {
            files: {
                file: {
                    data: Buffer;
                    mimetype: string;
                    name: string;
                    size: number;
                };
            };
        },
        res: express.Response<{ installed: number; updated: number }>
    ): Promise<void> => {
        return;
    };

    /**
     * Manually updates the content type cache by contacting the H5P Hub and
     * fetching the metadata about the available content types.
     *
     * Used HTTP status codes:
     * - 200 if successful
     * - 502 if the H5P Hub is unreachable
     * - 500 if there was an internal error
     */
    public postLibrariesContentTypeCacheUpdate = async (
        req: express.Request,
        res: express.Response<IHubInfo>
    ): Promise<void> => {
        return;
    };

    /**
     * Updates all content object of the specified library to the newest
     * version.
     *
     * Used HTTP status codes:
     * - 200 if successful
     * - 400 if library name is not a valid ubername
     * - 404 if the library was not found
     * - 500 if there was an internal error
     */
    public postLibraryUpdateContent = async (
        req: express.Request<{ ubername: string }>,
        res: express.Response<{
            library: ILibraryManagementOverviewItem;
            updated: number;
        }>
    ): Promise<void> => {
        return;
    };

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
