class ContentType {
    machineName = undefined;

    majorVersion = undefined;

    minorVersion = undefined;

    patchVersion = undefined;

    h5pMajorVersion = undefined;

    h5pMinorVersion = undefined;

    title = undefined;

    summary = undefined;

    description = undefined;

    icon = undefined;

    createdAt = undefined;

    updatedAt = undefined;

    isRecommended = undefined;

    popularity = undefined;

    screenshots = undefined;

    license = undefined;

    owner = undefined;

    example = undefined;

    tutorial = undefined;

    keywords = undefined;

    categories = undefined;

    /**
     * Checks if a user can install this content type.
     * @param {User} user The user for who the method should check whether the content type can be installed.
     * @¶eturns {boolean} true if the user can install it, false if not
     */
    canBeInstalledBy(user) {
        return user.canUpdateAndInstallLibraries || (user.canInstallRecommended && this.isRecommended);
    }
}

module.exports = ContentType;