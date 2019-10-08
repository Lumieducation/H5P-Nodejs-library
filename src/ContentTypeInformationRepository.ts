import axios from 'axios';
import * as fsExtra from 'fs-extra';
import promisepipe from 'promisepipe';
import { withFile } from 'tmp-promise';

import ContentTypeCache from './ContentTypeCache';
import H5pError from './helpers/H5pError';
import Library from './Library';
import LibraryManager from './LibraryManager';
import PackageImporter from './PackageImporter';
import {
    IEditorConfig,
    IKeyValueStorage,
    ITranslationService,
    IUser
} from './types';

/**
 * This class provides access to information about content types that are either available at the H5P Hub
 * or were installed locally. It is used by the editor to display the list of available content types. Technically
 * it fulfills the same functionality as the "ContentTypeCache" in the original PHP implementation, but it has been
 * renamed in the NodeJS version, as it provides more functionality than just caching the information from the Hub:
 *   - it checks if the current user has the rights to update or install a content type
 *   - it checks if a content type in the Hub is installed locally and is outdated locally
 *   - it adds information about only locally installed content types
 */
export default class ContentTypeInformationRepository {
    /**
     *
     * @param {ContentTypeCache} contentTypeCache
     * @param {IStorage} storage
     * @param {LibraryManager} libraryManager
     * @param {H5PEditorConfig} config
     * @param {User} user
     * @param {TranslationService} translationService
     */
    constructor(
        private contentTypeCache: ContentTypeCache,
        private storage: IKeyValueStorage,
        private libraryManager: LibraryManager,
        private config: IEditorConfig,
        private user: IUser,
        private translationService: ITranslationService
    ) {}

    /**
     * Gets the information about available content types with all the extra information as listed in the class description.
     */
    public async get(): Promise<any> {
        let cachedHubInfo = await this.contentTypeCache.get();
        if (!cachedHubInfo) {
            // try updating cache if it is empty for some reason
            await this.contentTypeCache.updateIfNecessary();
            cachedHubInfo = await this.contentTypeCache.get();
        }
        if (!cachedHubInfo) {
            // if the H5P Hub is unreachable use empty array (so that local libraries can be added)
            cachedHubInfo = [];
        }
        cachedHubInfo = await this.addUserAndInstallationSpecificInfo(
            cachedHubInfo
        );
        cachedHubInfo = await this.addLocalLibraries(cachedHubInfo);

        return {
            apiVersion: this.config.coreApiVersion,
            details: null, // TODO: implement this (= messages to user)
            libraries: cachedHubInfo,
            outdated:
                (await this.contentTypeCache.isOutdated()) &&
                (this.user.canInstallRecommended ||
                    this.user.canUpdateAndInstallLibraries),
            recentlyUsed: [], // TODO: store this somewhere
            user: this.user.type
        };
    }

    /**
     * Installs a library from the H5P Hub.
     * Throws H5PError exceptions if there are errors.
     * @param {string} machineName The machine name of the library to install (must be listed in the Hub, otherwise rejected)
     * @returns {Promise<boolean>} true if the library was installed.
     */
    public async install(machineName: string): Promise<boolean> {
        if (!machineName) {
            throw new H5pError(
                this.translationService.getTranslation(
                    'hub-install-no-content-type'
                )
            );
        }

        // Reject content types that are not listed in the hub
        const localContentType = await this.contentTypeCache.get(machineName);
        if (!localContentType || localContentType.length === 0) {
            throw new H5pError(
                this.translationService.getTranslation(
                    'hub-install-invalid-content-type'
                )
            );
        }

        // Reject installation of content types that the user has no permission to
        if (!localContentType[0].canBeInstalledBy(this.user)) {
            throw new H5pError(
                this.translationService.getTranslation('hub-install-denied')
            );
        }

        // Download content type package from the Hub
        const response = await axios.get(
            this.config.hubContentTypesEndpoint + machineName,
            { responseType: 'stream' }
        );

        // withFile is supposed to clean up the temporary file after it has been used
        await withFile(
            async ({ path: tempPackagePath }) => {
                const writeStream = fsExtra.createWriteStream(tempPackagePath);
                try {
                    await promisepipe(response.data, writeStream);
                } catch (error) {
                    throw new H5pError(
                        this.translationService.getTranslation(
                            'hub-install-download-failed'
                        )
                    );
                }

                const packageImporter = new PackageImporter(
                    this.libraryManager,
                    this.translationService,
                    this.config
                );
                await packageImporter.installLibrariesFromPackage(
                    tempPackagePath
                );
            },
            { postfix: '.h5p', keep: false }
        );

        return true;
    }

