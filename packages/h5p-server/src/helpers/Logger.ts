import debugLib from 'debug';

enum LogLevelNumber {
    error,
    warn,
    info,
    verbose,
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
    constructor(private scope: string) {
        this.DEBUG =
            this.ERROR =
            this.INFO =
            this.SILLY =
            this.VERBOSE =
            this.WARN =
                debugLib(`h5p:${this.scope}`);

        this.logLevel =
            (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info';
    }

    private DEBUG: (...args: any[]) => any;
    private ERROR: (...args: any[]) => any;
    private INFO: (...args: any[]) => any;
    private logLevel: LogLevel;
    private SILLY: (...args: any[]) => any;
    private VERBOSE: (...args: any[]) => any;
    private WARN: (...args: any[]) => any;

    public debug(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.debug) {
            this.DEBUG(...args);
        }
    }

    public error(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.error) {
            this.ERROR(...args);
        }
    }

    public info(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.info) {
            this.INFO(...args);
        }
    }

    public silly(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.silly) {
            this.SILLY(...args);
        }
    }

    public verbose(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.verbose) {
            this.VERBOSE(...args);
        }
    }

    public warn(...args: any[]): void {
        if (LogLevelNumber[this.logLevel] >= LogLevelNumber.warn) {
            this.WARN(...args);
        }
    }
}
