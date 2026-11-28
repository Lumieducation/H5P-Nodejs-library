import { ContentFileScanner } from '../src/ContentFileScanner';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';
import SemanticsEnforcer from '../src/SemanticsEnforcer';
import { ISemanticsEntry } from '../src/types';

const host = { machineName: 'Test.Host', majorVersion: 1, minorVersion: 0 };

function createLibraryManager(): LibraryManager {
    const manager = new LibraryManager(
        new FileLibraryStorage('test/data/libraries')
    );
    const field: ISemanticsEntry = {
        name: 'media',
        type: 'library',
        options: ['H5P.Example1 1.1'],
        optional: true
    };
    // The child uses the checked-in example library's image semantics.
    vi.spyOn(manager, 'getSemantics').mockResolvedValueOnce([
        field,
        { name: 'items', type: 'list', field }
    ]);
    return manager;
}

function createParams() {
    return {
        media: null,
        items: [
            null,
            {
                library: 'H5P.Example1 1.1',
                params: { image: { path: 'images/photo.png' } }
            }
        ]
    };
}

it('finds files after an empty nested library field or list item', async () => {
    const scanner = new ContentFileScanner(createLibraryManager());
    const files = await scanner.scanForFiles(createParams(), host);
    expect(files.map((file) => file.filePath)).toEqual(['images/photo.png']);
});

it('removes an empty library field and preserves the populated sibling during validation', async () => {
    const enforcer = new SemanticsEnforcer(createLibraryManager());
    const params = createParams();
    const populatedSibling = createParams().items[1];
    await enforcer.enforceSemanticStructure(params, host);
    expect(params).not.toHaveProperty('media');
    expect(params.items).toContainEqual(populatedSibling);
});
