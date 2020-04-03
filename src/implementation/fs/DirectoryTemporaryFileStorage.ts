import { ReadStream } from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';
import globPromise from 'glob-promise';

import {
    H5pError,
    ITemporaryFile,
    ITemporaryFileStorage,
    IUser
} from '../../../src';
import checkFilename from './filenameCheck';

/**
 * Stores temporary files in directories on the disk.
 * Manages access rights by creating one sub-directory for each user.
 * Manages expiration times by creating companion '.metadata' files for every
 * file stored.
 */
export default class DirectoryTemporaryFileStorage
    implements ITemporaryFileStorage {
    /**
     * @param directory the directory in which the temporary files are stored.
     * Must be read- and write accessible
     */
    constructor(private directory: string) {
        fsExtra.ensureDirSync(directory);
    }

    public async deleteFile(filename: string, userId: string): Promise<void> {
        checkFilename(filename);
        checkFilename(userId);
        const filePath = this.getAbsoluteFilePath(userId, filename);
        await fsExtra.remove(filePath);
        await fsExtra.remove(`${filePath}.metadata`);

        const userDirectoryPath = this.getAbsoluteUserDirectoryPath(userId);
        const fileDirectoryPath = path.dirname(filePath);
        if (userDirectoryPath !== fileDirectoryPath) {
            await this.deleteEmptyDirectory(fileDirectoryPath);
        }
        await this.deleteEmptyDirectory(userDirectoryPath);
    }

    public async fileExists(filename: string, user: IUser): Promise<boolean> {
        checkFilename(filename);
        checkFilename(user.id);
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        return fsExtra.pathExists(filePath);
    }

    public async getFileStream(
        filename: string,
        user: IUser
    ): Promise<ReadStream> {
        checkFilename(filename);
        checkFilename(user.id);
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        if (!(await fsExtra.pathExists(filePath))) {
            throw new H5pError(
                'storage-file-implementations:temporary-file-not-found',
                { filename, userId: user.id },
                404
            );
        }
        return fsExtra.createReadStream(filePath);
    }

    public async listFiles(user?: IUser): Promise<ITemporaryFile[]> {
        if (user) {
            checkFilename(user.id);
        }
        const users = user ? [user.id] : await fsExtra.readdir(this.directory);
        return (
            await Promise.all(
                users.map(async (u) => {
                    const filesOfUser = await globPromise(
                        path.join(
                            this.getAbsoluteUserDirectoryPath(u),
                            '**/*.*'
                        )
                    );
                    return Promise.all(
                        filesOfUser
                            .map((f) => path.basename(f))
                            .filter((f) => !f.endsWith('.metadata'))
                            .map((f) => this.getTemporaryFileInfo(f, u))
                    );
                })
            )
        ).reduce((prev, curr) => prev.concat(curr), []);
    }

    public async saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser,
        expirationTime: Date
    ): Promise<ITemporaryFile> {
        checkFilename(filename);
        checkFilename(user.id);

        await fsExtra.ensureDir(this.getAbsoluteUserDirectoryPath(user.id));
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        await fsExtra.ensureDir(path.dirname(filePath));
        const writeStream = fsExtra.createWriteStream(filePath);
        await promisepipe(dataStream, writeStream);
        await fsExtra.writeJSON(`${filePath}.metadata`, {
            expiresAt: expirationTime.getTime()
        });
        return {
            expiresAt: expirationTime,
            filename,
            ownedByUserId: user.id
        };
    }

    private async deleteEmptyDirectory(directory: string): Promise<void> {
        const files = await fsExtra.readdir(directory);
        if (files.length === 0) {
            await fsExtra.rmdir(directory);
        }
    }

    private getAbsoluteFilePath(userId: string, filename: string): string {
        return path.join(this.directory, userId, filename);
    }

    private getAbsoluteUserDirectoryPath(userId: string): string {
        return path.join(this.directory, userId);
    }

    private async getTemporaryFileInfo(
        filename: string,
        userId: string
    ): Promise<ITemporaryFile> {
        const metadata = await fsExtra.readJSON(
            `${this.getAbsoluteFilePath(userId, filename)}.metadata`
        );
        return {
            expiresAt: new Date(metadata.expiresAt),
            filename,
            ownedByUserId: userId
        };
    }
}
