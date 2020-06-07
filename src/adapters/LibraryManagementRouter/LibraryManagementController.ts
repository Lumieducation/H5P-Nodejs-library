import * as express from 'express';

import { IInstalledLibrary, IHubInfo } from '../../types';
import { ILibraryManagementOverviewItem } from './LibraryManagementTypes';
import ContentManager from '../../ContentManager';
import LibraryManager from '../../LibraryManager';
import LibraryName from '../../LibraryName';

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
        return;
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
        return;
    };

    /**
     * Changes the status of a library. Can currently only be used to set
     * libraries to restricted or back.
     *
     * Used HTTP status codes:
     * - 200 if successful
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
        return;
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
}
