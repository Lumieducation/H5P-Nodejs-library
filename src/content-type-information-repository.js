/**
 * This class provides access to information about content types that are either available at the H5P Hub
 * or were installed locally. It is used by the editor to display the list of available content types. Technically
 * it fulfills the same functionality as the "ContentTypeCache" in the original PHP implementation, but it has been
 * renamed in the NodeJS version, as it provides more functionality than just caching the information from the Hub:
 *   - it checks if the current user has the rights to update or install a content type
 *   - it checks if a content type in the Hub is installed locally and is outdated locally
 *   - it adds information about only locally installed content types
 */
class ContentTypeInformationRepository {
    /**
     * 
     * @param {ContentTypeCache} contentTypeCache 
     * @param {IStorage} storage 
     * @param {ILibraryManager} libraryManager 
     * @param {H5PEditorConfig} config 
     * @param {IUser} user 
     */
    constructor(contentTypeCache, storage, libraryManager, config, user) {
        this.contentTypeCache = contentTypeCache;
        this.storage = storage;
        this.libraryManager = libraryManager;
        this.config = config;
        this.user = user;
    }

    /**
     * Gets the information about available content types with all the extra information as listen in the class description.
     */
    async get() {
        await this.contentTypeCache.updateIfNecessary();
        let cachedHubInfo = await this.contentTypeCache.get()
        cachedHubInfo = await this.addUserAndInstallationSpecificInfo(cachedHubInfo);
        cachedHubInfo = await this.addLocalLibraries(cachedHubInfo);

        return {
            outdated: await this.contentTypeCache.isOutdated(),
            libraries: cachedHubInfo,
            user: this.user.type,
            recentlyUsed: [], // TODO: store this somewhere
            apiVersion: this.config.coreApiVersion,
            details: null
        };
    }

    /**
     * 
     * @param {any[]} hubInfo
     * @returns {any[]} The original hub information as passed into the method with appended information about 
     * locally installed libraries.  
     */
    async addLocalLibraries(hubInfo) {
        const localLibsWrapped = await this.libraryManager.getInstalled();
        let localLibs = Object.keys(localLibsWrapped)
            .map(machineName => localLibsWrapped[machineName][localLibsWrapped[machineName].length - 1])
            .filter(lib => !hubInfo.some(hubLib => hubLib.machineName === lib.machineName)
                && lib.runnable)
            .map(async localLib => {
                return {
                    id: localLib.id,
                    machineName: localLib.machineName,
                    title: localLib.title,
                    description: '',
                    majorVersion: localLib.majorVersion,
                    minorVersion: localLib.minorVersion,
                    patchVersion: localLib.patchVersion,
                    localMajorVersion: localLib.majorVersion,
                    localMinorVersion: localLib.minorVersion,
                    localPatchVersion: localLib.patchVersion,
                    canInstall: false,
                    installed: true,
                    isUpToDate: true,
                    owner: '',
                    restricted: localLib.restricted && !this.user.canUseRestricted,
                    icon: await this.libraryManager.libraryFileExists(localLib, 'icon.svg') ? this.libraryManager.getLibraryFileUrl('icon.svg') : undefined
                }
            });
        localLibs = await Promise.all(localLibs);
        return hubInfo.concat(localLibs);
    }

    /**
     * Adds information about installation status, restriction, right to install and up-to-dateness.
     * @param {any[]} hubInfo 
     * @returns {any[]} The hub information as passed into the method with added information. 
     */
    async addUserAndInstallationSpecificInfo(hubInfo) {
        const localLibsWrapped = await this.libraryManager.getInstalled();
        const localLibs = Object.keys(localLibsWrapped)
            .map(machineName => localLibsWrapped[machineName][localLibsWrapped[machineName].length - 1]);
        await Promise.all(hubInfo.map(async hl => {
            const hubLib = hl; // to avoid eslint from complaining about changing function parameters
            const localLib = localLibs.find(l => l.machineName === hubLib.machineName);
            if (!localLib) {
                hubLib.installed = false;
                hubLib.restricted = false;
                hubLib.canInstall = this.user.canInstall;
                hubLib.isUpToDate = true;
            } else {
                hubLib.id = localLib.id;
                hubLib.installed = true;
                hubLib.restricted = localLib.restricted && !this.user.canUseRestricted;
                hubLib.canInstall = !localLib.restricted && this.user.canInstall;
                hubLib.isUpToDate = !(await this.libraryManager.libraryHasUpgrade(hubLib));
                hubLib.localMajorVersion = localLib.majorVersion;
                hubLib.localMinorVersion = localLib.minorVersion;
                hubLib.localPatchVersion = localLib.patchVersion;
            }
        }));

        return hubInfo;
    }
}

module.exports = ContentTypeInformationRepository;