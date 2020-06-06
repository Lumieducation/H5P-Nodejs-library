export interface ILibraryManagementOverviewItem {
    canBeDeleted: boolean;
    canBeUpdated: boolean;
    dependentOnBy: number;
    instances: number;
    instancesAsDependency: number;
    isAddon: boolean;
    restricted: boolean;
    runnable: boolean;
    title: string;
    version: {
        major: number;
        minor: number;
        patch: number;
    };
}
