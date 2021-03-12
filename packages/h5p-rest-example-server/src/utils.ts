import os from 'os';
import { Request } from 'express';
import fsExtra from 'fs-extra';

/**
 * Displays links to the server at all available IP addresses.
 * @param port The port at which the server can be accessed.
 */
export function displayIps(port: string): void {
    console.log('Example H5P NodeJs server is running:');
    const networkInterfaces = os.networkInterfaces();
    // eslint-disable-next-line guard-for-in
    for (const devName in networkInterfaces) {
        networkInterfaces[devName]
            .filter((int) => !int.internal)
            .forEach((int) =>
                console.log(
                    `http://${int.family === 'IPv6' ? '[' : ''}${int.address}${
                        int.family === 'IPv6' ? ']' : ''
                    }:${port}`
                )
            );
    }
}

/**
 * This method will delete all temporary uploaded files from the request
 */
export async function clearTempFiles(
    req: Request & { files: any }
): Promise<void> {
    if (!req.files) {
        return;
    }

    await Promise.all(
        Object.keys(req.files).map((file) =>
            req.files[file].tempFilePath !== undefined &&
            req.files[file].tempFilePath !== ''
                ? fsExtra.remove(req.files[file].tempFilePath)
                : Promise.resolve()
        )
    );
}
