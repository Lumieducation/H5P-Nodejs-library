export type ContentId = string;

export interface IDependency {
    machineName: string;
    majorVersion: number;
    minorVersion: number;
}

export interface IMetadata extends IDependency {
    patchVersion: number;
}
