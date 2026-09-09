import fs from 'fs/promises';
import path from 'path';
import { APIRequestContext } from '@playwright/test';

/**
 * Same vendored fixture directory `seed.ts` uses for the h5p-examples
 * specs.
 */
const vendoredContentDir = path.join(__dirname, '../data/vendored-content');

/**
 * Installs a content type on `packages/h5p-rest-example-server`, the same
 * way `seedLibraries()` (`./seed.ts`) does for `packages/h5p-examples` - by
 * POSTing a local `test/data/vendored-content/<name>.h5p` package to the
 * ajax `library-upload` action.
 *
 * Unlike `packages/h5p-examples`, the REST example server enables CSRF
 * protection (`csurf()`) on every `/h5p/*` route and only grants the
 * `UpdateAndInstallLibraries` permission to the `admin` role
 * (`ExamplePermissionSystem.checkForGeneralAction`). So this first logs in
 * as `admin` (the example server's `LocalStrategy` never checks the
 * password, only
 * that the username exists in its in-memory `userTable`) to obtain a
 * session cookie and a CSRF token, then passes that token as the `_csrf`
 * query parameter on the upload request itself - the same mechanism the
 * server's own `UrlGenerator` `queryParamGenerator` uses to authorize the
 * URLs it hands to the browser (see `src/index.ts`), and one `csurf()`
 * token remains valid for repeated requests against the same session, so a
 * single login is enough for the whole seeding step.
 *
 * @param request Playwright's `request` fixture, bound to the REST
 * example's `baseURL` (the Vite dev server, which proxies `/h5p` and
 * `/login` through to the actual REST example server).
 * @param machineName e.g. `H5P.Blanks`.
 */
export async function seedRestExampleLibrary(
    request: APIRequestContext,
    machineName: string
): Promise<void> {
    const loginResponse = await request.post('/login', {
        data: { username: 'admin', password: 'admin' }
    });
    if (!loginResponse.ok()) {
        throw new Error(
            `Failed to log in as admin to seed ${machineName}: ` +
                `${loginResponse.status()} ${await loginResponse.text()}`
        );
    }
    const { csrfToken } = (await loginResponse.json()) as {
        csrfToken: string;
    };

    const filePath = path.join(vendoredContentDir, `${machineName}.h5p`);
    const buffer = await fs.readFile(filePath);
    const response = await request.post(
        `/h5p/ajax?action=library-upload&_csrf=${encodeURIComponent(csrfToken)}`,
        {
            multipart: {
                h5p: {
                    name: `${machineName}.h5p`,
                    mimeType: 'application/octet-stream',
                    buffer
                }
            }
        }
    );
    if (!response.ok()) {
        throw new Error(
            `Failed to seed library ${machineName} on the REST example ` +
                `server: ${response.status()} ${await response.text()}`
        );
    }
}
