import { IUser } from '@lumieducation/h5p-server';

/**
 * Example user object
 */
export default class User implements IUser {
    constructor() {
        this.id = '1';
        this.name = 'Firstname Surname';
        this.canInstallRecommended = true;
        this.canUpdateAndInstallLibraries = true;
        this.canCreateRestricted = true;
        this.type = 'local';
    }

    public canCreateRestricted: boolean;
    public canInstallRecommended: boolean;
    public canUpdateAndInstallLibraries: boolean;
    public id: string;
    public name: string;
    public type: 'local';
}
