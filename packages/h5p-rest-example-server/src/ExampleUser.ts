import { IUser } from '@lumieducation/h5p-server';

/**
 * Example user object
 */
export default class ExampleUser implements IUser {
    constructor(
        public id: string,
        public name: string,
        public email: string,
        // role is a custom property that is not required by the core; We can
        // use it in ExamplePermissionSystem to evaluate individual permission
        public role: 'anonymous' | 'teacher' | 'student' | 'admin'
    ) {
        this.type = 'local';
    }

    public type: 'local';
}
