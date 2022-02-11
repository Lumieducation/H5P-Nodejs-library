import { IUser, LibraryName } from '@lumieducation/h5p-server';
import ShareDB from 'sharedb';
import debug from 'debug';

import {
    GetLibraryMetadataFunction,
    GetPermissionForUserFunction,
    GetContentMetadataFunction,
    GetContentParametersFunction,
    ISharedStateAgent
} from '../types';

const log = debug(
    'h5p:SharedStateServer:checkPermissionsAndInjectContentContext'
);

/**
 * Checks the permissions and injects information about the content object into
 * the context.
 */
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

        // Allow all operations by the server
        if (context.agent.custom.fromServer) {
            return next();
        }

        if (!user && !context.agent.custom.fromServer) {
            return next(new Error('No user data in submit request'));
        }

        const permission = await getPermissionForUser(user, contentId);

        if (!permission) {
            log(
                'User %s tried to access content without proper permission.',
                user.id
            );
            return next('You do not have permission to access this content.');
        }
        context.agent.custom.permission = permission;

        log(
            'User %s (%s) is accessing %s with access level %s',
            user.id,
            user.name,
            contentId,
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
                log(
                    'Library %s uses unsupported shared state extension: The library requires v%s but this application only supports v1.',
                    LibraryName.toUberName(libraryMetadata),
                    libraryMetadata.requiredExtensions?.sharedState
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
