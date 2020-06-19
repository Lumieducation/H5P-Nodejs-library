import type {
    IInstalledLibrary,
    ILibraryManagementOverviewItem
} from '../../build/src';

export interface ILibraryViewModel extends ILibraryManagementOverviewItem {
    details?: IInstalledLibrary & {
        dependentsCount: number;
        instancesAsDependencyCount: number;
        instancesCount: number;
        isAddon: boolean;
    };
    isDeleting?: boolean;
    isShowingDetails?: boolean;
}

export class LibraryManagementService {
    constructor(private baseUrl: string) {}

    public async getLibraries(): Promise<ILibraryViewModel[]> {
        const response = await fetch(this.baseUrl);
        if (response.ok) {
            return response.json();
        }
        throw new Error(
            `Could not get library list: ${response.status} - ${response.statusText}`
        );
    }
}
