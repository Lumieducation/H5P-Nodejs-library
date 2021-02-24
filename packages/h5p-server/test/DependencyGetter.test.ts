import path from 'path';

import DependencyGetter from '../src/DependencyGetter';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import LibraryName from '../src/LibraryName';

describe('basic file library manager functionality', () => {
    it('determines dependencies of libraries', async () => {
        const storage = new FileLibraryStorage(
            path.resolve(`${__dirname}/../../../test/data/library-dependency`)
        );

        const dependencyGetter = new DependencyGetter(storage);

        expect(
            (
                await dependencyGetter.getDependentLibraries(
                    [new LibraryName('Lib1', 1, 0)],
                    {
                        editor: true,
                        preloaded: true
                    }
                )
            )
                .map((d) => LibraryName.toUberName(d))
                .sort()
        ).toMatchObject([
            'Lib1-1.0',
            'Lib2-1.0',
            'Lib3-1.0',
            'Lib4-1.0',
            'Lib5-1.0'
        ]);

        expect(
            (
                await dependencyGetter.getDependentLibraries(
                    [new LibraryName('Lib1', 1, 0)],
                    {
                        preloaded: true
                    }
                )
            )
                .map((d) => LibraryName.toUberName(d))
                .sort()
        ).toMatchObject(['Lib1-1.0', 'Lib2-1.0', 'Lib3-1.0', 'Lib5-1.0']);

        expect(
            (
                await dependencyGetter.getDependentLibraries(
                    [new LibraryName('Lib4', 1, 0)],
                    {
                        editor: true,
                        preloaded: true
                    }
                )
            )
                .map((d) => LibraryName.toUberName(d))
                .sort()
        ).toMatchObject(['Lib4-1.0', 'Lib5-1.0']);

        expect(
            (
                await dependencyGetter.getDependentLibraries(
                    [new LibraryName('Lib5', 1, 0)],
                    {
                        editor: true,
                        preloaded: true
                    }
                )
            )
                .map((d) => LibraryName.toUberName(d))
                .sort()
        ).toMatchObject(['Lib5-1.0']);
    });
});
