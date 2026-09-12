import os from 'os';
import { Request, Express } from 'express';
import { rm } from 'fs/promises';
import { Server } from 'http';

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
 * Starts listening on the given port. If the port is already in use, it
 * tries the next port number up, and keeps doing so until it finds a free
 * one.
 * @param app the Express app to start listening with
 * @param port the port to start trying from
 * @returns the http.Server instance and the port it is actually listening on
 */
export function listenOnAvailablePort(
    app: Express,
    port: number
): Promise<{ server: Server; port: number }> {
    return new Promise((resolve, reject) => {
        const server = app.listen(port);
        server.once('listening', () => {
            resolve({ server, port });
        });
        server.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                server.close();
                resolve(listenOnAvailablePort(app, port + 1));
            } else {
                reject(error);
            }
        });
    });
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
                ? rm(req.files[file].tempFilePath, {
                      recursive: true,
                      force: true
                  })
                : Promise.resolve()
        )
    );
}
