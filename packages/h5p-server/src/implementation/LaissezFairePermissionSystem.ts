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
    async checkUserData(
        _actingUser: IUser,
        _permission: UserDataPermission,
        _contentId: string,
        _affectedUserId?: string
    ): Promise<boolean> {
        return true;
    }
    async checkGeneral(
        _actingUser: IUser,
        _permission: GeneralPermission
    ): Promise<boolean> {
        return true;
    }
    async checkContent(
        _user: IUser,
        _permission: ContentPermission,
        _contentId?: string
    ): Promise<boolean> {
        return true;
    }
    async checkTemporary(
        _user: IUser,
        _permission: TemporaryFilePermission,
        _filename?: string
    ): Promise<boolean> {
        return true;
    }
}
