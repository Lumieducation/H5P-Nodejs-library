import NodeClam from 'clamscan';
import { mkdtemp, rm, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { basename, join } from 'path';
import { Readable } from 'stream';
import { merge } from 'ts-deepmerge';

import {
    File,
    IFileMalwareScanner,
    Logger,
    MalwareScanResult
} from '@lumieducation/h5p-server';

import { removeUndefinedAttributesAndEmptyObjects } from './helpers';

const log = new Logger('ClamAVScanner');

export type ClamAVScannerOptions = {
    clamdServiceEnabled: boolean;
};

/**
 * A light wrapper calling the ClamAV scanner to scan files for malware. It
 * utilizes the `clamscan` package.
 *
 * Note: You need to have a ClamAV running somewhere to use this and you must
 * update ClamAVs virus definitions regularly yourself from outside this class.
 */
export default class ClamAVScanner implements IFileMalwareScanner {
    /**
     * We have no public constructor, as we need to initialize the ClamAV
     * scanner asynchronously.
     * @param scanner
     */
    private constructor(
        private scanner: NodeClam,
        private readonly options: ClamAVScannerOptions
    ) {
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
        // undefined."), we have to remove undefined properties from the
        // options.
        const clamScanOptions: NodeClam.Options =
            removeUndefinedAttributesAndEmptyObjects(
                merge(
                    {
                        removeInfected: false,
                        quarantineInfected: false,
                        scanRecursively: false
                    },
                    clamavOptions ?? {},
                    envVarOptions ?? {}
                )
            );

        log.debug('Initializing ClamAV scanner with options:', clamScanOptions);

        const clamdServiceEnabled =
            clamScanOptions.preference === 'clamscan'
                ? false
                : !!(
                      clamScanOptions.clamdscan?.socket ||
                      clamScanOptions.clamdscan?.port ||
                      clamScanOptions.clamdscan?.host
                  );

        const clamScan = await new NodeClam().init(clamScanOptions);
        log.debug(
            'ClamAV scanner initialized. Version:',
            await clamScan.getVersion()
        );
        const options: ClamAVScannerOptions = { clamdServiceEnabled };

        return new ClamAVScanner(clamScan, options);
    }

    /**
     * Gets the ClamAV options from environment variables (CLAMSCAN_* and
     * CLAMDSCAN_*). See the docs for what the options do.
     */
    private static getEnvVarOptions(): Partial<NodeClam.Options> {
        // general configuration
        const scanLog = process.env.CLAMSCAN_SCAN_LOG;
        const debugMode = process.env.CLAMSCAN_DEBUG_MODE
            ? process.env.CLAMSCAN_DEBUG_MODE === 'true'
            : undefined;
        const preference = process.env.CLAMSCAN_PREFERENCE;

        // configuration for clamscan (binary)
        const clamscanPath = process.env.CLAMSCAN_PATH;
        const clamscanDb = process.env.CLAMSCAN_DB;
        const clamscanScanArchives = process.env.CLAMSCAN_SCAN_ARCHIVES
            ? process.env.CLAMSCAN_SCAN_ARCHIVES === 'true'
            : undefined;
        const clamscanActive = process.env.CLAMSCAN_ACTIVE
            ? process.env.CLAMSCAN_ACTIVE === 'true'
            : undefined;

        // configuration for clamdscan (daemon with UNIX socket / TCP)
        const clamdscanSocket = process.env.CLAMDSCAN_SOCKET;
        const clamdscanHost = process.env.CLAMDSCAN_HOST;
        const clamdscanPort = process.env.CLAMDSCAN_PORT
            ? Number.parseInt(process.env.CLAMDSCAN_PORT, 10)
            : undefined;
        const clamdscanTimeout = process.env.CLAMDSCAN_TIMEOUT
            ? Number.parseInt(process.env.CLAMDSCAN_TIMEOUT, 10)
            : undefined;
        const clamdscanLocalFallback = process.env.CLAMDSCAN_LOCAL_FALLBACK
            ? process.env.CLAMDSCAN_LOCAL_FALLBACK === 'true'
            : undefined;
        const clamdscanPath = process.env.CLAMDSCAN_PATH;
        const clamdscanConfigFile = process.env.CLAMDSCAN_CONFIG_FILE;
        const clamdscanMultiscan = process.env.CLAMDSCAN_MULTISCAN
            ? process.env.CLAMDSCAN_MULTISCAN === 'true'
            : undefined;
        const clamdscanReloadDb = process.env.CLAMDSCAN_RELOAD_DB
            ? process.env.CLAMDSCAN_RELOAD_DB === 'true'
            : undefined;

        const scanLogOptions: NodeClam.Options = {
            clamscan: {
                path: clamscanPath,
                db: clamscanDb,
                scanArchives: clamscanScanArchives,
                active: clamscanActive
            },
            clamdscan: {
                socket: clamdscanSocket,
                host: clamdscanHost,
                port: clamdscanPort,
                timeout: clamdscanTimeout,
                localFallback: clamdscanLocalFallback,
                path: clamdscanPath,
                configFile: clamdscanConfigFile,
                multiscan: clamdscanMultiscan,
                reloadDb: clamdscanReloadDb
            },
            preference,
            debugMode,
            scanLog
        };

        return scanLogOptions;
    }

    async scan(
        file: string | File
    ): Promise<{ result: MalwareScanResult; viruses?: string }> {
        const normalizedFile: File | { tempFilePath: string; name: string } =
            typeof file === 'string'
                ? { tempFilePath: file, name: basename(file) }
                : file;

        try {
            log.debug(
                'Scanning uploaded file',
                normalizedFile.name,
                'with malware scanner',
                this.name
            );

            let result: NodeClam.Response<{
                file: string;
                isInfected: boolean;
            }>;
            if ('data' in normalizedFile && normalizedFile.data) {
                if (this.options.clamdServiceEnabled) {
                    log.debug('Using stream scan for ClamAV daemon');
                    const readable = Readable.from(normalizedFile.data);
                    result = await this.scanner.scanStream(readable);
                } else {
                    log.debug('Using temporary file scan for ClamAV binary');
                    let tempDir: string | undefined;
                    let tempFilePath: string | undefined;
                    try {
                        tempDir = await mkdtemp(join(tmpdir(), 'clam-av-'));
                        const safeFileName = basename(normalizedFile.name);
                        tempFilePath = join(tempDir, safeFileName || 'upload');
                        await writeFile(tempFilePath, normalizedFile.data);
                        result = await this.scanner.scanFile(tempFilePath);
                    } finally {
                        try {
                            if (tempFilePath) {
                                await unlink(tempFilePath);
                            }
                            if (tempDir) {
                                await rm(tempDir, {
                                    recursive: true,
                                    force: true
                                });
                            }
                            log.debug(
                                `Temporary file and directory deleted: ${tempFilePath}`
                            );
                        } catch (err) {
                            log.debug(
                                `Error deleting temporary file or directory: ${tempFilePath}`,
                                err
                            );
                        }
                    }
                }
            } else if (normalizedFile.tempFilePath) {
                result = await this.scanner.scanFile(
                    normalizedFile.tempFilePath
                );
            } else {
                log.error('No file data or path provided for scanning');
                return { result: MalwareScanResult.NotScanned };
            }

            if (result.isInfected) {
                const viruses = result.viruses.join(',');
                log.info(
                    'Uploaded file',
                    normalizedFile.name,
                    'is infected with:',
                    viruses
                );
                return { result: MalwareScanResult.MalwareFound, viruses };
            }
            log.debug('Uploaded file', normalizedFile.name, 'is clean');
            return { result: MalwareScanResult.Clean };
        } catch (error) {
            log.error('Error while scanning file', normalizedFile.name, error);
            return { result: MalwareScanResult.NotScanned };
        }
    }
}
