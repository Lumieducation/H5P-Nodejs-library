const H5PEditor = require('../src');

describe('getting overview about multiple libraries', () => {

    it('returns basic information about single library', () => {
        return new H5PEditor({
            loadLibrary: (machineName, majorVersion, minorVersion) => Promise.resolve({
                machineName,
                majorVersion,
                minorVersion,
                title: 'the title',
                runnable: 'the runnable',
            })
        })
            .getLibraryOverview(['Foo.Bar 4.2'])

            .then(libraries =>
                expect(libraries).toEqual([
                    {
                        uberName: 'Foo.Bar-4.2',
                        name: 'Foo.Bar',
                        majorVersion: '4',
                        minorVersion: '2',
                        tutorialUrl: '',
                        title: 'the title',
                        runnable: 'the runnable',
                        restricted: false,
                        metadataSettings: null
                    }
                ]))
    })

    it('return information about multiple libraries', () => {
        return new H5PEditor({
            loadLibrary: (machineName, majorVersion, minorVersion) =>
                Promise.resolve({ machineName, majorVersion, minorVersion })
        })
            .getLibraryOverview(['H5P.Image 1.1', 'H5P.Video 1.5'])

            .then(libraries => {
                expect(libraries.map(l => l.uberName)).toEqual([
                    'H5P.Image-1.1',
                    'H5P.Video-1.5'
                ]);
            });
    });
});
