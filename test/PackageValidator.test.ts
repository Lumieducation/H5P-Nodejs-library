import * as path from 'path';

import EditorConfig from '../src/implementation/EditorConfig';
import PackageValidator from '../src/PackageValidator';

describe('validating H5P files', () => {
    it('correctly validates valid h5p files', async () => {
        const h5pFile1 = `${path.resolve('')}/test/data/validator/valid1.h5p`;
        const h5pFile2 = `${path.resolve('')}/test/data/validator/valid2.h5p`;

        try {
            const validator = new PackageValidator(new EditorConfig(null));
            let result = await validator.validatePackage(h5pFile1);
            expect(result).toBeDefined();
            result = await validator.validatePackage(h5pFile2);
            expect(result).toBeDefined();
        } catch (e) {
            throw e;
        }
    });

    it('rejects files not ending with .h5p', async () => {
        const h5pFile = `${path.resolve('')}/test/test.docx`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'missing-h5p-extension'
        );
    });

    it('rejects non-valid zip files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/corrupt_archive.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'unable-to-unzip'
        );
    });

    it('rejects too large content', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid2.h5p`;
        const config = new EditorConfig(null);
        config.maxFileSize = 1024;

        const validator = new PackageValidator(config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'file-size-too-large'
        );
    });

    it('rejects too large total content size', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid1.h5p`;
        const config = new EditorConfig(null);
        config.maxTotalSize = 10;

        const validator = new PackageValidator(config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'total-size-too-large'
        );
    });

    it('rejects invalid file extensions', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid2.h5p`;
        const config = new EditorConfig(null);
        config.libraryWhitelist = 'json js css';
        config.contentWhitelist = 'json';

        const validator = new PackageValidator(config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'not-in-whitelist'
        );
    });

    it('rejects broken json files', async () => {
        const h5pFile1 = `${path.resolve(
            ''
        )}/test/data/validator/broken-h5p-json.h5p`;
        const h5pFile2 = `${path.resolve(
            ''
        )}/test/data/validator/broken-content-json.h5p`;

        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile1)).rejects.toThrow(
            'unable-to-parse-package'
        );
        await expect(validator.validatePackage(h5pFile2)).rejects.toThrow(
            'unable-to-parse-package'
        );
    });

    it('rejects files with h5p.json not conforming to schema', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-h5p-json-schema.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'invalid-h5p-json-file-2'
        );
    });

    it('rejects files with malformed library directory names', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/malformed-library-directory.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'invalid-library-name'
        );
    });

    it('rejects files with library.json not conforming to schema', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-library-json.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'invalid-schema-library-json-file'
        );
    });

    it('rejects files with missing preloaded JavaScript files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/missing-preloaded-js.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'library-missing-file'
        );
    });

    it('rejects files with invalid library directory names', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-library-directory-name.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'library-directory-name-mismatch'
        );
    });

    it('rejects files with invalid language files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-language-file-json.h5p`;
        const validator = new PackageValidator(new EditorConfig(null));
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'invalid-language-file-json'
        );
    });

    it('rejects too high core API version requirements', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-core-version.h5p`;
        const config = new EditorConfig(null);
        config.coreApiVersion.minor = 1;
        const validator = new PackageValidator(config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'api-version-unsupported'
        );
    });

    it('detects errors in several libraries', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/2-invalid-libraries.h5p`;
        const config = new EditorConfig(null);
        const validator = new PackageValidator(config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'invalid-language-file'
        );
    });
});
