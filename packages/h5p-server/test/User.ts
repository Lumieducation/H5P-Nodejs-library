import { IUser } from '../src';

/**
 * Example user object
 */
export default class User implements IUser {
    constructor() {
        this.id = '1';
        this.name = 'Firstname Surname';
        this.type = 'local';
        this.email = 'test@example.com';
    }

    public email: string;
    public id: string;
    public name: string;
    public type: 'local';
}
