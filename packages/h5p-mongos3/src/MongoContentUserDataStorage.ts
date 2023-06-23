import MongoDB from 'mongodb';

import {
    ContentId,
    IContentUserDataStorage,
    IUser,
    IContentUserData,
    Logger,
    IFinishedUserData,
    IPermissionSystem,
    LaissezFairePermissionSystem,
    Permission,
    H5pError
} from '@lumieducation/h5p-server';

const log = new Logger('MongoContentUserDataStorage');

/**
 * MongoDB storage for user data and finished data.
 *
 * It is highly recommended to call `createIndexes` on initialization.
 */
export default class MongoContentUserDataStorage
    implements IContentUserDataStorage
{
    /**
     * @param userDataCollection a MongoDB collection (read- and writable)
     * @param finishedCollection a MongoDB collection (read- and writable)
     */
    constructor(
        private userDataCollection: MongoDB.Collection,
        private finishedCollection: MongoDB.Collection,
        options?: {
            permissionSystem?: IPermissionSystem;
        }
    ) {
        log.info('initialize');

        if (options.permissionSystem) {
            this.permissionSystem = this.permissionSystem;
        } else {
            this.permissionSystem = new LaissezFairePermissionSystem();
        }
    }

    private permissionSystem: IPermissionSystem;

    /**
     * Creates indexes to speed up read access. Can be safely used even if
     * indexes already exist.
     */
    public async createIndexes(): Promise<void> {
        await this.userDataCollection.createIndexes([
            {
                key: {
                    contentId: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    invalidate: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    dataType: 1,
                    subContentId: 1,
                    userId: 1,
                    contextId: 1
                }
            },
            {
                key: {
                    userId: 1
                }
            },
            {
                key: {
                    contentId: 1,
                    userId: 1,
                    contextId: 1
                }
            }
        ]);
        await this.finishedCollection.createIndexes([
            {
                key: {
                    contentId: 1,
                    userId: 1
                }
            },
            {
                key: {
                    contentId: 1
                }
            },
            {
                key: {
                    userId: 1
                }
            }
        ]);
    }

    public async getContentUserData(
        contentId: ContentId,
        dataType: string,
        subContentId: string,
        user: IUser,
        contextId?: string
    ): Promise<IContentUserData> {
        log.debug(
            `getContentUserData: loading contentUserData for contentId ${contentId} and userId ${user.id} and contextId ${contextId}`
        );

        if (
            !(await this.permissionSystem.checkContent(
                user,
                Permission.ViewUserState,
                contentId
            ))
        ) {
            log.error(
                `User tried view user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-user-data-permission',
                {},
                403
            );
        }

        return this.cleanMongoUserData(
            await this.userDataCollection.findOne<IContentUserData>({
                contentId,
                dataType,
                subContentId,
                userId: user.id,
                contextId
            })
        );
    }

    public async getContentUserDataByUser(
        user: IUser
    ): Promise<IContentUserData[]> {
        if (
            !(await this.permissionSystem.checkContent(
                user,
                Permission.ListUserStates
            ))
        ) {
            log.error(
                `User tried to list their content states without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-list-user-data-permission',
                {},
                403
            );
        }

        return (
            await this.userDataCollection
                .find<IContentUserData>({
                    userId: user.id
                })
                .toArray()
        )?.map(this.cleanMongoUserData);
    }

    public async createOrUpdateContentUserData(
        userData: IContentUserData,
        user: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                user,
                Permission.EditUserState,
                userData.contentId
            ))
        ) {
            log.error(
                `User tried add / edit user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-edit-user-data-permission',
                {},
                403
            );
        }

        await this.userDataCollection.replaceOne(
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userId: userData.userId,
                contextId: userData.contextId
            },
            {
                contentId: userData.contentId,
                dataType: userData.dataType,
                subContentId: userData.subContentId,
                userState: userData.userState,
                invalidate: userData.invalidate,
                preload: userData.preload,
                userId: userData.userId,
                contextId: userData.contextId
            },
            { upsert: true }
        );
    }

    public async createOrUpdateFinishedData(
        finishedData: IFinishedUserData,
        user: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                user,
                Permission.EditFinished,
                finishedData.contentId
            ))
        ) {
            log.error(
                `User tried add finished data without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-edit-finished-permission',
                {},
                403
            );
        }

        await this.finishedCollection.replaceOne(
            {
                contentId: finishedData.contentId,
                userId: finishedData.userId
            },
            {
                contentId: finishedData.contentId,
                score: finishedData.score,
                maxScore: finishedData.maxScore,
                openedTimestamp: finishedData.openedTimestamp,
                finishedTimestamp: finishedData.finishedTimestamp,
                completionTime: finishedData.completionTime,
                userId: finishedData.userId
            },
            { upsert: true }
        );
    }

    public async deleteInvalidatedContentUserData(
        contentId: string
    ): Promise<void> {
        await this.userDataCollection.deleteMany({
            contentId,
            invalidate: true
        });
    }

    public async deleteAllContentUserDataByUser(
        userId: string,
        actingUser: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.DeleteUserState,
                undefined,
                actingUser
            ))
        ) {
            log.error(
                `User tried delete content states without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-user-states-permission',
                {},
                403
            );
        }

        await this.userDataCollection.deleteMany({
            userId
        });
    }

    public async deleteAllContentUserDataByContentId(
        contentId: ContentId,
        actingUser: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.DeleteUserState,
                contentId
            ))
        ) {
            log.error(
                `User tried delete content user state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-user-state-permission',
                {},
                403
            );
        }

        await this.userDataCollection.deleteMany({
            contentId
        });
    }

    public async getContentUserDataByContentIdAndUser(
        contentId: ContentId,
        actingUser: IUser,
        contextId?: string
    ): Promise<IContentUserData[]> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.ViewUserState,
                contentId
            ))
        ) {
            log.error(
                `User tried viewing user content state without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-user-state-permission',
                {},
                403
            );
        }

        return (
            await this.userDataCollection
                .find<IContentUserData>({
                    contentId,
                    userId: actingUser.id,
                    contextId
                })
                .toArray()
        )?.map(this.cleanMongoUserData);
    }

    public async getFinishedDataByContentId(
        contentId: string,
        actingUser: IUser
    ): Promise<IFinishedUserData[]> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.ViewFinished,
                contentId
            ))
        ) {
            log.error(
                `User tried to view finished data for content without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-finished-data-permission',
                {},
                403
            );
        }

        return (
            await this.finishedCollection
                .find<IFinishedUserData>({ contentId })
                .toArray()
        )?.map(this.cleanMongoFinishedData);
    }

    public async getFinishedDataByUser(
        forUserId: string,
        actingUser: IUser
    ): Promise<IFinishedUserData[]> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.ViewUserState,
                undefined,
                forUserId
            ))
        ) {
            log.error(
                `User tried to view finished data for content without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-view-finished-data-permission',
                {},
                403
            );
        }

        return (
            await this.finishedCollection
                .find<IFinishedUserData>({ userId: forUserId })
                .toArray()
        )?.map(this.cleanMongoFinishedData);
    }

    public async deleteFinishedDataByContentId(
        contentId: string,
        actingUser: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.DeleteFinished,
                contentId
            ))
        ) {
            log.error(
                `User tried add delete finished data for content without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-finished-permission',
                {},
                403
            );
        }
        await this.finishedCollection.deleteMany({ contentId });
    }

    public async deleteFinishedDataByUser(
        forUserId: string,
        actingUser: IUser
    ): Promise<void> {
        if (
            !(await this.permissionSystem.checkContent(
                actingUser,
                Permission.DeleteFinished,
                undefined,
                forUserId
            ))
        ) {
            log.error(
                `User tried to delete all finished data for a user without proper permissions.`
            );
            throw new H5pError(
                'mongo-content-user-data-storage:missing-delete-finished-data-permission',
                {},
                403
            );
        }
        await this.finishedCollection.deleteMany({ userId: forUserId });
    }

    /**
     * To avoid leaking internal MongoDB data (id), this method maps the data
     * we've received from Mongo to a new object.
     * @param mongoData the original data received by MongoDB
     * @returns the same data but with all Mongo-internal fields removed
     */
    private cleanMongoUserData(mongoData: IContentUserData): IContentUserData {
        if (!mongoData) {
            return mongoData;
        }
        return {
            dataType: mongoData.dataType,
            invalidate: mongoData.invalidate,
            preload: mongoData.preload,
            subContentId: mongoData.subContentId,
            userState: mongoData.userState,
            contentId: mongoData.contentId,
            userId: mongoData.userId,
            contextId: mongoData.contextId
        };
    }

    /**
     * To avoid leaking internal MongoDB data (id), this method maps the data
     * we've received from Mongo to a new object.
     * @param mongoData the original data received by MongoDB
     * @returns the same data but with all Mongo-internal fields removed
     */
    private cleanMongoFinishedData(
        mongoData: IFinishedUserData
    ): IFinishedUserData {
        if (!mongoData) {
            return mongoData;
        }
        return {
            completionTime: mongoData.completionTime,
            contentId: mongoData.contentId,
            finishedTimestamp: mongoData.finishedTimestamp,
            maxScore: mongoData.maxScore,
            openedTimestamp: mongoData.openedTimestamp,
            score: mongoData.score,
            userId: mongoData.userId
        };
    }
}
