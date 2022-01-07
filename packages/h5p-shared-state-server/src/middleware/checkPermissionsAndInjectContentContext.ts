import { IUser, LibraryName } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import {
    GetLibraryMetadataFunction,
    GetPermissionForUserFunction,
    GetContentMetadataFunction,
    GetContentParametersFunction,
    ISharedStateAgent
} from '../types';

export default (
        getPermissionForUser: GetPermissionForUserFunction,
        getLibraryMetadata: GetLibraryMetadataFunction,
        getContentMetadata: GetContentMetadataFunction,
        getContentParameters: GetContentParametersFunction
    ) =>
    async (
        context: ShareDB.middleware.SubmitContext<ISharedStateAgent>,
        next: (err?: any) => void
    ): Promise<void> => {
        const contentId = context.id;
        const user = context.agent.custom.user as IUser;

        if (context.agent.custom.fromServer) {
            return next();
        }

        if (!user && !context.agent.custom.fromServer) {
            return next(new Error('No user data in submit request'));
        }

        const permission = await getPermissionForUser(user, contentId);

        if (!permission) {
            console.log(
                'User tried to access content without proper permission.'
            );
            return next('You do not have permission to access this content.');
        }
        context.agent.custom.permission = permission;

        console.log(
            'User',
            user.id,
            '(',
            user.name,
            ')',
            'is accessing',
            contentId,
            'with access level',
            permission
        );

        if (contentId) {
            const contentMetadata = await getContentMetadata(contentId, user);
            const libraryMetadata = await getLibraryMetadata(
                contentMetadata.preloadedDependencies.find(
                    (d) => d.machineName === contentMetadata.mainLibrary
                )
            );
            if (libraryMetadata.requiredExtensions?.sharedState !== 1) {
                console.log(
                    `Library ${LibraryName.toUberName(
                        libraryMetadata
                    )} uses unsupported shared state extension: The library requires v${
                        libraryMetadata.requiredExtensions?.sharedState
                    } but this application only supports v1.`
                );
                // Unknown extension version ... Aborting.
                return next(
                    new Error(
                        `Library ${LibraryName.toUberName(
                            libraryMetadata
                        )} uses unsupported shared state extension: The library requires v${
                            libraryMetadata.requiredExtensions?.sharedState
                        } but this application only supports v1.`
                    )
                );
            }
            const params = await getContentParameters(contentId, user);
            context.agent.custom.params = params;

            context.agent.custom.ubername =
                LibraryName.toUberName(libraryMetadata);
            context.agent.custom.libraryMetadata = libraryMetadata;
        }

        next();
    };
