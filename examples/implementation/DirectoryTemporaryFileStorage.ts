import { ReadStream } from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';

import H5pError from '../../src/helpers/H5pError';
import { ITemporaryFile, ITemporaryFileStorage, IUser } from '../../src/types';

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
    constructor(private directory: string) {}

    public async deleteFile(file: ITemporaryFile): Promise<void> {
        await fsExtra.remove(
            path.join(this.directory, file.ownedByUserId, file.filename)
        );
        await fsExtra.remove(
            `${path.join(
                this.directory,
                file.ownedByUserId,
                file.filename
            )}.metadata`
        );
        const userFiles = await fsExtra.readdir(
            path.join(this.directory, file.ownedByUserId)
        );
        if (userFiles.length === 0) {
            await fsExtra.rmdir(path.join(this.directory, file.ownedByUserId));
        }
    }

    public async fileExists(filename: string, user: IUser): Promise<boolean> {
        const absoluteFilename = path.join(this.directory, user.id, filename);
        return fsExtra.pathExists(absoluteFilename);
    }

    public async getFileStream(
        filename: string,
        user: IUser
    ): Promise<ReadStream> {
        const absoluteFilename = path.join(this.directory, user.id, filename);
        if (!(await fsExtra.pathExists(absoluteFilename))) {
            throw new H5pError(
                `The file ${filename} is not accessible for user ${user.id} or does not exist.`
            );
        }
        return fsExtra.createReadStream(absoluteFilename);
    }

    public async listFiles(user?: IUser): Promise<ITemporaryFile[]> {
        const users = user ? [user.id] : await fsExtra.readdir(this.directory);
        return (await Promise.all(
            users.map(async u => {
                const filesOfUser = await fsExtra.readdir(
                    path.join(this.directory, u)
                );
                return Promise.all(
                    filesOfUser
                        .filter(f => !f.endsWith('.metadata'))
                        .map(f => this.getTemporaryFileInfo(f, u))
                );
            })
        )).reduce((prev, curr) => prev.concat(curr), []);
    }

    public async saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser,
        expirationTime: Date
    ): Promise<ITemporaryFile> {
        await fsExtra.ensureDir(path.join(this.directory, user.id));
        const absoluteFilename = path.join(this.directory, user.id, filename);
        const writeStream = fsExtra.createWriteStream(absoluteFilename);
        await promisepipe(dataStream, writeStream);
        await fsExtra.writeJSON(`${absoluteFilename}.metadata`, {
            expiresAt: expirationTime.getTime()
        });
        return {
            expiresAt: expirationTime,
            // tslint:disable-next-line: object-shorthand-properties-first
            filename,
            ownedByUserId: user.id
        };
    }

    private async getTemporaryFileInfo(
        filename: string,
        userId: string
    ): Promise<ITemporaryFile> {
        const metadata = await fsExtra.readJSON(
            `${path.join(this.directory, userId, filename)}.metadata`
        );
        return {
            expiresAt: new Date(metadata.expiresAt),
            // tslint:disable-next-line: object-shorthand-properties-first
            filename,
            ownedByUserId: userId
        };
    }
}
