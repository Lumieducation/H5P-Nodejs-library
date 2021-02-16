import { LibraryName, ILibraryName } from '@lumieducation/h5p-server';

/**
 * Collects lists of files grouped by libraries.
 */
export default class LibrariesFilesList {
    private usedFiles: { [ubername: string]: string[] } = {};

    /**
     * Adds a library file to the list.
     * @param library
     * @param filename
     */
    public addFile(library: ILibraryName, filename: string): void {
        const ubername = LibraryName.toUberName(library);
        if (!this.usedFiles[ubername]) {
            this.usedFiles[ubername] = [];
        }
        this.usedFiles[ubername].push(filename);
    }

    /**
     * Checks if a library file is in the list
     * @param library
     * @param filename
     */
    public checkFile(library: ILibraryName, filename: string): boolean {
        return this.usedFiles[LibraryName.toUberName(library)]?.includes(
            filename
        );
    }

    /**
     * Clears the list of all libraries.
     */
    public clear(): void {
        this.usedFiles = {};
    }
}
