import { writeFile, mkdtemp, rm } from 'fs/promises';
import path from 'path';
import os from 'os';

import {
    validateFileContent,
    extensionMatchesDetected
} from '../src/contentFileValidation';

describe('validateFileContent', () => {
    let tmpDir: string;

    beforeEach(async () => {
        tmpDir = await mkdtemp(path.join(os.tmpdir(), 'h5p-validator-'));
    });

    afterEach(async () => {
        await rm(tmpDir, { recursive: true, force: true });
    });

    it('accepts a valid PNG file', async () => {
        // Minimal valid PNG header
        const pngHeader = Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00,
            0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00,
            0x00, 0x01, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
            0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63,
            0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21,
            0xbc, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
            0x42, 0x60, 0x82
        ]);
        const filePath = path.join(tmpDir, 'image.png');
        await writeFile(filePath, pngHeader);
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('accepts a valid JPEG file', async () => {
        const jpegHeader = Buffer.from([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
            0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00
        ]);
        const filePath = path.join(tmpDir, 'photo.jpg');
        await writeFile(filePath, jpegHeader);
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('rejects XML file renamed to .png', async () => {
        const filePath = path.join(tmpDir, 'malicious.png');
        await writeFile(filePath, '<?xml version="1.0"?><svg></svg>');
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('rejects SVG file renamed to .jpg', async () => {
        const filePath = path.join(tmpDir, 'malicious.jpg');
        await writeFile(
            filePath,
            '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
        );
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('rejects HTML file renamed to .mp4', async () => {
        const filePath = path.join(tmpDir, 'malicious.mp4');
        await writeFile(
            filePath,
            '<html><body><script>alert(1)</script></body></html>'
        );
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('accepts a valid JSON file', async () => {
        const filePath = path.join(tmpDir, 'content.json');
        await writeFile(filePath, JSON.stringify({ key: 'value' }));
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('accepts a valid VTT file', async () => {
        const filePath = path.join(tmpDir, 'subtitles.vtt');
        await writeFile(
            filePath,
            'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello'
        );
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('rejects text-based file containing <?xml with non-xml extension', async () => {
        const filePath = path.join(tmpDir, 'data.json');
        await writeFile(
            filePath,
            '<?xml version="1.0"?><root><data>test</data></root>'
        );
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('rejects HTML doctype in text-based file', async () => {
        const filePath = path.join(tmpDir, 'data.gltf');
        await writeFile(
            filePath,
            '<!DOCTYPE html><html><body>xss</body></html>'
        );
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('accepts a file with no extension', async () => {
        const filePath = path.join(tmpDir, 'noextension');
        await writeFile(filePath, 'some content');
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('rejects a PNG-claimed file that is actually a GIF', async () => {
        // GIF87a header
        const gifHeader = Buffer.from([
            0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x3b
        ]);
        const filePath = path.join(tmpDir, 'fake.png');
        await writeFile(filePath, gifHeader);
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });

    it('accepts a valid GIF file', async () => {
        const gifHeader = Buffer.from([
            0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00,
            0x00, 0x00, 0x3b
        ]);
        const filePath = path.join(tmpDir, 'animation.gif');
        await writeFile(filePath, gifHeader);
        await expect(validateFileContent(filePath)).resolves.toBeUndefined();
    });

    it('rejects script tag in a .vtt file', async () => {
        const filePath = path.join(tmpDir, 'evil.vtt');
        await writeFile(
            filePath,
            '<script>document.location="http://evil.com"</script>'
        );
        await expect(validateFileContent(filePath)).rejects.toThrow(
            'upload-validation-error'
        );
    });
});

describe('extensionMatchesDetected', () => {
    it('matches direct extension', () => {
        expect(extensionMatchesDetected('png', ['png'])).toBe(true);
    });

    it('matches MIME alias (jpg ↔ jpeg)', () => {
        expect(extensionMatchesDetected('jpg', ['jpeg'])).toBe(true);
        expect(extensionMatchesDetected('jpeg', ['jpg'])).toBe(true);
    });

    it('matches MIME subtype (mp4 ↔ m4a)', () => {
        expect(extensionMatchesDetected('mp4', ['m4a'])).toBe(true);
        expect(extensionMatchesDetected('m4a', ['mp4'])).toBe(true);
    });

    it('matches MIME subtype (ogg ↔ ogv)', () => {
        expect(extensionMatchesDetected('ogg', ['ogv'])).toBe(true);
        expect(extensionMatchesDetected('ogv', ['ogg'])).toBe(true);
    });

    it('matches residual equivalents (webm ↔ mkv)', () => {
        expect(extensionMatchesDetected('webm', ['mkv'])).toBe(true);
        expect(extensionMatchesDetected('mkv', ['webm'])).toBe(true);
    });

    it('matches residual equivalents (png ↔ apng)', () => {
        expect(extensionMatchesDetected('png', ['apng'])).toBe(true);
        expect(extensionMatchesDetected('apng', ['png'])).toBe(true);
    });

    it('rejects unrelated extensions', () => {
        expect(extensionMatchesDetected('png', ['gif'])).toBe(false);
        expect(extensionMatchesDetected('mp4', ['png'])).toBe(false);
    });
});
