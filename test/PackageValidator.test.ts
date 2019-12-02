import * as fsExtra from 'fs-extra';
import * as path from 'path';

import EditorConfig from '../examples/EditorConfig';
import PackageValidator from '../src/PackageValidator';
import TranslationService from '../src/TranslationService';

describe('validating H5P files', () => {
    let translationService: TranslationService;

    beforeEach(async () => {
        const englishStrings = await fsExtra.readJSON(
            `${path.resolve('')}/src/translations/en.json`
        );
        translationService = new TranslationService(
            englishStrings,
            englishStrings
        );
    });

    it('correctly validates valid h5p files', async () => {
        const h5pFile1 = `${path.resolve('')}/test/data/validator/valid1.h5p`;
        const h5pFile2 = `${path.resolve('')}/test/data/validator/valid2.h5p`;

        try {
            const validator = new PackageValidator(
                translationService,
                new EditorConfig(null)
            );
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
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            translationService.getTranslation('missing-h5p-extension')
        );
    });

    it('rejects non-valid zip files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/corrupt_archive.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            translationService.getTranslation('unable-to-unzip')
        );
    });

    it('rejects too large content', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid2.h5p`;
        const config = new EditorConfig(null);
        config.maxFileSize = 1024;

        const validator = new PackageValidator(translationService, config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'One of the files inside the package exceeds the maximum file size allowed. (<em>H5P.GreetingCard-1.0/README.md</em> <em>1.12 KB</em> &gt; <em>1 KB</em>)\nOne of the files inside the package exceeds the maximum file size allowed. (<em>H5P.GreetingCard-1.0/greetingcard.js</em> <em>1.22 KB</em> &gt; <em>1 KB</em>)\nOne of the files inside the package exceeds the maximum file size allowed. (<em>content/earth.jpg</em> <em>31.48 KB</em> &gt; <em>1 KB</em>)'
        );
    });

    it('rejects too large total content size', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid1.h5p`;
        const config = new EditorConfig(null);
        config.maxTotalSize = 10;

        const validator = new PackageValidator(translationService, config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The total size of the unpacked files exceeds the maximum size allowed. (<em>9.21 MB</em> &gt; <em>10 Bytes</em>)'
        );
    });

    it('rejects invalid file extensions', async () => {
        const h5pFile = `${path.resolve('')}/test/data/validator/valid2.h5p`;
        const config = new EditorConfig(null);
        config.libraryWhitelist = 'json js css';
        config.contentWhitelist = 'json';

        const validator = new PackageValidator(translationService, config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'File &quot;<em>content/earth.jpg</em>&quot; not allowed. Only files with the following extensions are allowed: <em>json</em>.\nFile &quot;<em>H5P.GreetingCard-1.0/README.md</em>&quot; not allowed. Only files with the following extensions are allowed: <em>json</em>.'
        );
    });

    it('rejects broken json files', async () => {
        const h5pFile1 = `${path.resolve(
            ''
        )}/test/data/validator/broken-h5p-json.h5p`;
        const h5pFile2 = `${path.resolve(
            ''
        )}/test/data/validator/broken-content-json.h5p`;

        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile1)).rejects.toThrow(
            'Unable to parse JSON from the package: <em>h5p.json</em>'
        );
        await expect(validator.validatePackage(h5pFile2)).rejects.toThrow(
            'Unable to parse JSON from the package: <em>content/content.json</em>'
        );
    });

    it('rejects files with h5p.json not conforming to schema', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-h5p-json-schema.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The main h5p.json does not conform to the schema (<em>should have required property &#39;mainLibrary&#39;</em>)'
        );
    });

    it('rejects files with malformed library directory names', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/malformed-library-directory.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'Invalid library name: <em>library!</em>'
        );
    });

    it('rejects files with library.json not conforming to schema', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-library-json.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The library.json file of the library <em>H5P.GreetingCard-1.0/library.json</em> is invalid (<em>should have required property &#39;majorVersion&#39;</em>)'
        );
    });

    it('rejects files with missing preloaded JavaScript files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/missing-preloaded-js.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The file &quot;<em>greetingcard.js</em>&quot; is missing from library: &quot;<em>H5P.GreetingCard-1.0</em>&quot;'
        );
    });

    it('rejects files with invalid library directory names', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-library-directory-name.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'Library directory name must match machineName or machineName-majorVersion.minorVersion (from library.json). (Directory: <em>H5P.GreetingCard-1.0</em> , machineName: <em>H5P.AnotherLibrary</em>, majorVersion: <em>1</em>, minorVersion: <em>0</em>)'
        );
    });

    it('rejects files with invalid language files', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-language-file-json.h5p`;
        const validator = new PackageValidator(
            translationService,
            new EditorConfig(null)
        );
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The JSON of the language file <em>fr.json</em> in the library <em>H5P.GreetingCard-1.0</em> cannot be parsed'
        );
    });

    it('rejects too high core API version requirements', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/invalid-core-version.h5p`;
        const config = new EditorConfig(null);
        config.coreApiVersion.minor = 1;
        const validator = new PackageValidator(translationService, config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            'The system was unable to install the <em>H5P.GreetingCard-1.0</em> component from the package, it requires a newer version of the H5P plugin. This site is currently running version <em>1.1</em>, whereas the required version is <em>1.19</em> or higher. You should consider upgrading and then try again.'
        );
    });

    it('detects errors in several libraries', async () => {
        const h5pFile = `${path.resolve(
            ''
        )}/test/data/validator/2-invalid-libraries.h5p`;
        const config = new EditorConfig(null);
        const validator = new PackageValidator(translationService, config);
        await expect(validator.validatePackage(h5pFile)).rejects.toThrow(
            "Invalid language file <em>XXX!.json</em> in library <em>H5P.GreetingCard-1.0</em>'\nThe library.json file of the library <em>H5P.GreetingCard2-1.0/library.json</em> is invalid (<em>should have required property &#39;title&#39;</em>)"
        );
    });
});
