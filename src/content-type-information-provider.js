class ContentTypeInformationProvider {
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

    async get() {
        let cachedHubInfo = await this.contentTypeCache.get()
        cachedHubInfo = this.addUserAndInstallationSpecificInfo(cachedHubInfo);
        cachedHubInfo = this.addLocalLibraries(cachedHubInfo);

        return {
            outdated: await this.contentTypeCache.isOutdated(),
            libraries: cachedHubInfo,
            user: this.user.type,
            recentlyUsed: [], // TODO: store this somewhere
            apiVersion: this.config.coreApiVersion,
            details: null
        };
    }

    async addLocalLibraries(hubInfo) {
        const localLibsWrapped = await this.libraryManager.getInstalled();
        let localLibs = Object.keys(localLibsWrapped)
            .map(machineName => localLibsWrapped[machineName][localLibsWrapped[machineName].length - 1])
            .filter(lib => !hubInfo.some(hubLib => hubLib.machineName === lib.machineName))
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
                    restricted: localLib.restricted, // TODO: adapt to individual user
                    icon: await this.libraryManager.libraryFileExists('icon.svg') ? this.libraryManager.getLibraryFileUrl('icon.svg') : undefined
                }
            });
        localLibs = await Promise.all(localLibs);             
        return hubInfo.concat(localLibs);
    }

    addUserAndInstallationSpecificInfo(hubInfo) {
        return hubInfo;
    }
}