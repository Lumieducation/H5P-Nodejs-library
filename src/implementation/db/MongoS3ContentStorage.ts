import MongoDB, { ObjectId } from 'mongodb';
import { Stream, Readable } from 'stream';

import {
    ContentId,
    IContentMetadata,
    IContentStorage,
    IUser,
    Permission
} from '../../types';

import AWS from 'aws-sdk';
// tslint:disable-next-line: no-submodule-imports
import { PromiseResult } from 'aws-sdk/lib/request';

export default class MongoS3ContentStorage implements IContentStorage {
    constructor(
        private s3: AWS.S3,
        private mongodb: MongoDB.Collection,
        private options?: {
            /**
             * The ACL to use for uploaded content files. Defaults to private.
             */
            s3Acl?: string;
            /**
             * The bucket to upload to and download from. Must be set if
             * the bucket hasn't been specified when initializing the S3 client.
             */
            s3Bucket?: string;
        }
    ) {}

    /**
     * Generates the AWS key for a file in a content object
     * @param contentId
     * @param filename
     * @returns the AWS key
     */
    private static getAwsKey(contentId: ContentId, filename: string): string {
        return `${contentId}/${filename}`;
    }

    /**
     * Creates a content object in the repository. Add files to it later with addContentFile(...).
     * Throws an error if something went wrong. In this case no traces of the content are left in storage and all changes are reverted.
     * @param metadata The metadata of the content (= h5p.json)
     * @param content the content object (= content/content.json)
     * @param user The user who owns this object.
     * @param contentId (optional) The content id to use
     * @returns The newly assigned content id
     */
    public async addContent(
        metadata: IContentMetadata,
        content: any,
        user: IUser,
        contentId?: ContentId
    ): Promise<ContentId> {
        try {
            if (!contentId) {
                const insertResult = await this.mongodb.insertOne({
                    metadata,
                    parameters: content,
                    creator: user.id
                });
                return insertResult.insertedId;
            }

            const replaceResult = await this.mongodb.replaceOne(
                { _id: new ObjectId(contentId) },
                {
                    metadata,
                    _id: new ObjectId(contentId),
                    parameters: content,
                    creator: user.id
                },
                { upsert: true }
            );
            if (replaceResult.result.ok) {
                return contentId;
            }
            throw new Error('500');
        } catch (error) {
            throw new Error(`Could not create content: ${error.message}`);
        }
    }

    /**
     * Adds a content file to an existing content object. The content object has to be created with createContent(...) first.
     * @param contentId The id of the content to add the file to
     * @param filename The filename
     * @param stream A readable stream that contains the data
     * @param user The user who owns this object
     * @returns
     */
    public async addFile(
        contentId: ContentId,
        filename: string,
        stream: Stream,
        user: IUser
    ): Promise<void> {
        this.checkFilename(filename);

        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Edit
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        try {
            await this.s3
                .upload({
                    ACL: this.options?.s3Acl ?? 'private',
                    Body: stream,
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getAwsKey(contentId, filename),
                    Metadata: {
                        owner: user.id
                    }
                })
                .promise();
        } catch (error) {
            throw new Error(
                `Error uploading file to S3 storage: ${error.message}`
            );
        }
    }

    /**
     * Checks if a piece of content exists in storage.
     * @param contentId the content id to check
     * @returns true if the piece of content exists
     */
    public async contentExists(contentId: ContentId): Promise<boolean> {
        if (
            (await this.mongodb.countDocuments({
                _id: new ObjectId(contentId)
            })) >= 1
        ) {
            return true;
        }
        return false;
    }

