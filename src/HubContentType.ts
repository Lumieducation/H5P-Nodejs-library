import { IUser } from './types';

/**
 * This objects carries information about content types that the user can select
 * from the H5P Hub.
 */
export default class HubContentType {
    constructor(init?: Partial<HubContentType>) {
        Object.assign(this, init);
    }

    public categories: string[];
    public createdAt: number;
    public description: string;
    public example: string;
    public h5pMajorVersion: number;
    public h5pMinorVersion: number;
    public icon: string;
    public isRecommended: boolean;
    public keywords: string[];
    public license: any;
    public machineName: string;
    public majorVersion: number;
    public minorVersion: number;
    public owner: string;
    public patchVersion: number;
    public popularity: number;
    public screenshots: any;
    public summary: string;
    public title: string;
    public tutorial: string;
    public updatedAt: number;

    /**
     * Checks if a user can install this content type.
     * @param {User} user The user for who the method should check whether the content type can be installed.
     * @returns {boolean} true if the user can install it, false if not
     */
    public canBeInstalledBy(user: IUser): boolean {
        return (
            user.canUpdateAndInstallLibraries ||
            (user.canInstallRecommended && this.isRecommended)
        );
    }
}
