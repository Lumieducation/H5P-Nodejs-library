import { ILibraryName, LibraryName } from '@lumieducation/h5p-server';
import Ajv, { ValidateFunction } from 'ajv/dist/2020';
import {
    GetLibraryFileAsJsonFunction,
    ILogicalOperator,
    ILogicCheck
} from './types';

/**
 * Keeps track of validation functions and structures and caches them in memory.
 */
export default class ValidatorRepository {
    constructor(private getLibraryFileAsJson: GetLibraryFileAsJsonFunction) {}

    private validatorCache: {
        [ubername: string]: {
            op?: ValidateFunction | null;
            snapshot?: ValidateFunction | null;
            opLogicCheck?: any | null;
            snapshotLogicCheck?: any | null;
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
            const schemaJson = await this.getLibraryFileAsJson(
                libraryName,
                'opSchema.json'
            );
            validator = this.ajv.compile(schemaJson);
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
            const schemaJson = await this.getLibraryFileAsJson(
                libraryName,
                'snapshotSchema.json'
            );
            validator = this.ajv.compile(schemaJson);
        } catch (error) {
            console.error('Error while getting op schema:', error);
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
     * Gets the logic check structure for ops
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
            logicCheck = await this.getLibraryFileAsJson(
                libraryName,
                'opLogicCheck.json'
            );
        } catch (error) {
            console.error('Error while getting op schema:', error);
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
            logicCheck = await this.getLibraryFileAsJson(
                libraryName,
                'snapshotLogicCheck.json'
            );
        } catch (error) {
            console.error('Error while getting op schema:', error);
            this.validatorCache[ubername].snapshotLogicCheck = null;
            return null;
        }
        if (!this.validatorCache[ubername]) {
            this.validatorCache[ubername] = {};
        }
        this.validatorCache[ubername].snapshotLogicCheck = logicCheck;
        return logicCheck;
    }
}
