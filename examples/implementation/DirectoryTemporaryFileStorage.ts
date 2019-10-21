import { ReadStream } from 'fs';
import { ITemporaryFile, ITemporaryFileStorage, IUser } from '../../src/types';

export default class DirectoryTemporaryFileStorage
    implements ITemporaryFileStorage {
    /**
     * @param directory the directory in which the temporary files are stored. 
     * Must be read- and write accessible
     */
    constructor(directory: string) {}

    public async deleteFile(file: ITemporaryFile): Promise<boolean> {
        return false;
    }

    public async getFileStream(
        filename: string,
        user: IUser
    ): Promise<ReadStream> {
        return undefined;
    }

    public async listFiles(user?: IUser): Promise<ITemporaryFile[]> {
        return undefined;
    }

    public async saveFile(
        filename: string,
        dataStream: ReadStream,
        user: IUser
    ): Promise<ITemporaryFile> {
        return undefined;
    }
}
