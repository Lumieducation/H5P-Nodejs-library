import {
    IPermissionSystem,
    IUser,
    ContentPermission,
    GeneralPermission,
    TemporaryFilePermission,
    UserDataPermission
} from '../types';

/**
 * A permission system that allows everything to every user.
 */
export class LaissezFairePermissionSystem implements IPermissionSystem {
    async checkForUserData(
        _actingUser: IUser,
        _permission: UserDataPermission,
        _contentId: string,
        _affectedUserId?: string
    ): Promise<boolean> {
        return true;
    }
    async checkForGeneralAction(
        _actingUser: IUser,
        _permission: GeneralPermission
    ): Promise<boolean> {
        return true;
    }
    async checkForContent(
        _user: IUser,
        _permission: ContentPermission,
        _contentId?: string
    ): Promise<boolean> {
        return true;
    }
    async checkForTemporaryFile(
        _user: IUser,
        _permission: TemporaryFilePermission,
        _filename?: string
    ): Promise<boolean> {
        return true;
    }
}
