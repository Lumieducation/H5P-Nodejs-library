import path from 'path';

import DependencyGetter from '../src/DependencyGetter';
import Library from '../src/Library';
import LibraryManager from '../src/LibraryManager';

import FileLibraryStorage from '../examples/implementation/FileLibraryStorage';

describe('basic file library manager functionality', () => {
    it('determines dependencies of libraries', async () => {
        const libManager = new LibraryManager(
            new FileLibraryStorage(path.resolve('test/data/library-dependency'))
        );

        const dependencyGetter = new DependencyGetter(libManager);

        expect(
            (await dependencyGetter.getDependentLibraries(
                [new Library('Lib1', 1, 0)],
                {
                    editor: true,
                    preloaded: true
                }
            ))
                .map(d => d.getDirName())
                .sort()
        ).toMatchObject([
            'Lib1-1.0',
            'Lib2-1.0',
            'Lib3-1.0',
            'Lib4-1.0',
            'Lib5-1.0'
        ]);

        expect(
            (await dependencyGetter.getDependentLibraries(
                [new Library('Lib1', 1, 0)],
                {
                    preloaded: true
                }
            ))
                .map(d => d.getDirName())
                .sort()
        ).toMatchObject(['Lib1-1.0', 'Lib2-1.0', 'Lib3-1.0', 'Lib5-1.0']);

        expect(
            (await dependencyGetter.getDependentLibraries(
                [new Library('Lib4', 1, 0)],
                {
                    editor: true,
                    preloaded: true
                }
            ))
                .map(d => d.getDirName())
                .sort()
        ).toMatchObject(['Lib4-1.0', 'Lib5-1.0']);

        expect(
            (await dependencyGetter.getDependentLibraries(
                [new Library('Lib5', 1, 0)],
                {
                    editor: true,
                    preloaded: true
                }
            ))
                .map(d => d.getDirName())
                .sort()
        ).toMatchObject(['Lib5-1.0']);
    });
});
