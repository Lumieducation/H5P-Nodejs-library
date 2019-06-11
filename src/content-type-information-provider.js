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

    addLocalLibraries(hubInfo) {
        return hubInfo;
    }

    addUserAndInstallationSpecificInfo(hubInfo) {
        return hubInfo;
    }
}