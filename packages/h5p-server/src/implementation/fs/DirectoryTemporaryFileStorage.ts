import { createReadStream, createWriteStream, ReadStream } from 'fs';
import {
    access,
    mkdir,
    readdir,
    readFile,
    rm,
    rmdir,
    stat,
    writeFile
} from 'fs/promises';

import { getAllFiles } from 'get-all-files';
import path from 'path';
import promisepipe from 'promisepipe';

import {
    ITemporaryFile,
    ITemporaryFileStorage,
    IUser,
    IFileStats
} from '../../types';
import H5pError from '../../helpers/H5pError';
import { checkFilename, sanitizeFilename } from './filenameUtils';

/**
 * Stores temporary files in directories on the disk.
 * Manages access rights by creating one sub-directory for each user.
 * Manages expiration times by creating companion '.metadata' files for every
 * file stored.
 */
export default class DirectoryTemporaryFileStorage
    implements ITemporaryFileStorage
{
    /**
     * @param directory the directory in which the temporary files are stored.
     * Must be read- and write accessible
     */
    constructor(
        private directory: string,
        protected options?: {
            /**
             * These characters will be removed from files that are saved to S3.
             * There is a very strict default list that basically only leaves
             * alphanumeric filenames intact. Should you need more relaxed
             * settings you can specify them here.
             */
            invalidCharactersRegexp?: RegExp;
            /*
             * How long paths can be in the filesystem (Differs between Windows,
             * Linux and MacOS, so check out the limitation of your
             * system!)
             */
            maxPathLength?: number;
        }
    ) {
        mkdir(directory, { recursive: true });
        this.maxFileLength =
            (options?.maxPathLength ?? 255) - (directory.length + 1) - 40;
        // we subtract 40 for the contentId (12), the unique id attached to the
        // file (8), the .metadata suffix (9), userIds (8) and separators (3).
        if (this.maxFileLength < 20) {
            throw new Error(
                'The path of the temporary files directory is too long to add files to it. Put the directory into a different location.'
            );
        }
    }

    private maxFileLength: number;

    public async deleteFile(filename: string, ownerId: string): Promise<void> {
        checkFilename(filename);
        if (!ownerId) {
            throw new Error(
                'Invalid arguments for DirectoryTemporaryFileStorage.deleteFile: you must specify an ownerId'
            );
        }
        checkFilename(ownerId);
        const filePath = this.getAbsoluteFilePath(ownerId, filename);
        await rm(filePath);
        await rm(`${filePath}.metadata`);

        const userDirectoryPath = this.getAbsoluteUserDirectoryPath(ownerId);
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
        try {
            await access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    public async getFileStats(
        filename: string,
        user: IUser
    ): Promise<IFileStats> {
        if (!(await this.fileExists(filename, user))) {
            throw new H5pError(
                'storage-file-implementations:temporary-file-not-found',
                {
                    filename,
                    userId: user.id
                },
                404
            );
        }
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        return stat(filePath);
    }

    public async getFileStream(
        filename: string,
        user: IUser,
        rangeStart?: number,
        rangeEnd?: number
    ): Promise<ReadStream> {
        checkFilename(filename);
        checkFilename(user.id);
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        try {
            await access(filePath);
        } catch {
            throw new H5pError(
                'storage-file-implementations:temporary-file-not-found',
                { filename, userId: user.id },
                404
            );
        }
        return createReadStream(filePath, {
            start: rangeStart,
            end: rangeEnd
        });
    }

    public async listFiles(user?: IUser): Promise<ITemporaryFile[]> {
        if (user) {
            checkFilename(user.id);
        }
        const users = user ? [user.id] : await readdir(this.directory);
        return (
            await Promise.all(
                users.map(async (u) => {
                    const basePath = this.getAbsoluteUserDirectoryPath(u);
                    const basePathLength = basePath.length + 1;
                    const filesOfUser = await getAllFiles(basePath).toArray();
                    return Promise.all(
                        filesOfUser
                            .map((f) => f.substr(basePathLength))
                            .filter((f) => !f.endsWith('.metadata'))
                            .map((f) => this.getTemporaryFileInfo(f, u))
                    );
                })
            )
        ).reduce((prev, curr) => prev.concat(curr), []);
    }

    /**
     * Removes invalid characters from filenames and enforces other filename
     * rules required by the storage implementation (e.g. filename length
     * restrictions).
     * @param filename the filename to sanitize; this can be a relative path
     * (e.g. "images/image1.png")
     * @returns the clean filename
     */
    public sanitizeFilename = (filename: string): string => {
        return sanitizeFilename(
            filename,
            this.maxFileLength,
            this.options?.invalidCharactersRegexp
        );
    };

    public async saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser,
        expirationTime: Date
    ): Promise<ITemporaryFile> {
        checkFilename(filename);
        checkFilename(user.id);

        await mkdir(this.getAbsoluteUserDirectoryPath(user.id), {
            recursive: true
        });
        const filePath = this.getAbsoluteFilePath(user.id, filename);
        await mkdir(path.dirname(filePath), { recursive: true });
        const writeStream = createWriteStream(filePath);
        await promisepipe(dataStream, writeStream);
        await writeFile(
            `${filePath}.metadata`,
            JSON.stringify({
                expiresAt: expirationTime.getTime()
            })
        );
        return {
            expiresAt: expirationTime,
            filename,
            ownedByUserId: user.id
        };
    }

    private async deleteEmptyDirectory(directory: string): Promise<void> {
        const files = await readdir(directory);
        if (files.length === 0) {
            await rmdir(directory);
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
        const metadata = JSON.parse(
            await readFile(
                `${this.getAbsoluteFilePath(userId, filename)}.metadata`,
                'utf-8'
            )
        );
        return {
            expiresAt: new Date(metadata.expiresAt),
            filename,
            ownedByUserId: userId
        };
    }
}
