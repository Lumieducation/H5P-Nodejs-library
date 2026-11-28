import { ContentFileScanner } from '../src/ContentFileScanner';
import FileLibraryStorage from '../src/implementation/fs/FileLibraryStorage';
import LibraryManager from '../src/LibraryManager';

vi.mock('../src/implementation/fs/FileLibraryStorage');

describe('scanning a list of files', () => {
    const example = {
        machineName: 'H5P.Example',
        majorVersion: 1,
        minorVersion: 0
    };
    const libraryManager = new LibraryManager(new FileLibraryStorage(''));
    vi.spyOn(libraryManager, 'getSemantics').mockResolvedValue([
        {
            name: 'files',
            type: 'list',
            optional: true,
            field: { name: 'attachment', type: 'file' }
        }
    ]);
    const scanner = new ContentFileScanner(libraryManager);

    it.each([null, {}, 'abc', 42, false])(
        'rejects a non-array list (%j)',
        async (files) => {
            await expect(
                scanner.scanForFiles({ files }, example)
            ).rejects.toMatchObject({
                errorId: 'invalid-content-list',
                replacements: { path: '$.files' },
                httpStatusCode: 400
            });
        }
    );

    it('accepts omitted and empty lists', async () => {
        await expect(scanner.scanForFiles({}, example)).resolves.toEqual([]);
        await expect(
            scanner.scanForFiles({ files: [] }, example)
        ).resolves.toEqual([]);
    });

    it('reports file references at their list indices', async () => {
        const files = [
            { path: 'files/first.pdf' },
            { path: 'files/second.pdf' }
        ];
        const references = await scanner.scanForFiles({ files }, example);
        expect(
            references.map(({ filePath, context }) => [
                filePath,
                context.jsonPath
            ])
        ).toEqual([
            ['files/first.pdf', '$.files[0]'],
            ['files/second.pdf', '$.files[1]']
        ]);
    });
});
