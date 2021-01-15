import * as express from 'express';

import {
    H5PEditor,
    H5pError,
    IInstalledLibrary,
    ILibraryAdministrationOverviewItem,
    LibraryAdministration
} from '@lumieducation/h5p-server';

export default class LibraryAdministrationExpressController {
    constructor(
        protected h5pEditor: H5PEditor,
        protected libraryAdministration: LibraryAdministration
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
        await this.libraryAdministration.deleteLibrary(req.params.ubername);
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
        res: express.Response<ILibraryAdministrationOverviewItem[]>
    ): Promise<void> => {
        const libraries = await this.libraryAdministration.getLibraries();
        res.status(200).json(libraries);
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
        const libraryDetails = await this.libraryAdministration.getLibrary(
            req.params.ubername
        );
        res.status(200).json(libraryDetails);
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
        res: express.Response
    ): Promise<void> => {
        await this.libraryAdministration.restrictLibrary(
            req.params.ubername,
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
        if (!req.files?.file?.data) {
            throw new H5pError('malformed-request', {}, 400);
        }

        const { installedLibraries } = await this.h5pEditor.uploadPackage(
            req.files.file.data,
            undefined,
            {
                onlyInstallLibraries: true
            }
        );

        res.status(200).json({
            installed: installedLibraries.filter((l) => l.type === 'new')
                .length,
            updated: installedLibraries.filter((l) => l.type === 'patch').length
        });
    };
}
