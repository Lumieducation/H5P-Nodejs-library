import type {
    IEditorModel,
    IPlayerModel,
    IContentMetadata
} from '@lumieducation/h5p-server';

export interface IContentListEntry {
    contentId: string;
    mainLibrary: string;
    title: string;
    originalNewKey?: string;
}

export interface IContentService {
    delete(contentId: string): Promise<void>;
    getEdit(contentId: string): Promise<IEditorModel>;
    getPlay(
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ): Promise<IPlayerModel>;
    list(): Promise<IContentListEntry[]>;
    save(
        contentId: string,
        requestBody: { library: string; params: any }
    ): Promise<{ contentId: string; metadata: IContentMetadata }>;
    generateDownloadLink(contentId: string): string;
}

export class ContentService implements IContentService {
    /**
     *
     */
    constructor(protected baseUrl: string = '') {}

    private csrfToken: string | undefined = undefined;

    delete = async (contentId: string): Promise<void> => {
        console.log(`ContentService: deleting ${contentId}...`);
        const result = await fetch(`${this.baseUrl}/${contentId}`, {
            method: 'delete',
            headers: {
                'CSRF-Token': this.csrfToken ?? ''
            }
        });
        if (!result.ok) {
            throw new Error(
                `Error while deleting content: ${result.status} ${
                    result.statusText
                } ${await result.text()}`
            );
        }
    };

    getEdit = async (contentId: string): Promise<IEditorModel> => {
        console.log(
            `ContentService: Getting information to edit ${contentId}...`
        );
        const res = await fetch(`${this.baseUrl}/${contentId}/edit`);
        if (!res || !res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json();
    };

    getPlay = async (
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ): Promise<IPlayerModel> => {
        console.log(
            `ContentService: Getting information to play ${contentId}${
                contextId ? `, contextId ${contextId}` : ''
            }${asUserId ? `, asUserId ${asUserId}` : ''}${
                readOnlyState !== undefined
                    ? `, readOnlyState ${readOnlyState}`
                    : ''
            }...`
        );

        const query = new URLSearchParams();
        if (contextId) {
            query.append('contextId', contextId);
        }
        if (asUserId) {
            query.append('asUserId', asUserId);
        }
        if (readOnlyState === true) {
            query.append('readOnlyState', 'yes');
        }

        const queryString = query.toString();

        const res = await fetch(
            `${this.baseUrl}/${contentId}/play${
                queryString ? `?${queryString}` : ''
            }`
        );
        if (!res || !res.ok) {
            throw new Error(`${res.status} ${res.statusText}`);
        }
        return res.json();
    };

    list = async (): Promise<IContentListEntry[]> => {
        console.log(`ContentService: Listing content objects`);
        const result = await fetch(this.baseUrl);
        if (result.ok) {
            return result.json();
        }
        throw new Error(
            `Request to REST endpoint returned ${result.status} ${
                result.statusText
            }: ${await result.text()}`
        );
    };

    save = async (
        contentId: string,
        requestBody: { library: string; params: any }
    ): Promise<{ contentId: string; metadata: IContentMetadata }> => {
        if (contentId) {
            console.log(`ContentService: Saving new content.`);
        } else {
            console.log(`ContentService: Saving content ${contentId}`);
        }

        const body = JSON.stringify(requestBody);

        const res = contentId
            ? await fetch(`${this.baseUrl}/${contentId}`, {
                  method: 'PATCH',
                  headers: {
                      'Content-Type': 'application/json',
                      'CSRF-Token': this.csrfToken ?? ''
                  },
                  body
              })
            : await fetch(this.baseUrl, {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json',
                      'CSRF-Token': this.csrfToken ?? ''
                  },
                  body
              });

        if (!res || !res.ok) {
            throw new Error(
                `${res.status} ${res.statusText} - ${await res.text()}`
            );
        }
        return res.json();
    };
    generateDownloadLink = (contentId: string): string =>
        `${this.baseUrl}/download/${contentId}`;

    setCsrfToken = (csrfToken): void => {
        this.csrfToken = csrfToken;
    };
    getCsrfToken = (): string | undefined => {
        return this.csrfToken;
    };
}
