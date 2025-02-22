import path from 'path';
import { readFile, stat } from 'fs/promises';
import { withDir } from 'tmp-promise';

import User from './User';
import { createH5PEditor } from './helpers/H5PEditor';
import { MalwareScanResult, IFileMalwareScanner } from '../src/types';

class MockMalwareScanner implements IFileMalwareScanner {
    readonly name: string = 'Mock Scanner';

    async scan(
        file: string
    ): Promise<{ result: MalwareScanResult; viruses?: string }> {
        // Simulate scanning logic
        if (file.includes('eicar')) {
            return {
                result: MalwareScanResult.MalwareFound,
                viruses: 'MockVirus'
            };
        }
        return { result: MalwareScanResult.Clean };
    }
}

describe('H5PEditor: uploading viruses', () => {
    it('rejects h5p packages with virus in content file', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath, undefined, {
                    malwareScanners: [new MockMalwareScanner()]
                });
                const user = new User();

                const fileBuffer = await readFile(
                    path.resolve('test/data/validator/h5p-with-virus.h5p')
                );

                await expect(
                    h5pEditor.uploadPackage(fileBuffer, user)
                ).rejects.toThrow('upload-malware-found');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('rejects individually uploaded content files with viruses', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                const { h5pEditor } = createH5PEditor(tempDirPath, undefined, {
                    malwareScanners: [new MockMalwareScanner()]
                });
                const user = new User();

                await expect(
                    h5pEditor.saveContentFile(
                        undefined,
                        {
                            name: 'image',
                            type: 'image'
                        },
                        {
                            mimetype: 'image/jpeg',
                            name: 'eicar.jpg',
                            tempFilePath: 'never-used/eicar.jpg',
                            size: 1024
                        },
                        user
                    )
                ).rejects.toThrow('upload-malware-found');
            },
            { keep: false, unsafeCleanup: true }
        );
    });

    it('uses all provided virus scanners', async () => {
        await withDir(
            async ({ path: tempDirPath }) => {
                // setup
                const mockScanner1 = new MockMalwareScanner();
                const mockScanner2 = new MockMalwareScanner();

                const scannerSpy1 = jest.spyOn(mockScanner1, 'scan');
                const scannerSpy2 = jest.spyOn(mockScanner2, 'scan');

                const { h5pEditor } = createH5PEditor(tempDirPath, undefined, {
                    malwareScanners: [mockScanner1, mockScanner2]
                });

                const originalPath = path.resolve(
                    'test/data/sample-content/content/earth.jpg'
                );

                // perform action
                await h5pEditor.saveContentFile(
                    undefined,
                    {
                        name: 'image',
                        type: 'image'
                    },
                    {
                        mimetype: 'image/jpeg',
                        name: 'earth.JPG',
                        tempFilePath: originalPath,
                        size: (await stat(originalPath)).size
                    },
                    new User()
                );

                // check result
                expect(scannerSpy1).toHaveBeenCalled();
                expect(scannerSpy2).toHaveBeenCalled();
            },
            { keep: false, unsafeCleanup: true }
        );
    });
});
