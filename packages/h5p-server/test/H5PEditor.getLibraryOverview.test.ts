import H5PEditor from '../src/H5PEditor';
import H5PConfig from '../src/implementation/H5PConfig';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';

describe('getting overview about multiple libraries', () => {
    it('returns basic information about single library', () =>
        new H5PEditor(
            null,
            new H5PConfig(null),
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`),
            null,
            null
        )
            .getLibraryOverview(['H5P.Example1 1.1'])
            .then((libraries) =>
                expect(libraries).toEqual([
                    {
                        majorVersion: 1,
                        metadataSettings: null,
                        minorVersion: 1,
                        name: 'H5P.Example1',
                        restricted: false,
                        runnable: 1,
                        title: 'Example 1',
                        tutorialUrl: '',
                        uberName: 'H5P.Example1 1.1'
                    }
                ])
            ));

    it('returns localized titles', async () => {
        const localizationSpy = jest.fn((key, language) => '_localized_');
        const editor = new H5PEditor(
            null,
            new H5PConfig(null),
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`),
            null,
            null,
            localizationSpy,
            undefined,
            {
                enableLibraryNameLocalization: true
            }
        );
        const libraries = await editor.getLibraryOverview(
            ['H5P.Example1 1.1'],
            'de'
        );
        expect(localizationSpy).toHaveBeenCalled();
        expect(libraries).toEqual([
            {
                majorVersion: 1,
                metadataSettings: null,
                minorVersion: 1,
                name: 'H5P.Example1',
                restricted: false,
                runnable: 1,
                title: '_localized_',
                tutorialUrl: '',
                uberName: 'H5P.Example1 1.1'
            }
        ]);
    });

    it('falls back to default string if no locale was found', async () => {
        const localizationSpy = jest.fn((key, language) => key);
        const editor = new H5PEditor(
            null,
            new H5PConfig(null),
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`),
            null,
            null,
            localizationSpy,
            undefined,
            {
                enableLibraryNameLocalization: true
            }
        );
        const libraries = await editor.getLibraryOverview(
            ['H5P.Example1 1.1'],
            'de'
        );
        expect(localizationSpy).toHaveBeenCalled();
        expect(libraries).toEqual([
            {
                majorVersion: 1,
                metadataSettings: null,
                minorVersion: 1,
                name: 'H5P.Example1',
                restricted: false,
                runnable: 1,
                title: 'Example 1',
                tutorialUrl: '',
                uberName: 'H5P.Example1 1.1'
            }
        ]);
    });

    it('return information about multiple libraries', () =>
        new H5PEditor(
            null,
            new H5PConfig(null),
            new FileLibraryStorage(`${__dirname}/../../../test/data/libraries`),
            null,
            null
        )
            .getLibraryOverview(['H5P.Example1 1.1', 'H5P.Example3 2.1'])

            .then((libraries) => {
                expect(libraries.map((l) => l.uberName)).toEqual([
                    'H5P.Example1 1.1',
                    'H5P.Example3 2.1'
                ]);
            }));
});
