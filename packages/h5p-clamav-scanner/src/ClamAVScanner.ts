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

        // Because of how the clamscan package checks for the presence of the
        // properties in the options object (Object.prototype.hasOwnProperty:
        // "The hasOwnProperty() method returns true if the specified property
        // is a direct property of the object — even if the value is null or
        // undefined."), we can't add them with destructuring or setting
        // undefined values. We need to add them by setting them one-by-one
        // manually.
        const options: NodeClam.Options = {
            removeInfected: false,
            quarantineInfected: false,
            scanRecursively: false
        };
        if (clamavOptions?.preference || envVarOptions?.preference) {
            options.preference =
                clamavOptions?.preference || envVarOptions?.preference;
        }
        if (clamavOptions?.debugMode || envVarOptions?.debugMode) {
            options.debugMode =
                clamavOptions?.debugMode || envVarOptions?.debugMode;
        }
        if (clamavOptions?.scanLog || envVarOptions?.scanLog) {
            options.scanLog = clamavOptions?.scanLog || envVarOptions?.scanLog;
        }
        if (clamavOptions?.clamscan || envVarOptions?.clamscan) {
            options.clamscan = {
                ...clamavOptions?.clamscan,
                ...envVarOptions?.clamscan
            };
        }
        if (clamavOptions?.clamdscan || envVarOptions?.clamdscan) {
            options.clamdscan = {
                ...clamavOptions?.clamdscan,
                ...envVarOptions?.clamdscan
            };
        }

        const clamScan = await new NodeClam().init(options);
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
        // general configuration
        const scanLog = process.env.CLAMSCAN_SCAN_LOG;
        const debugMode = process.env.CLAMSCAN_DEBUG_MODE === 'true';
        const preference = process.env.CLAMSCAN_PREFERENCE;

        // configuration for clamscan (binary)
        const clamscanPath = process.env.CLAMSCAN_PATH;
        const clamscanDb = process.env.CLAMSCAN_DB;
        const clamscanScanArchives =
            process.env.CLAMSCAN_SCAN_ARCHIVES === 'true';
        const clamscanActive = process.env.CLAMSCAN_ACTIVE === 'true';

        // configuration for clamdscan (daemon with UNIX socket / TCP)
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

        const scanLogOptions: NodeClam.Options = {
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
            preference,
            debugMode,
            scanLog
        };

        return scanLogOptions;
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
