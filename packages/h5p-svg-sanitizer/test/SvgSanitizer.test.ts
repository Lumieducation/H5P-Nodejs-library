import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import path from 'path';
import tmp from 'tmp-promise';

import { File, FileSanitizerResult } from '../../h5p-server/src/types';
import SvgSanitizer from '../src/SvgSanitizer';

const createFileFromFilePath = (filePath: string, data?: Buffer): File => {
    const fileName = path.basename(filePath);
    return {
        data: data,
        mimetype: '',
        name: fileName,
        size: 0,
        tempFilePath: data ? undefined : filePath
    };
};

describe('SvgSanitizer', () => {
    describe('when sanitizing SVG files', () => {
        it("doesn't alter clean SVG", async () => {
            await tmp.withFile(
                async ({ path }) => {
                    const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <circle style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000" id="path233" cx="98.428535" cy="68.415733" r="54.194405"></circle>
                     </svg>`;
                    await writeFile(path, svg, 'utf8');
                    const dom1 = new JSDOM(svg, {
                        contentType: 'image/svg+xml'
                    });

                    const file = createFileFromFilePath(path);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Sanitized);
                    const svg2 = await readFile(path, 'utf-8');
                    const dom2 = new JSDOM(svg2, {
                        contentType: 'image/svg+xml'
                    });
                    expect(
                        dom2.window.document.documentElement.isEqualNode(
                            dom1.window.document.documentElement
                        )
                    ).toBe(true);
                },
                { postfix: '.svg', keep: false }
            );
        });

        it('cleans malicious SVG', async () => {
            await tmp.withFile(
                async ({ path }) => {
                    const maliciousSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                      <script>alert(document.cookie);</script>
                      <circle r="54.194405" cy="68.415733" cx="98.428535" id="path233" style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000"></circle>
                    </svg>`;
                    await writeFile(path, maliciousSvg, 'utf8');
                    const dom1 = new JSDOM(maliciousSvg, {
                        contentType: 'image/svg+xml'
                    });

                    const file = createFileFromFilePath(path);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Sanitized);

                    const sanitizedSvg = await readFile(path, 'utf-8');
                    const dom2 = new JSDOM(sanitizedSvg, {
                        contentType: 'image/svg+xml'
                    });

                    // Ensure that the SVG was mutated
                    expect(
                        dom2.window.document.documentElement.isEqualNode(
                            dom1.window.document.documentElement
                        )
                    ).toBe(false);

                    // Ensure the script tag is removed
                    expect(
                        dom2.window.document.querySelector('script')
                    ).toBeNull();
                },
                { postfix: '.svg', keep: false }
            );
        });

        it('ignores files other than SVG', async () => {
            await tmp.withFile(
                async ({ path }) => {
                    await writeFile(path, 'some text', 'utf8');

                    const file = createFileFromFilePath(path);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Ignored);
                },
                { postfix: '.txt', keep: false }
            );
        });
    });

    describe('when sanitizing buffers', () => {
        it("doesn't alter clean SVG", async () => {
            await tmp.withFile(
                async ({ path }) => {
                    const svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                        <circle style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000" id="path233" cx="98.428535" cy="68.415733" r="54.194405"></circle>
                     </svg>`;
                    const data = Buffer.from(svg, 'utf8');
                    const dom1 = new JSDOM(svg, {
                        contentType: 'image/svg+xml'
                    });

                    const file = createFileFromFilePath(path, data);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Sanitized);

                    const svg2 = file.data.toString('utf8');
                    const dom2 = new JSDOM(svg2, {
                        contentType: 'image/svg+xml'
                    });
                    expect(
                        dom2.window.document.documentElement.isEqualNode(
                            dom1.window.document.documentElement
                        )
                    ).toBe(true);
                },
                { postfix: '.svg', keep: false }
            );
        });

        it('cleans malicious SVG', async () => {
            await tmp.withFile(
                async ({ path }) => {
                    const maliciousSvg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg">
                      <script>alert(document.cookie);</script>
                      <circle r="54.194405" cy="68.415733" cx="98.428535" id="path233" style="fill:#666666;stroke:#808080;stroke-width:4.40315;stop-color:#000000"></circle>
                    </svg>`;
                    const data = Buffer.from(maliciousSvg, 'utf8');
                    const dom1 = new JSDOM(maliciousSvg, {
                        contentType: 'image/svg+xml'
                    });

                    const file = createFileFromFilePath(path, data);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Sanitized);

                    const sanitizedSvg = file.data.toString('utf8');
                    const dom2 = new JSDOM(sanitizedSvg, {
                        contentType: 'image/svg+xml'
                    });

                    // Ensure that the SVG was mutated
                    expect(
                        dom2.window.document.documentElement.isEqualNode(
                            dom1.window.document.documentElement
                        )
                    ).toBe(false);

                    // Ensure the script tag is removed
                    expect(
                        dom2.window.document.querySelector('script')
                    ).toBeNull();
                },
                { postfix: '.svg', keep: false }
            );
        });

        it('ignores files other than SVG', async () => {
            await tmp.withFile(
                async ({ path }) => {
                    const data = Buffer.from('some text', 'utf8');

                    const file = createFileFromFilePath(path, data);
                    const result = await new SvgSanitizer().sanitize(file);
                    expect(result).toBe(FileSanitizerResult.Ignored);
                },
                { postfix: '.txt', keep: false }
            );
        });
    });
});
