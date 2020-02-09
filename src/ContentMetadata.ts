import {
    IContentAuthor,
    IContentChange,
    IContentMetadata,
    ILibraryName
} from './types';

/**
 * Content metadata object with defaults for required values and
 * sanitization to make sure it the metadata conforms to the schema.
 */
export class ContentMetadata implements IContentMetadata {
    /**
     * Creates an object conforming to the h5p.json schema.
     * @param furtherMetadata these objects will be merged into the newly created object
     */
    constructor(...furtherMetadata: any[]) {
        for (const metadata of furtherMetadata) {
            Object.assign(this, metadata);
        }

        // Remove empty arrays for authors and changes, as this validates the
        // H5P schema.
        if (this.authors && this.authors.length === 0) {
            this.authors = undefined;
        }
        if (this.changes && this.changes.length === 0) {
            this.changes = undefined;
        }
    }
    public author?: string;
    public authorComments?: string;
    public authors?: IContentAuthor[];
    public changes?: IContentChange[];
    public contentType?: string;
    public dynamicDependencies?: ILibraryName[];
    public editorDependencies?: ILibraryName[];
    public embedTypes: ('iframe' | 'div')[] = ['iframe'];
    public h?: string;
    public language: string = 'en';
    public license?: string;
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
}
