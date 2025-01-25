import tmp from 'tmp-promise';
import { writeFile } from 'fs/promises';

import SvgSanitizer from '../../src/implementation/SvgSanitizer';
import { MalwareScanResult } from '../../src/types';

describe('SvgSanitizer', () => {
    /*
    it("doesn't alter clean SVG", async () => {
        await tmp.withFile(
            async ({ path }) => {
                await writeFile(
                    path,
                    `<svg xmlns="http://www.w3.org/2000/svg">
                       <circle
                         style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000"
                         id="path233"
                         cx="98.428535"
                         cy="68.415733"
                         r="54.194405" />
                     </svg>`
                );
                const sanitized = await new SvgSanitizer().scan(
                    path,
                    'image/svg+xml'
                );
                expect(sanitized.result).toBe(MalwareScanResult.Clean);
                expect(sanitized.wasSanitized).toBeUndefined();
                expect(sanitized.sanitizedFile).toBeUndefined();
            },
            { postfix: '.svg', keep: false }
        );
    });

    it('cleans malicious SVG', async () => {
        await tmp.withFile(
            async ({ path }) => {
                await writeFile(
                    path,
                    `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
                    <svg
                       version="1.1"
                       xmlns="http://www.w3.org/2000/svg"
                       xmlns:svg="http://www.w3.org/2000/svg">
                      <script>alert("XSS Test");</script>
                      <script>alert(document.cookie);</script>
                      <circle
                         style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000"
                         id="path233"
                         cx="98.428535"
                         cy="68.415733"
                         r="54.194405" />
                    </svg>`
                );
                const sanitized = await new SvgSanitizer().scan(
                    path,
                    'image/svg+xml'
                );
                expect(sanitized.result).toBe(MalwareScanResult.MalwareFound);
                expect(sanitized.wasSanitized).toBe(true);
                expect(sanitized.sanitizedFile).toBeDefined();
            },
            { postfix: '.svg', keep: false }
        );
    });*/
});
