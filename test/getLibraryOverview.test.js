const H5PEditor = require('../src');

describe('getLibraryOverview: response', () => {
    it('includes the uberName', done => {
        const h5pEditor = new H5PEditor({
            loadLibrary: () =>
                Promise.resolve({
                    machineName: 'H5P.Image',
                    majorVersion: '1',
                    minorVersion: '1'
                })
        });

        h5pEditor.getLibraryOverview(['H5P.Image 1.1']).then(libraries => {
            expect(libraries[0].uberName).toBe('H5P.Image-1.1');
            done();
        });
    });

    it('includes the majorVersion', done => {
        const h5pEditor = new H5PEditor({
            loadLibrary: () =>
                Promise.resolve({
                    machineName: 'H5P.Image',
                    majorVersion: '1',
                    minorVersion: '1'
                })
        });

        h5pEditor.getLibraryOverview(['H5P.Image 1.1']).then(libraries => {
            expect(libraries[0].majorVersion).toBe('1');
            done();
        });
    });

    it('includes the minorVersion', done => {
        const h5pEditor = new H5PEditor({
            loadLibrary: () =>
                Promise.resolve({
                    machineName: 'H5P.Image',
                    majorVersion: '1',
                    minorVersion: '1'
                })
        });

        h5pEditor.getLibraryOverview(['H5P.Image 1.1']).then(libraries => {
            expect(libraries[0].minorVersion).toBe('1');
            done();
        });
    });

    it('includes the machineName as name', done => {
        const h5pEditor = new H5PEditor({
            loadLibrary: () =>
                Promise.resolve({
                    machineName: 'H5P.Image',
                    majorVersion: '1',
                    minorVersion: '1'
                })
        });

        h5pEditor.getLibraryOverview(['H5P.Image 1.1']).then(libraries => {
            expect(libraries[0].name).toBe('H5P.Image');
            done();
        });
    });

    it('resolves multiple libraries', done => {
        const h5pEditor = new H5PEditor({
            loadLibrary: (machineName, majorVersion, minorVersion) =>
                Promise.resolve({
                    machineName,
                    majorVersion,
                    minorVersion
                })
        });

        h5pEditor
            .getLibraryOverview(['H5P.Image 1.1', 'H5P.Video 1.5'])
            .then(libraries => {
                expect(libraries.length).toBe(2);
                done();
            });
    });
});
