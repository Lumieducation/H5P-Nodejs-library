import NodeClam from 'clamscan';

import {
    IFileMalwareScanner,
    MalwareScanResult,
    Logger
} from '@lumieducation/h5p-server';

const log = new Logger('ClamAVScanner');

/**
 * A light wrapper calling the ClamAV scanner to scan files for malware. It
 * utilizes the `clamscan` package.
 *
 * Note: You need to have a running ClamAV daemon on your system to use this and
 * you must update ClamAVs virus definitions regularly yourself from outside
 * this class.
 */
export default class ClamAVScanner implements IFileMalwareScanner {
    /**
     * We have no public constructor, as we need to initialize the ClamAV
     * scanner asynchronously.
     * @param scanner
     */
    private constructor(private scanner: NodeClam) {
        log.debug('initialize');
    }

    public readonly name: string = 'ClamAV virus scanner';

    /**
     * Factory method to create a new instance of ClamAVScanner. You can't use
     * the constructor directly, as we need to initialize the ClamAV scanner
     * asynchronously.
     * @param clamavOptions the options as required by the ClamAV scanner (see
     * https://www.npmjs.com/package/clamscan). This is simply passed through to
     * ClamAV, expect for the parameters `removeInfected`, `quarantineInfected`
     * and `scanRecursively`: these are set to false to make sure the behavior
     * is as @lumieducation/h5p-server expects it.
     */
    public static async create(
        clamavOptions?: NodeClam.Options
    ): Promise<ClamAVScanner> {
        const clamScan = await new NodeClam().init({
            ...(clamavOptions ?? {}),
            removeInfected: false,
            quarantineInfected: false,
            scanRecursively: false
        });
        log.debug(
            'ClamAV scanner initialized. Version:',
            await clamScan.getVersion()
        );
        return new ClamAVScanner(clamScan);
    }

    async scan(
        file: string
    ): Promise<{ result: MalwareScanResult; viruses?: string }> {
        try {
            const result = await this.scanner.isInfected(file);
            if (result.isInfected) {
                const viruses = result.viruses.join(',');
                log.info('Uploaded file', file, 'is infected with:', viruses);
                return { result: MalwareScanResult.MalwareFound, viruses };
            }
            log.debug('Uploaded file', file, 'is clean');
            return { result: MalwareScanResult.Clean };
        } catch (error) {
            log.error('Error while scanning file', file, error);
            return { result: MalwareScanResult.NotScanned };
        }
    }
}
