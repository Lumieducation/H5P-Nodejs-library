export interface ILibraryManagementOverviewItem {
    canBeDeleted: boolean;
    canBeUpdated: boolean;
    dependentsCount: number;
    instancesAsDependencyCount: number;
    instancesCount: number;
    isAddon: boolean;
    machineName: string;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
    restricted: boolean;
    runnable: boolean;
    title: string;
}
