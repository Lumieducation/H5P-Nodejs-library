import debug from 'debug';

export type logLevel = 'info' | 'error';

export default class Logger {
    constructor(scope: string) {
        this.scope = scope;

        this.INFO = debug(`h5p:info:${this.scope}`);
        this.ERROR = debug(`h5p:error:${this.scope}`);
        this.WARN = debug(`h5p:warn:${this.scope}`);
    }

    private ERROR: (message: string) => void;
    private INFO: (message: string) => void;
    private scope: string;
    private WARN: (message: string) => void;

    public error(message: string): void {
        this.ERROR(message);
    }

    public info(message: string): void {
        this.INFO(message);
    }

    public warn(message: string): void {
        this.WARN(message);
    }
}
