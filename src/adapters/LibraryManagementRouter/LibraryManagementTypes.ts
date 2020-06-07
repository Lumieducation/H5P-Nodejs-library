export interface ILibraryManagementOverviewItem {
    canBeDeleted: boolean;
    canBeUpdated: boolean;
    dependentsCount: number;
    instancesAsDependencyCount: number;
    instancesCount: number;
    isAddon: boolean;
    majorVersion: number;
    minorVersion: number;
    patchVersion: number;
    restricted: boolean;
    runnable: boolean;
    title: string;
}
