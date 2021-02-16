import LibraryName from '../src/LibraryName';

describe('Library model', () => {
    it('creates library classes from uber names', async () => {
        expect(LibraryName.fromUberName('H5P.Example-1.0')).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            LibraryName.fromUberName('H5P.Example-1.0', {
                useHyphen: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            LibraryName.fromUberName('H5P.Example 1.0', {
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            LibraryName.fromUberName('H5P.Example-1.0', {
                useHyphen: true,
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(
            LibraryName.fromUberName('H5P.Example 1.0', {
                useHyphen: true,
                useWhitespace: true
            })
        ).toMatchObject({
            machineName: 'H5P.Example',
            majorVersion: 1,
            minorVersion: 0
        });

        expect(() => {
            LibraryName.fromUberName('H5P.Example-1.0', {
                useHyphen: false,
                useWhitespace: false
            });
        }).toThrow();
    });

    it("throws an error if an ubername can't be parsed", async () => {
        expect(() => {
            LibraryName.fromUberName('H5P.Test 0.1');
        }).toThrow('invalid-ubername-pattern');

        expect(() => {
            LibraryName.fromUberName('H5P.Test-0.1', {
                useWhitespace: true
            });
        }).toThrow('invalid-ubername-pattern');

        expect(() => {
            LibraryName.fromUberName('XYZ', {
                useHyphen: true,
                useWhitespace: true
            });
        }).toThrow('invalid-ubername-pattern');
    });
});
