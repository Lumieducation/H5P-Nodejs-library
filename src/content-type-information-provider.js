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
     * 
     * @param {any[]} hubInfo 
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
                hubLib.isUpToDate = await this.libraryManager.libraryHasUpgrade(hubLib);
                hubLib.localMajorVersion = localLib.majorVersion;
                hubLib.localMinorVersion = localLib.minorVersion;
                hubLib.localPatchVersion = localLib.patchVersion;
            }
        }));

        return hubInfo;
    }
}

module.exports = ContentTypeInformationProvider;