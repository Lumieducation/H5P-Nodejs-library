import fsExtra from 'fs-extra';
import path from 'path';
import { performance } from 'perf_hooks';

import * as uploadHelpers from './helpers/upload';

const host = 'http://localhost:8080';

const errorFileStream = fsExtra.createWriteStream(
    path.resolve(process.argv[3])
);

async function logFailed(file: string, cause: string): Promise<void> {
    console.error(`❌ ${file} failed: ${cause})`);
    errorFileStream.write(`${file}: ${cause}\n`);
}

async function main(): Promise<void> {
    const examplesPath = path.resolve(process.argv[2]);
    console.log(`Uploading and saving h5p packages in ${examplesPath}...`);
    await uploadHelpers.beforeAll(host);

    let unhandledRejectionMessage: string;
    process.on('unhandledRejection', (error: Error) => {
        unhandledRejectionMessage = error.message;
    });

    try {
        for (const file of fsExtra
            .readdirSync(examplesPath)
            // We ignore H5P.Audio as the requests for the OGG file is never
            // resolved in some cases See #553 for more details.
            .filter((f) => f.endsWith('.h5p'))) {
            const start = performance.now();
            const uploadPromise = uploadHelpers.uploadSave(
                path.join(examplesPath, file)
            );
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('timeout'));
                }, 30000);
            });
            try {
                await Promise.race([uploadPromise, timeoutPromise]);
            } catch (error) {
                logFailed(file, error.message);
                unhandledRejectionMessage = null;
                continue;
            }
            if (unhandledRejectionMessage) {
                logFailed(file, unhandledRejectionMessage);
            } else {
                const end = performance.now();
                console.log(`✅ ${file} (${Math.round(end - start)} ms)`);
            }
            unhandledRejectionMessage = null;
        }
    } finally {
        await uploadHelpers.afterAll();
    }
    errorFileStream.close();
    process.exit();
}

main();
