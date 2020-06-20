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

    public async deleteLibrary(library: ILibraryViewModel): Promise<void> {
        const response = await fetch(
            `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
            {
                method: 'DELETE'
            }
        );

        if (response.ok) {
            return;
        }
        throw new Error(
            `Could not delete library: ${response.status} - ${response.text}`
        );
    }

    public async getCacheUpdate(): Promise<Date> {
        const response = await fetch(
            `${this.baseUrl}/content-type-cache/update`
        );
        if (response.ok) {
            return new Date((await response.json()).lastUpdate);
        }
        throw new Error(
            `Could not get content type cache update date: ${response.status} - ${response.statusText}`
        );
    }

    public async getLibraries(): Promise<ILibraryViewModel[]> {
        const response = await fetch(this.baseUrl);
        if (response.ok) {
            return response.json();
        }
        throw new Error(
            `Could not get library list: ${response.status} - ${response.statusText}`
        );
    }

    public async getLibrary(
        library: ILibraryViewModel
    ): Promise<
        IInstalledLibrary & {
            dependentsCount: number;
            instancesAsDependencyCount: number;
            instancesCount: number;
            isAddon: boolean;
        }
    > {
        const response = await fetch(
            `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`
        );
        if (response.ok) {
            return response.json();
        }
        throw new Error(
            `Could not get library details: ${response.status} - ${response.statusText}`
        );
    }

    public async patchLibrary(
        library: ILibraryViewModel,
        changes: Partial<ILibraryViewModel>
    ): Promise<ILibraryViewModel> {
        const response = await fetch(
            `${this.baseUrl}/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8'
                },
                body: JSON.stringify(changes)
            }
        );
        if (response.ok) {
            return { ...library, ...changes };
        }
        throw new Error(
            `Could not patch library: ${response.status} - ${response.statusText}`
        );
    }

    public async postUpdateCache(): Promise<Date> {
        const response = await fetch(
            `${this.baseUrl}/content-type-cache/update`,
            {
                method: 'POST'
            }
        );
        if (response.ok) {
            return new Date((await response.json()).lastUpdate);
        }
        throw new Error(
            `Could not update content type cache: ${response.status} - ${response.statusText}`
        );
    }
}