    /**
     *
     * @param {any[]} hubInfo
     * @returns {Promise<any[]>} The original hub information as passed into the method with appended information about
     * locally installed libraries.
     */
    private async addLocalLibraries(hubInfo: any[]): Promise<any[]> {
        const localLibsWrapped = await this.libraryManager.getInstalled();
        const localLibs = Object.keys(localLibsWrapped)
            .map(
                machineName =>
                    localLibsWrapped[machineName][
                        localLibsWrapped[machineName].length - 1
                    ]
            )
            .filter(
                lib =>
                    !hubInfo.some(
                        hubLib => hubLib.machineName === lib.machineName
                    ) && lib.runnable
            )
            .map(async localLib => {
                return {
                    canInstall: false,
                    description: '',
                    icon: (await this.libraryManager.libraryFileExists(
                        localLib,
                        'icon.svg'
                    ))
                        ? undefined // this.libraryManager.getLibraryFileUrl(
                        : //  localLib,
                          //  'icon.svg'
                          // )
                          undefined,
                    id: localLib.id,
                    installed: true,
                    isUpToDate: true,
                    localMajorVersion: localLib.majorVersion,
                    localMinorVersion: localLib.minorVersion,
                    localPatchVersion: localLib.patchVersion,
                    machineName: localLib.machineName,
                    majorVersion: localLib.majorVersion,
                    minorVersion: localLib.minorVersion,
                    owner: '',
                    patchVersion: localLib.patchVersion,
                    restricted:
                        this.libraryIsRestricted(localLib) &&
                        !this.user.canCreateRestricted,
                    title: localLib.title
                };
            });
        const finalLocalLibs = await Promise.all(localLibs);
        return hubInfo.concat(finalLocalLibs);
    }

    /**
     * Adds information about installation status, restriction, right to install and up-to-dateness.
     * @param {any[]} hubInfo
     * @returns {Promise<any[]>} The hub information as passed into the method with added information.
     */
    private async addUserAndInstallationSpecificInfo(
        hubInfo: any[]
    ): Promise<any[]> {
        const localLibsWrapped = await this.libraryManager.getInstalled();
        const localLibs = Object.keys(localLibsWrapped).map(
            machineName =>
                localLibsWrapped[machineName][
                    localLibsWrapped[machineName].length - 1
                ]
        );
        await Promise.all(
            hubInfo.map(async hl => {
                const hubLib = hl; // to avoid tslint from complaining about changing function parameters
                const localLib = localLibs.find(
                    l => l.machineName === hubLib.machineName
                );
                if (!localLib) {
                    hubLib.installed = false;
                    hubLib.restricted = !this.canInstallLibrary(hubLib);
                    hubLib.canInstall = this.canInstallLibrary(hubLib);
                    hubLib.isUpToDate = true;
                } else {
                    hubLib.id = localLib.id;
                    hubLib.installed = true;
                    hubLib.restricted =
                        this.libraryIsRestricted(localLib) &&
                        !this.user.canCreateRestricted;
                    hubLib.canInstall =
                        !this.libraryIsRestricted(localLib) &&
                        this.canInstallLibrary(hubLib);
                    hubLib.isUpToDate = !(await this.libraryManager.libraryHasUpgrade(
                        hubLib
                    ));
                    hubLib.localMajorVersion = localLib.majorVersion;
                    hubLib.localMinorVersion = localLib.minorVersion;
                    hubLib.localPatchVersion = localLib.patchVersion;
                }
            })
        );

        return hubInfo;
    }

    /**
     * Checks if users can install library due to their rights.
     * @param {Library} library
     */
    private canInstallLibrary(library: any): boolean {
        return (
            this.user.canUpdateAndInstallLibraries ||
            (library.isRecommended && this.user.canInstallRecommended)
        );
    }

    /**
     * Checks if the library is restricted e.g. because it is LRS dependent and the
     * admin has restricted them or because it was set as restricted individually.
     * @param {Library} library
     */
    private libraryIsRestricted(library: Library): boolean {
        if (this.config.enableLrsContentTypes) {
            return library.restricted;
        }
        if (
            this.config.lrsContentTypes.some(
                contentType => contentType === library.machineName
            )
        ) {
            return true;
        }
        return library.restricted;
    }
}
