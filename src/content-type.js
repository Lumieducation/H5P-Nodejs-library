class ContentType {
    constructor() {
        this.machineName = undefined;
        this.majorVersion = undefined;
        this.minorVersion = undefined
        this.patchVersion = undefined;
        this.h5pMajorVersion = undefined;
        this.h5pMinorVersion = undefined;
        this.title = undefined;
        this.summary = undefined;
        this.description = undefined;
        this.icon = undefined;
        this.createdAt = undefined;
        this.updatedAt = undefined;
        this.isRecommended = undefined;
        this.popularity = undefined;
        this.screenshots = undefined;
        this.license = undefined;
        this.owner = undefined;
        this.example = undefined;
        this.tutorial = undefined;
        this.keywords = undefined;
        this.categories = undefined;
    }

    /**
     * Checks if a user can install this content type.
     * @param {User} user The user for who the method should check whether the content type can be installed.
     * @returns {boolean} true if the user can install it, false if not
     */
    canBeInstalledBy(user) {
        return user.canUpdateAndInstallLibraries || (user.canInstallRecommended && this.isRecommended);
    }
}

module.exports = ContentType;