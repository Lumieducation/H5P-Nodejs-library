import {
    IPermissionSystem,
    GeneralPermission,
    TemporaryFilePermission,
    ContentPermission,
    UserDataPermission
} from '@lumieducation/h5p-server';

import ExampleUser from './ExampleUser';

export default class ExamplePermissionSystem
    implements IPermissionSystem<ExampleUser>
{
    async checkForUserData(
        actingUser: ExampleUser,
        permission: UserDataPermission,
        contentId: string,
        affectedUserId?: string
    ): Promise<boolean> {
        if (!actingUser) {
            return false;
        }
        if (actingUser.role === 'admin') {
            return true;
        } else if (actingUser.role === 'teacher') {
            switch (permission) {
                case UserDataPermission.DeleteFinished:
                case UserDataPermission.DeleteState:
                case UserDataPermission.EditFinished:
                case UserDataPermission.EditState:
                case UserDataPermission.ListStates:
                case UserDataPermission.ViewFinished:
                case UserDataPermission.ViewState:
                    return true;
                default:
                    return false;
            }
        } else if (actingUser.role === 'student') {
            switch (permission) {
                case UserDataPermission.EditFinished:
                case UserDataPermission.EditState:
                case UserDataPermission.ListStates:
                case UserDataPermission.ViewState:
                case UserDataPermission.ViewFinished:
                    if (affectedUserId === actingUser.id) {
                        return true;
                    }
                    return false;
                default:
                    return false;
            }
        } else {
            return false;
        }
    }

    async checkForContent(
        actingUser: ExampleUser | undefined,
        permission: ContentPermission,
        contentId?: string
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
                case ContentPermission.Embed:
                case ContentPermission.List:
                case ContentPermission.View:
                    return true;
                default:
                    return false;
            }
        } else if (actingUser.role === 'student') {
            switch (permission) {
                case ContentPermission.List:
                case ContentPermission.View:
                    return true;
                default:
                    return false;
            }
        } else {
            return false;
        }
    }

    async checkForTemporaryFile(
        user: ExampleUser | undefined,
        permission: TemporaryFilePermission,
        filename?: string
    ): Promise<boolean> {
        if (!user || !user.role || user.role === 'anonymous') {
            return false;
        }
        return true;
    }

    async checkForGeneralAction(
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
