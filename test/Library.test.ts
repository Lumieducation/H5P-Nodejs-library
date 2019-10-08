import H5pError from '../src/helpers/H5pError';
import Library from '../src/Library';

describe('Library model', () => {
    it('creates library classes from uber names', async () => {
        expect(Library.createFromUberName('H5P.Example-1.0')).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            Library.createFromUberName('H5P.Example-1.0', { useHyphen: true })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            Library.createFromUberName('H5P.Example 1.0', {
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            Library.createFromUberName('H5P.Example-1.0', {
                useHyphen: true,
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            Library.createFromUberName('H5P.Example 1.0', {
                useHyphen: true,
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(() => {
            Library.createFromUberName('H5P.Example-1.0', {
                useHyphen: false,
                useWhitespace: false
            });
        }).toThrow();
    });
});
