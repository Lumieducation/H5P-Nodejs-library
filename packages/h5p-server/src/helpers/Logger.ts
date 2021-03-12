import debug from 'debug';

enum LogLevelNumber {
    error,
    warn,
    info,
    verbose,
    // eslint-disable-next-line @typescript-eslint/no-shadow
    debug,
    silly
}

export type LogLevel =
    | 'error'
    | 'warn'
    | 'info'
    | 'verbose'
    | 'debug'
    | 'silly';

export default class Logger {
    constructor(scope: string) {
        this.scope = scope;

        // eslint-disable-next-line no-multi-assign
        this.DEBUG = this.ERROR = this.INFO = this.SILLY = this.VERBOSE = this.WARN = debug(
            `h5p:${this.scope}`
        );

        this.logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    }

    private DEBUG: (message: string) => void;
    private ERROR: (message: string) => void;
    private INFO: (message: string) => void;
    private logLevel: LogLevel;
    private scope: string;
    private SILLY: (message: string) => void;
    private VERBOSE: (message: string) => void;
    private WARN: (message: string) => void;

    public debug(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.debug) {
            this.DEBUG(message);
        }
    }

    public error(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.error) {
            this.ERROR(message);
        }
    }

    public info(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.info) {
            this.INFO(message);
        }
    }

    public silly(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.silly) {
            this.SILLY(message);
        }
    }

    public verbose(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.verbose) {
            this.VERBOSE(message);
        }
    }

    public warn(message: string): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.warn) {
            this.WARN(message);
        }
    }
}
