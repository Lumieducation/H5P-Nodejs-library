import path from 'path';
import { readFile } from 'fs/promises';
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
});
