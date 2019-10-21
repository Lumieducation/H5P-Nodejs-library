import { ReadStream } from 'fs';
import fsExtra from 'fs-extra';
import path from 'path';
import promisepipe from 'promisepipe';

import H5pError from '../../src/helpers/H5pError';
import { ITemporaryFile, ITemporaryFileStorage, IUser } from '../../src/types';

export default class DirectoryTemporaryFileStorage
    implements ITemporaryFileStorage {
    /**
     * @param directory the directory in which the temporary files are stored.
     * Must be read- and write accessible
     */
    constructor(private directory: string) {}

    public async deleteFile(file: ITemporaryFile): Promise<boolean> {
        return false;
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
        return undefined;
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
            expiresAt: expirationTime
        });
        return {
            expiresAt: expirationTime,
            // tslint:disable-next-line: object-shorthand-properties-first
            filename,
            ownedBy: user
        };
    }
}
