import debug from 'debug';

enum logLevelNumber {
    error,
    warn,
    info,
    verbose,
    debug,
    silly
}

export type logLevel =
    | 'error'
    | 'warn'
    | 'info'
    | 'verbose'
    | 'debug'
    | 'silly';

export default class Logger {
    constructor(scope: string) {
        this.scope = scope;

        this.DEBUG = this.ERROR = this.INFO = this.SILLY = this.VERBOSE = this.WARN = debug(
            `h5p:${this.scope}`
        );

        this.logLevel = (process.env.LOG_LEVEL as logLevel) || 'info';
    }

    private DEBUG: (message: string) => void;
    private ERROR: (message: string) => void;
    private INFO: (message: string) => void;
    private logLevel: logLevel;
    private scope: string;
    private SILLY: (message: string) => void;
    private VERBOSE: (message: string) => void;
    private WARN: (message: string) => void;

    public debug(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.debug) {
            this.DEBUG(message);
        }
    }

    public error(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.error) {
            this.ERROR(message);
        }
    }

    public info(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.info) {
            this.INFO(message);
        }
    }

    public silly(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.silly) {
            this.SILLY(message);
        }
    }

    public verbose(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.verbose) {
            this.VERBOSE(message);
        }
    }

    public warn(message: string): void {
        if (logLevelNumber[this.logLevel] >= logLevelNumber.warn) {
            this.WARN(message);
        }
    }
}
