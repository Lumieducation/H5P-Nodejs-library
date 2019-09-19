/**
 * Example user object
 */
export default class User {
    private id: string;
    private name: string;
    private canInstallRecommended: boolean;
    private canUpdateAndInstallLibraries: boolean;
    private canCreateRestricted: boolean;
    private type: 'local';

    constructor() {
        this.id = '1';
        this.name = 'Firstname Surname';
        this.canInstallRecommended = true;
        this.canUpdateAndInstallLibraries = true;
        this.canCreateRestricted = true;
        this.type = 'local';
    }
}
