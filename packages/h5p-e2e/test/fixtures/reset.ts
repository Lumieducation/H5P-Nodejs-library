import fs from 'fs/promises';
import path from 'path';

/**
 * Wipes library and content storage so a test run starts from a known-empty
 * server. Implemented behind an interface so session 7 (storage permutation
 * matrix) can add a Mongo/S3 implementation that drops the configured
 * collections and empties the configured buckets instead of touching the
 * filesystem, without changing any call site.
 */
export interface IStateResetter {
    reset(): Promise<void>;
}

/**
 * Deletes the directories `packages/h5p-examples/h5p/{libraries,content,
 * temporary-storage,user-data}`. `h5p/core` and `h5p/editor` (the downloaded
 * H5P core/editor JavaScript, populated by `npm run download:h5p`) are left
 * alone - they are not test state, and redownloading them is expensive.
 */
export class FsStateResetter implements IStateResetter {
    private readonly h5pExamplesDir = path.join(
        __dirname,
        '../../../h5p-examples'
    );

    private readonly directoriesToWipe = [
        'libraries',
        'content',
        'temporary-storage',
        'user-data'
    ];

    public async reset(): Promise<void> {
        await Promise.all(
            this.directoriesToWipe.map(async (dir) => {
                const fullPath = path.join(this.h5pExamplesDir, 'h5p', dir);
                await fs.rm(fullPath, { recursive: true, force: true });
                await fs.mkdir(fullPath, { recursive: true });
            })
        );
    }
}

/**
 * Selects a state resetter implementation. Only the filesystem backend
 * exists so far (session 3); `E2E_STORAGE` will grow `mongo-s3-redis` /
 * `mongo-only` branches in session 7.
 */
export function getStateResetter(): IStateResetter {
    return new FsStateResetter();
}
