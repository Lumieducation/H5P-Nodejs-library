import {
    IPermissionSystem,
    GeneralPermission,
    TemporaryFilePermission,
    ContentPermission
} from '@lumieducation/h5p-server';

import ExampleUser from './ExampleUser';

export default class ExamplePermissionSystem
    implements IPermissionSystem<ExampleUser>
{
    async checkContent(
        actingUser: ExampleUser | undefined,
        permission: ContentPermission,
        contentId?: string,
        affectedUserId?: string
    ): Promise<boolean> {
        if (!actingUser) {
            return false;
        }
        if (actingUser.role === 'admin') {
            return true;
        } else if (actingUser.role === 'teacher') {
            switch (permission) {
                case ContentPermission.Create:
                case ContentPermission.Delete:
                case ContentPermission.Download:
                case ContentPermission.Edit:
                case ContentPermission.DeleteFinished:
                case ContentPermission.DeleteUserState:
                case ContentPermission.EditFinished:
                case ContentPermission.EditUserState:
                case ContentPermission.Embed:
                case ContentPermission.List:
                case ContentPermission.ListUserStates:
                case ContentPermission.View:
                case ContentPermission.ViewFinished:
                case ContentPermission.ViewUserState:
                    return true;
                default:
                    return false;
            }
        } else if (actingUser.role === 'student') {
            switch (permission) {
                case ContentPermission.EditFinished:
                case ContentPermission.EditUserState:
                case ContentPermission.ListUserStates:
                case ContentPermission.ViewUserState:
                    if (!affectedUserId || affectedUserId === actingUser.id) {
                        return true;
                    }
                    return false;
                case ContentPermission.List:
                case ContentPermission.View:
                case ContentPermission.ViewFinished:
                    return true;
                default:
                    return false;
            }
        } else {
            return false;
        }
    }

    async checkTemporary(
        user: ExampleUser | undefined,
        permission: TemporaryFilePermission,
        filename?: string
    ): Promise<boolean> {
        if (!user || !user.role || user.role === 'anonymous') {
            return false;
        }
        return true;
    }

    async checkGeneral(
        actingUser: ExampleUser | undefined,
        permission: GeneralPermission
    ): Promise<boolean> {
        if (!actingUser) {
            return false;
        }
        if (actingUser.role === 'admin') {
            switch (permission) {
                case GeneralPermission.InstallRecommended:
                case GeneralPermission.UpdateAndInstallLibraries:
                case GeneralPermission.CreateRestricted:
                    return true;
                default:
                    return false;
            }
        } else if (actingUser.role === 'teacher') {
            switch (permission) {
                case GeneralPermission.InstallRecommended:
                    return false;
                case GeneralPermission.UpdateAndInstallLibraries:
                    return false;
                case GeneralPermission.CreateRestricted:
                    return false;
                default:
                    return false;
            }
        } else if (actingUser.role === 'student') {
            switch (permission) {
                case GeneralPermission.InstallRecommended:
                    return false;
                case GeneralPermission.UpdateAndInstallLibraries:
                    return false;
                case GeneralPermission.CreateRestricted:
                    return false;
                default:
                    return false;
            }
        } else {
            // anonymous or completely unauthenticated
            return false;
        }
    }
}
