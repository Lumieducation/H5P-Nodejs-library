import fs from 'fs/promises';
import path from 'path';
import { APIRequestContext } from '@playwright/test';

/**
 * Directory containing the `.h5p` packages downloaded by
 * `npm run download:content` (cached in CI). Populated from
 * `test/data/content-type-cache/real-content-types.json`.
 */
const hubContentDir = path.join(__dirname, '../../../../test/data/hub-content');

/**
 * Installs content types by POSTing a local `test/data/hub-content/<name>.h5p`
 * package to the ajax `library-upload` action - the same endpoint the
 * editor's Hub "upload" tab uses. This is deliberately the ajax endpoint
 * (`/h5p/ajax?action=library-upload`, multipart field `h5p`), not the REST
 * library administration endpoint (`/h5p/libraries`, multipart field `file`)
 * covered separately in the library-management spec - both exist and both
 * install libraries, but this one is what a real end user's "Hub install"
 * flow exercises.
 *
 * @param request Playwright's `request` fixture, already bound to `baseURL`.
 * @param machineNames e.g. `['H5P.Blanks', 'H5P.CoursePresentation']`.
 */
export async function seedLibraries(
    request: APIRequestContext,
    machineNames: string[]
): Promise<void> {
    for (const machineName of machineNames) {
        const filePath = path.join(hubContentDir, `${machineName}.h5p`);
        const buffer = await fs.readFile(filePath);
        const response = await request.post('/h5p/ajax?action=library-upload', {
            multipart: {
                h5p: {
                    name: `${machineName}.h5p`,
                    mimeType: 'application/octet-stream',
                    buffer
                }
            }
        });
        if (!response.ok()) {
            throw new Error(
                `Failed to seed library ${machineName}: ${response.status()} ${await response.text()}`
            );
        }
    }
}
