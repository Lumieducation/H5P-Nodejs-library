import {
    IFileMalwareScanner,
    MalwareScanResult
} from '@lumieducation/h5p-server';

export default class ClamAVScanner implements IFileMalwareScanner {
    readonly name: string = 'Virus scanner using ClamAV';

    scan(file: string, mimetype: string): Promise<MalwareScanResult> {
        throw new Error('Method not implemented.');
    }
}
