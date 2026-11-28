import { ContentScanner } from '../src/ContentScanner';
import LibraryManager from '../src/LibraryManager';
import LibraryName from '../src/LibraryName';
import { ISemanticsEntry } from '../src/types';

describe('scanning the parameters of a selected library', () => {
    const root = new LibraryName('H5P.Parent', 1, 0);
    const library = 'H5P.Child 1.0';

    function scannerWithChildFields(fields: ISemanticsEntry[]) {
        const manager = new LibraryManager(null);
        vi.spyOn(manager, 'getSemantics').mockImplementation(async (name) =>
            name.machineName === root.machineName
                ? [{ type: 'library', name: 'activity' }]
                : fields
        );
        return new ContentScanner(manager);
    }

    it.each([{ library }, { library, params: null }])(
        'reports where parameters are missing when scanning %o',
        async (activity) => {
            const scanner = scannerWithChildFields([
                { type: 'text', name: 'title' }
            ]);
            await expect(
                scanner.scanContent({ activity }, root, () => false)
            ).rejects.toMatchObject({
                errorId: 'missing-library-params',
                httpStatusCode: 400,
                replacements: { path: '$.activity.params' }
            });
        }
    );

    it('allows a selected library with an empty parameter object', async () => {
        const scanner = scannerWithChildFields([
            { type: 'text', name: 'title' }
        ]);
        await expect(
            scanner.scanContent(
                { activity: { library, params: {} } },
                root,
                () => false
            )
        ).resolves.toBeUndefined();
    });

    it('allows an omitted parameter object for a library with no fields', async () => {
        const scanner = scannerWithChildFields([]);
        await expect(
            scanner.scanContent({ activity: { library } }, root, () => false)
        ).resolves.toBeUndefined();
    });
});
