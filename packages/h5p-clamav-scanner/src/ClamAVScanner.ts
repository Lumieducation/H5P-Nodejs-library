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
        const envVarOptions = ClamAVScanner.getEnvVarOptions();
        const clamScan = await new NodeClam().init({
            ...(clamavOptions ?? {}),
            clamscan: {
                ...(clamavOptions?.clamscan ?? {}),
                ...(envVarOptions?.clamscan ?? {})
            },
            clamdscan: {
                ...(clamavOptions?.clamdscan ?? {}),
                ...(envVarOptions?.clamdscan ?? {})
            },
            preference: clamavOptions?.preference || envVarOptions?.preference,
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

    /**
     * Gets the ClamAV options from environment variables (CLAMSCAN_* and
     * CLAMDSCAN_*).
     */
    private static getEnvVarOptions(): Partial<NodeClam.Options> {
        const clamscanPath = process.env.CLAMSCAN_PATH;
        const clamscanDb = process.env.CLAMSCAN_DB;
        const clamscanScanArchives =
            process.env.CLAMSCAN_SCAN_ARCHIVES === 'true';
        const clamscanActive = process.env.CLAMSCAN_ACTIVE === 'true';

        const clamdscanSocket = process.env.CLAMDSCAN_SOCKET;
        const clamdscanHost = process.env.CLAMDSCAN_HOST;
        const clamdscanPort = process.env.CLAMDSCAN_PORT
            ? Number.parseInt(process.env.CLAMDSCAN_PORT, 10)
            : undefined;
        const clamdscanTimeout = process.env.CLAMDSCAN_TIMEOUT
            ? Number.parseInt(process.env.CLAMDSCAN_TIMEOUT, 10)
            : undefined;
        const clamdscanLocalFallback =
            process.env.CLAMDSCAN_LOCAL_FALLBACK === 'true';
        const clamdscanPath = process.env.CLAMDSCAN_PATH;
        const clamdscanConfigFile = process.env.CLAMDSCAN_CONFIG_FILE;
        const clamdscanMultiscan = process.env.CLAMDSCAN_MULTISCAN === 'true';
        const clamdscanReloadDb = process.env.CLAMDSCAN_RELOAD_DB === 'true';
        const clamdscanActive = process.env.CLAMDSCAN_ACTIVE === 'true';
        const clamdscanBypassTest =
            process.env.CLAMDSCAN_BYPASS_TEST === 'true';

        const clamscanPreference = process.env.CLAMSCAN_PREFERENCE;

        return {
            clamscan:
                clamscanPath ||
                clamscanDb ||
                clamscanScanArchives ||
                clamscanActive
                    ? {
                          path: clamscanPath,
                          db: clamscanDb,
                          scanArchives: clamscanScanArchives,
                          active: clamdscanActive
                      }
                    : undefined,
            clamdscan:
                clamdscanSocket ||
                clamdscanHost ||
                clamdscanPort ||
                clamdscanTimeout ||
                clamdscanLocalFallback ||
                clamdscanPath ||
                clamdscanConfigFile ||
                clamdscanMultiscan ||
                clamdscanReloadDb ||
                clamdscanActive ||
                clamdscanBypassTest
                    ? {
                          socket: clamdscanSocket,
                          host: clamdscanHost,
                          port: clamdscanPort,
                          timeout: clamdscanTimeout,
                          localFallback: clamdscanLocalFallback,
                          path: clamdscanPath,
                          configFile: clamdscanConfigFile,
                          multiscan: clamdscanMultiscan,
                          reloadDb: clamdscanReloadDb,
                          active: clamdscanActive,
                          bypassTest: clamdscanBypassTest
                      }
                    : undefined,

            preference: clamscanPreference
        };
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
