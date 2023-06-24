import { IPermissionSystem, IUser, Permission } from '../types';

/**
 * A permission system that allows everything to every user.
 */
export class LaissezFairePermissionSystem implements IPermissionSystem {
    async checkGeneral(
        _actingUser: IUser,
        _permission: Permission
    ): Promise<boolean> {
        return true;
    }
    async checkContent(
        _user: IUser,
        _permission: Permission,
        _contentId?: string
    ): Promise<boolean> {
        return true;
    }
    async checkTemporary(
        _user: IUser,
        _permission: Permission,
        _filename?: string
    ): Promise<boolean> {
        return true;
    }
}
