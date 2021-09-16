import {
    IContentAuthor,
    IContentChange,
    IContentMetadata,
    ILibraryName
} from './types';
import LibraryName from './LibraryName';

/**
 * Content metadata object with defaults for required values and
 * sanitization to make sure it the metadata conforms to the schema.
 */
export class ContentMetadata implements IContentMetadata {
    /**
     * Creates an object conforming to the h5p.json schema.
     * @param furtherMetadata these objects will be merged into the newly created object
     */
    constructor(...furtherMetadata: Partial<IContentMetadata>[]) {
        for (const metadata of furtherMetadata) {
            Object.assign(this, metadata);
        }

        // Remove empty arrays for authors and changes, as this breaks the
        // H5P schema.
        if (this.authors && this.authors.length === 0) {
            this.authors = undefined;
        }
        if (this.changes && this.changes.length === 0) {
            this.changes = undefined;
        }
    }
    public a11yTitle?: string;
    public author?: string;
    public authorComments?: string;
    public authors?: IContentAuthor[];
    public changes?: IContentChange[];
    public contentType?: string;
    public defaultLanguage: string;
    public dynamicDependencies?: ILibraryName[];
    public editorDependencies?: ILibraryName[];
    public embedTypes: ('iframe' | 'div')[] = ['iframe'];
    public h?: string;
    public language: string = 'en';
    public license: string;
    public licenseExtras?: string;
    public licenseVersion?: string;
    public mainLibrary: string;
    public metaDescription?: string;
    public metaKeywords?: string;
    public preloadedDependencies: ILibraryName[];
    public source?: string;
    public title: string;
    public w?: string;
    public yearsFrom?: string;
    public yearsTo?: string;

    /**
     * Determines the main library and returns the ubername for it (e.g. "H5P.Example 1.0").
     * @param metadata the metadata object (=h5p.json)
     * @returns the ubername with a whitespace as separator
     */
    public static toUbername(metadata: IContentMetadata): string {
        const library = (metadata.preloadedDependencies || []).find(
            (dependency) => dependency.machineName === metadata.mainLibrary
        );
        if (!library) {
            return undefined;
        }
        return LibraryName.toUberName(library, { useWhitespace: true });
    }
}
