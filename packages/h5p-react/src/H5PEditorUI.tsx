import * as React from 'react';
import { Component, createRef, ReactNode, RefObject } from 'react';

import {
    defineElements,
    H5PEditorComponent as H5PEditorWebComponent
} from '@lumieducation/h5p-webcomponents';
import type { IContentMetadata, IEditorModel } from '@lumieducation/h5p-server';

defineElements('h5p-editor');

declare global {
    /**
     * Enables type checks for JSX.
     */
    namespace JSX {
        interface IntrinsicElements {
            'h5p-editor': {
                'content-id'?: string;
                'h5p-url'?: string;
                ref?: any;
            };
        }
    }
}

interface IH5PEditorUIProps {
    contentId: string;
    loadContentCallback: (contentId: string) => Promise<
        IEditorModel & {
            library?: string;
            metadata?: IContentMetadata;
            params?: any;
        }
    >;
    onLoaded?: (contentId: string, ubername: string) => void;
    onSaved?: (contentId: string, metadata: IContentMetadata) => void;
    onSaveError?: (errorMessage: string) => void;
    saveContentCallback: (
        contentId: string,
        requestBody: {
            library: string;
            params: any;
        }
    ) => Promise<{
        contentId: string;
        metadata: IContentMetadata;
    }>;
}

export default class H5PEditorUI extends Component<IH5PEditorUIProps> {
    constructor(props: IH5PEditorUIProps) {
        super(props);
        this.h5pEditor = createRef();
    }

    private h5pEditor: RefObject<H5PEditorWebComponent>;

    public componentDidMount(): void {
        this.registerEvents();
        this.setServiceCallbacks();
    }

    public componentDidUpdate(): void {
        this.registerEvents();
        this.setServiceCallbacks();
        this.h5pEditor.current?.resize();
    }

    public componentWillUnmount(): void {
        this.unregisterEvents();
    }

    public getSnapshotBeforeUpdate(): void {
        // Should the old editor instance be destroyed, we unregister from it...
        this.unregisterEvents();
        return null;
    }

    public render(): ReactNode {
        return (
            <h5p-editor
                ref={this.h5pEditor}
                content-id={this.props.contentId}
            ></h5p-editor>
        );
    }

    /**
     * Call this method to save the current state of the h5p editor. This will
     * result in a call to the `saveContentCallback` that was passed in the
     * through the props.
     * @throws an error if there was a problem (e.g. validation error of the
     * content)
     */
    public async save(): Promise<
        | {
              contentId: string;
              metadata: IContentMetadata;
          }
        | undefined
    > {
        try {
            return await this.h5pEditor.current?.save();
        } catch (error) {
            // We ignore the error, as we subscribe to the 'save-error' and
            // 'validation-error' events.
        }
    }

    private loadContentCallbackWrapper = (
        contentId: string
    ): Promise<
        IEditorModel & {
            library?: string;
            metadata?: IContentMetadata;
            params?: any;
        }
    > => {
        return this.props.loadContentCallback(contentId);
    };

    private onEditorLoaded = (
        event: CustomEvent<{ contentId: string; ubername: string }>
    ): void => {
        if (this.props.onLoaded) {
            this.props.onLoaded(event.detail.contentId, event.detail.ubername);
        }
    };

    private onSaved = (
        event: CustomEvent<{ contentId: string; metadata: IContentMetadata }>
    ): void => {
        if (this.props.onSaved) {
            this.props.onSaved(event.detail.contentId, event.detail.metadata);
        }
    };

    private onSaveError = async (
        event: CustomEvent<{ message: string }>
    ): Promise<void> => {
        if (this.props.onSaveError) {
            this.props.onSaveError(event.detail.message);
        }
    };

    private registerEvents(): void {
        this.h5pEditor.current?.addEventListener('saved', this.onSaved);
        this.h5pEditor.current?.addEventListener(
            'editorloaded',
            this.onEditorLoaded
        );
        this.h5pEditor.current?.addEventListener(
            'save-error',
            this.onSaveError
        );
        this.h5pEditor.current?.addEventListener(
            'validation-error',
            this.onSaveError
        );
    }

    private saveContentCallbackWrapper = (
        contentId: string,
        requestBody: {
            library: string;
            params: any;
        }
    ): Promise<{
        contentId: string;
        metadata: IContentMetadata;
    }> => {
        return this.props.saveContentCallback(contentId, requestBody);
    };

    private setServiceCallbacks(): void {
        if (this.h5pEditor.current) {
            this.h5pEditor.current.loadContentCallback =
                this.loadContentCallbackWrapper;
            this.h5pEditor.current.saveContentCallback =
                this.saveContentCallbackWrapper;
        }
    }

    private unregisterEvents(): void {
        this.h5pEditor.current?.removeEventListener('saved', this.onSaved);
        this.h5pEditor.current?.removeEventListener(
            'editorloaded',
            this.onEditorLoaded
        );
        this.h5pEditor.current?.removeEventListener(
            'save-error',
            this.onSaveError
        );
        this.h5pEditor.current?.removeEventListener(
            'validation-error',
            this.onSaveError
        );
    }
}
