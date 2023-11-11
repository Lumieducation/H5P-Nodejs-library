import { ILibraryName, LibraryName } from '@lumieducation/h5p-server';
import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import YAML from 'yaml';

import {
    GetLibraryFileAsJsonFunction,
    GetLibraryFileAsStringFunction,
    ILogicalOperator,
    ILogicCheck
} from './types';

/**
 * Keeps track of validation functions and structures and caches them in memory.
 */
export default class ValidatorRepository {
    constructor(
        private getLibraryFileAsJson: GetLibraryFileAsJsonFunction,
        private getLibraryFileAsString: GetLibraryFileAsStringFunction
    ) {}

    private validatorCache: {
        [ubername: string]: {
            op?: ValidateFunction | null;
            snapshot?: ValidateFunction | null;
            opLogicCheck?: any | null;
            snapshotLogicCheck?: any | null;
            presence?: ValidateFunction | null;
            presenceLogicCheck?: any | null;
        };
    } = {};

    private ajv: Ajv = new Ajv();

    /**
     * Gets the validator function for the op schema.
     * @param libraryName
     */
    public async getOpSchemaValidator(
        libraryName: ILibraryName
    ): Promise<ValidateFunction> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.op !== undefined) {
            return this.validatorCache[ubername].op;
        }
        let validator: ValidateFunction<unknown>;
        try {
            let schema: any;
            try {
                schema = await this.getLibraryFileAsJson(
                    libraryName,
                    'opSchema.json'
                );
            } catch (error) {
                try {
                    const schemaString = await this.getLibraryFileAsString(
                        libraryName,
                        'opSchema.yaml'
                    );
                    schema = YAML.parse(schemaString);
                } catch {
                    throw error;
                }
            }
            validator = this.ajv.compile(schema);
        } catch (error) {
            console.error('Error while getting op schema:', error);
            this.validatorCache[ubername].op = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].op = validator;
        return validator;
    }

    /**
     * Gets the validator function for snapshots.
     * @param libraryName
     */
    public async getSnapshotSchemaValidator(
        libraryName: ILibraryName
    ): Promise<ValidateFunction> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.snapshot !== undefined) {
            return this.validatorCache[ubername].snapshot;
        }
        let validator: ValidateFunction<unknown>;
        try {
            let schema: any;
            try {
                schema = await this.getLibraryFileAsJson(
                    libraryName,
                    'snapshotSchema.json'
                );
            } catch (error) {
                try {
                    const schemaString = await this.getLibraryFileAsString(
                        libraryName,
                        'snapshotSchema.yaml'
                    );
                    schema = YAML.parse(schemaString);
                } catch {
                    throw error;
                }
            }
            validator = this.ajv.compile(schema);
        } catch (error) {
            console.error('Error while getting snapshot schema:', error);
            this.validatorCache[ubername].snapshot = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].snapshot = validator;
        return validator;
    }

    /**
     * Gets the validator function for the op schema.
     * @param libraryName
     */
    public async getPresenceSchemaValidator(
        libraryName: ILibraryName
    ): Promise<ValidateFunction> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.presence !== undefined) {
            return this.validatorCache[ubername].presence;
        }
        let validator: ValidateFunction<unknown>;
        try {
            let schema: any;
            try {
                schema = await this.getLibraryFileAsJson(
                    libraryName,
                    'presenceSchema.json'
                );
            } catch (error) {
                try {
                    const schemaString = await this.getLibraryFileAsString(
                        libraryName,
                        'presenceSchema.yaml'
                    );
                    schema = YAML.parse(schemaString);
                } catch {
                    throw error;
                }
            }
            validator = this.ajv.compile(schema);
        } catch (error) {
            console.error('Error while getting presence schema:', error);
            this.validatorCache[ubername].presence = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].presence = validator;
        return validator;
    }

    /**
     * Gets the logic check structure for presence
     * @param libraryName
     * @returns the logical structure; note that even if the structure is typed
     * at the moment, is not validated when read from storage, so it is possible
     * that a malformed file in a library does not conform to the types
     */
    public async getOpLogicCheck(
        libraryName: ILibraryName
    ): Promise<(ILogicCheck | ILogicalOperator)[]> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.opLogicCheck !== undefined) {
            return this.validatorCache[ubername].opLogicCheck;
        }
        let logicCheck: any;
        try {
            try {
                logicCheck = await this.getLibraryFileAsJson(
                    libraryName,
                    'opLogicCheck.json'
                );
            } catch (error) {
                try {
                    const logicCheckString = await this.getLibraryFileAsString(
                        libraryName,
                        'opLogicCheck.yaml'
                    );
                    logicCheck = YAML.parse(logicCheckString);
                } catch {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error while getting op logic check:', error);
            this.validatorCache[ubername].opLogicCheck = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].opLogicCheck = logicCheck;
        return logicCheck;
    }

    /**
     * Gets the logic checks for snapshots.
     * @param libraryName
     * @returns the logical structure; note that even if the structure is typed
     * at the moment, is not validated when read from storage, so it is possible
     * that a malformed file in a library does not conform to the types
     */
    public async getSnapshotLogicCheck(
        libraryName: ILibraryName
    ): Promise<any> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.snapshotLogicCheck !== undefined) {
            return this.validatorCache[ubername].snapshotLogicCheck;
        }
        let logicCheck: any;
        try {
            try {
                logicCheck = await this.getLibraryFileAsJson(
                    libraryName,
                    'snapshotLogicCheck.json'
                );
            } catch (error) {
                try {
                    const logicCheckString = await this.getLibraryFileAsString(
                        libraryName,
                        'snapshotLogicCheck.yaml'
                    );
                    logicCheck = YAML.parse(logicCheckString);
                } catch {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error while getting snapshot logic check:', error);
            this.validatorCache[ubername].snapshotLogicCheck = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].snapshotLogicCheck = logicCheck;
        return logicCheck;
    }

    /**
     * Gets the logic check structure for presence
     * @param libraryName
     * @returns the logical structure; note that even if the structure is typed
     * at the moment, is not validated when read from storage, so it is possible
     * that a malformed file in a library does not conform to the types
     */
    public async getPresenceLogicCheck(
        libraryName: ILibraryName
    ): Promise<(ILogicCheck | ILogicalOperator)[]> {
        const ubername = LibraryName.toUberName(libraryName);
        if (this.validatorCache[ubername]?.presenceLogicCheck !== undefined) {
            return this.validatorCache[ubername].presenceLogicCheck;
        }
        let logicCheck: any;
        try {
            try {
                logicCheck = await this.getLibraryFileAsJson(
                    libraryName,
                    'presenceLogicCheck.json'
                );
            } catch (error) {
                try {
                    const logicCheckString = await this.getLibraryFileAsString(
                        libraryName,
                        'presenceLogicCheck.yaml'
                    );
                    logicCheck = YAML.parse(logicCheckString);
                } catch {
                    throw error;
                }
            }
        } catch (error) {
            console.error('Error while getting presence logic check:', error);
            this.validatorCache[ubername].presenceLogicCheck = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].presenceLogicCheck = logicCheck;
        return logicCheck;
    }
}
