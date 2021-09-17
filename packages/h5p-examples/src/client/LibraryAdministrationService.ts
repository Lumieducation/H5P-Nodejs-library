// We reference the build directory (which contains a .d.ts file) to avoid
// including the whole server part of the library in the build of the client.
import type {
    IInstalledLibrary,
    ILibraryAdministrationOverviewItem
} from '@lumieducation/h5p-server';

/**
 * The data model used to display the library list.
 */
export interface ILibraryViewModel extends ILibraryAdministrationOverviewItem {
    details?: IInstalledLibrary & {
        dependentsCount: number;
        instancesAsDependencyCount: number;
        instancesCount: number;
        isAddon: boolean;
    };
    isDeleting?: boolean;
    isShowingDetails?: boolean;
}

/**
 *
 */
export class LibraryAdministrationService {
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

    public async getLibraries(): Promise<ILibraryViewModel[]> {
        const response = await fetch(this.baseUrl);
        if (response.ok) {
            return response.json();
        }
        throw new Error(
            `Could not get library list: ${response.status} - ${response.statusText}`
        );
    }

    public async getLibrary(library: ILibraryViewModel): Promise<
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

    public async postPackage(
        file: File
    ): Promise<{ installed: number; updated: number }> {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(this.baseUrl, {
            method: 'POST',
            body: formData
        });
        if (response.ok) {
            const result = await response.json();
            return { installed: result.installed, updated: result.updated };
        }
        throw new Error(
            `Could not upload package with libraries: ${response.status} - ${response.statusText}`
        );
    }
}
