import {
    IPermissionSystem,
    IUser,
    ContentPermission,
    GeneralPermission,
    TemporaryFilePermission
} from '../types';

/**
 * A permission system that allows everything to every user.
 */
export class LaissezFairePermissionSystem implements IPermissionSystem {
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
