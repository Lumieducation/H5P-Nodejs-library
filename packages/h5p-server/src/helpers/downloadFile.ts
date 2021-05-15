import { AxiosError } from 'axios';
import fs from 'fs';
import * as stream from 'stream';
import { promisify } from 'util';

import { IH5PConfig } from '../types';
import H5pError from './H5pError';
import HttpClient from './HttpClient';

const finished = promisify(stream.finished);

/**
 * Downloads a file to the local filesystem. Throws H5pError that contain the
 * HTTP status code of the outgoing request if something went wrong.
 * @param fileUrl
 * @param outputLocationPath
 * @returns
 */
export async function downloadFile(
    fileUrl: string,
    outputLocationPath: string,
    config: IH5PConfig
): Promise<any> {
    const writer = fs.createWriteStream(outputLocationPath);
    const client = HttpClient(config);
    return client({
        method: 'get',
        url: fileUrl,
        responseType: 'stream'
    })
        .then(async (response) => {
            response.data.pipe(writer);
            return finished(writer);
        })
        .catch((reason: AxiosError) => {
            if (reason.isAxiosError) {
                throw new H5pError(
                    'content-hub-download-error-with-message',
                    { message: reason.message },
                    Number.parseInt(reason.code, 10)
                );
            }
            throw new H5pError('content-hub-download-error');
        });
}