    /**
     * Deletes a content object and all its dependent files from the repository.
     * Throws errors if something goes wrong.
     * @param contentId The content id to delete.
     * @param user The user who wants to delete the content
     * @returns
     */
    public async deleteContent(
        contentId: ContentId,
        user?: IUser
    ): Promise<void> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Delete
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }
        try {
            const filesToDelete = await this.listFiles(contentId, user);
            while (filesToDelete.length > 0) {
                // S3 batch deletes only work with 1000 files at a time, so we
                // have to do this in several requests
                const first1000Files = filesToDelete.splice(0, 1000);
                if (first1000Files.length > 0) {
                    const deleteFilesRes = await this.s3
                        .deleteObjects({
                            Bucket: this.options?.s3Bucket,
                            Delete: {
                                Objects: first1000Files.map((f) => {
                                    return {
                                        Key: MongoS3ContentStorage.getAwsKey(
                                            contentId,
                                            f
                                        )
                                    };
                                })
                            }
                        })
                        .promise();
                    if (deleteFilesRes.Errors.length > 0) {
                        // log errors
                        throw new Error('Could not delete S3 objects');
                    }
                }
            }
            await this.mongodb.deleteOne({ _id: new ObjectId(contentId) });
        } catch (error) {
            return;
        }
    }

    /**
     * Deletes a file from a content object.
     * @param contentId the content object the file is attached to
     * @param filename the file to delete
     */
    public async deleteFile(
        contentId: ContentId,
        filename: string,
        user?: IUser
    ): Promise<void> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.Edit
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        try {
            await this.s3
                .deleteObject({
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getAwsKey(contentId, filename)
                })
                .promise();
        } catch (error) {
            return;
        }
    }

    /**
     * Checks if a file exists.
     * @param contentId The id of the content to add the file to
     * @param filename the filename of the file to get
     * @returns true if the file exists
     */
    public async fileExists(
        contentId: ContentId,
        filename: string
    ): Promise<boolean> {
        this.checkFilename(filename);

        if (!contentId) {
            throw new Error('404');
        }

        try {
            await this.s3
                .headObject({
                    Bucket: this.options?.s3Bucket,
                    Key: MongoS3ContentStorage.getAwsKey(contentId, filename)
                })
                .promise();
        } catch (error) {
            return false;
        }
        return true;
    }

    /**
     * Returns a readable stream of a content file (e.g. image or video) inside a piece of content
     * @param contentId the id of the content object that the file is attached to
     * @param filename the filename of the file to get
     * @param user the user who wants to retrieve the content file
     * @returns
     */
    public async getFileStream(
        contentId: ContentId,
        filename: string,
        user: IUser
    ): Promise<Readable> {
        this.checkFilename(filename);

        if (!contentId) {
            throw new Error('404');
        }

        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        return this.s3
            .getObject({
                Bucket: this.options?.s3Bucket,
                Key: MongoS3ContentStorage.getAwsKey(contentId, filename)
            })
            .createReadStream();
    }

    public async getMetadata(
        contentId: string,
        user?: IUser
    ): Promise<IContentMetadata> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        try {
            const ret = await this.mongodb.findOne({
                _id: new ObjectId(contentId)
            });
            return ret.metadata;
        } catch (error) {
            throw new Error('404');
        }
    }
    public async getParameters(contentId: string, user?: IUser): Promise<any> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        try {
            const ret = await this.mongodb.findOne({
                _id: new ObjectId(contentId)
            });
            return ret.parameters;
        } catch (error) {
            throw new Error('404');
        }
    }

    /**
     * Returns an array of permissions that the user has on the piece of content
     * @param contentId the content id to check
     * @param user the user who wants to access the piece of content
     * @returns the permissions the user has for this content (e.g. download it, delete it etc.)
     */
    public async getUserPermissions(
        contentId: ContentId,
        user: IUser
    ): Promise<Permission[]> {
        return [
            Permission.Delete,
            Permission.Download,
            Permission.Edit,
            Permission.Embed,
            Permission.List,
            Permission.View
        ];
    }

    public async listContent(user?: IUser): Promise<ContentId[]> {
        if (
            !(await this.getUserPermissions(undefined, user)).includes(
                Permission.View
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        try {
            const cursor = this.mongodb.find({}, { projection: { _id: true } });
            return cursor.map((doc) => doc._id).toArray();
        } catch (error) {
            throw new Error('404');
        }
    }

    /**
     * Gets the filenames of files added to the content with addContentFile(...) (e.g. images, videos or other files)
     * @param contentId the piece of content
     * @param user the user who wants to access the piece of content
     * @returns a list of files that are used in the piece of content, e.g. ['image1.png', 'video2.mp4']
     */
    public async listFiles(
        contentId: ContentId,
        user: IUser
    ): Promise<string[]> {
        if (
            !(await this.getUserPermissions(contentId, user)).includes(
                Permission.View
            )
        ) {
            throw new Error('Access violation'); // TODO: convert to proper H5PError
        }

        const prefix = MongoS3ContentStorage.getAwsKey(contentId, '');
        let files: string[] = [];
        try {
            let ret: PromiseResult<AWS.S3.ListObjectsV2Output, AWS.AWSError>;
            do {
                ret = await this.s3
                    .listObjectsV2({
                        Bucket: this.options?.s3Bucket,
                        Prefix: prefix,
                        ContinuationToken: ret?.ContinuationToken
                    })
                    .promise();
                files = files.concat(
                    ret.Contents.map((c) => c.Key.substr(prefix.length))
                );
            } while (ret.IsTruncated);
        } catch (error) {
            return [];
        }
        return files;
    }

    private checkFilename(filename: string): void {
        if (/\.\.\//.test(filename)) {
            throw new Error(
                `Relative paths in filenames are not allowed: ${filename} is illegal`
            );
        }
        if (filename.startsWith('/')) {
            throw new Error(
                `Absolute paths in filenames are not allowed: ${filename} is illegal`
            );
        }
    }
}
