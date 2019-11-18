import axios from 'axios';
import * as fsExtra from 'fs-extra';
import promisepipe from 'promisepipe';
import { withFile } from 'tmp-promise';

import ContentTypeCache from './ContentTypeCache';
import H5pError from './helpers/H5pError';
import HubContentType from './HubContentType';
import LibraryManager from './LibraryManager';
import PackageImporter from './PackageImporter';
import {
    IEditorConfig,
    IInstalledLibrary,
    IKeyValueStorage,
    ITranslationService,
    IUser
} from './types';

import Logger from './helpers/Logger';
const log = new Logger('ContentTypeInformationRepository');

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
     * @param {TranslationService} translationService
     */
    constructor(
        private contentTypeCache: ContentTypeCache,
        private storage: IKeyValueStorage,
        private libraryManager: LibraryManager,
        private config: IEditorConfig,
        private translationService: ITranslationService
    ) {
        log.info(`initialize`);
    }

    /**
     * Gets the information about available content types with all the extra information as listed in the class description.
     */
    public async get(user: IUser): Promise<any> {
        log.info(`getting information about available content types`);
        let cachedHubInfo = await this.contentTypeCache.get();
        cachedHubInfo = await this.addUserAndInstallationSpecificInfo(
            cachedHubInfo,
            user
        );
        cachedHubInfo = await this.addLocalLibraries(cachedHubInfo, user);

        return {
            apiVersion: this.config.coreApiVersion,
            details: null, // TODO: implement this (= messages to user)
            libraries: cachedHubInfo,
            outdated:
                (await this.contentTypeCache.isOutdated()) &&
                (user.canInstallRecommended ||
                    user.canUpdateAndInstallLibraries),
            recentlyUsed: [], // TODO: store this somewhere
            user: user.type
        };
    }

    /**
     * Installs a library from the H5P Hub.
     * Throws H5PError exceptions if there are errors.
     * @param {string} machineName The machine name of the library to install (must be listed in the Hub, otherwise rejected)
     * @returns {Promise<boolean>} true if the library was installed.
     */
    public async install(machineName: string, user: IUser): Promise<boolean> {
        log.info(
            `installing library ${machineName} from hub ${this.config.hubContentTypesEndpoint}`
        );
        if (!machineName) {
            log.error(`content type ${machineName} not found`);
            throw new H5pError(
                this.translationService.getTranslation(
                    'hub-install-no-content-type'
                )
            );
        }

        // Reject content types that are not listed in the hub
        const localContentType = await this.contentTypeCache.get(machineName);
        if (!localContentType || localContentType.length === 0) {
            log.error(
                `rejecting content type ${machineName}: content type is not listed in the hub ${this.config.hubContentTypesEndpoint}`
            );
            throw new H5pError(
                this.translationService.getTranslation(
                    'hub-install-invalid-content-type'
                )
            );
        }

        // Reject installation of content types that the user has no permission to
        if (!localContentType[0].canBeInstalledBy(user)) {
            log.warn(
                `rejecting installation of content type ${machineName}: user has no permission`
            );
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
                    log.error(error);
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
    private async addLocalLibraries(
        hubInfo: any[],
        user: IUser
    ): Promise<any[]> {
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
                        ? this.libraryManager.getLibraryFileUrl(
                              localLib,
                              'icon.svg'
                          )
                        : undefined,
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
                        !user.canCreateRestricted,
                    title: localLib.title
                };
            });
        const finalLocalLibs = await Promise.all(localLibs);
        log.info(
            `adding local libraries: ${finalLocalLibs
                .map(
                    lib =>
                        `${lib.machineName}-${lib.majorVersion}.${lib.minorVersion}`
                )
                .join(', ')}`
        );
        return hubInfo.concat(finalLocalLibs);
    }

    /**
     * Adds information about installation status, restriction, right to install and up-to-dateness.
     * @param {any[]} hubInfo
     * @returns {Promise<any[]>} The hub information as passed into the method with added information.
     */
    private async addUserAndInstallationSpecificInfo(
        hubInfo: any[],
        user: IUser
    ): Promise<any[]> {
        log.info(`adding user and installation specific information`);
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
                    hubLib.restricted = !this.canInstallLibrary(hubLib, user);
                    hubLib.canInstall = this.canInstallLibrary(hubLib, user);
                    hubLib.isUpToDate = true;
                } else {
                    hubLib.id = localLib.id;
                    hubLib.installed = true;
                    hubLib.restricted =
                        this.libraryIsRestricted(localLib) &&
                        !user.canCreateRestricted;
                    hubLib.canInstall =
                        !this.libraryIsRestricted(localLib) &&
                        this.canInstallLibrary(hubLib, user);
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
     * @param {HubContentType} library
     */
    private canInstallLibrary(library: HubContentType, user: IUser): boolean {
        log.verbose(
            `checking if user can install library ${library.machineName}`
        );
        return (
            user.canUpdateAndInstallLibraries ||
            (library.isRecommended && user.canInstallRecommended)
        );
    }

    /**
     * Checks if the library is restricted e.g. because it is LRS dependent and the
     * admin has restricted them or because it was set as restricted individually.
     * @param {IInstalledLibrary} library
     */
    private libraryIsRestricted(library: IInstalledLibrary): boolean {
        log.verbose(`checking if library ${library.machineName} is restriced`);
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
