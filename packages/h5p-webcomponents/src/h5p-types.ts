import type { IIntegration } from '@lumieducation/h5p-server';

export interface IH5PInstance {
    contentId: string;
    contentData: {
        metadata: any;
        standalone: boolean;
    };
    params: any;
    trigger: (event: string, eventData?: any, extras?: any) => void;
}

export interface IH5PDialog {
    new (name: string, title: string, content: string, $element: any);
    open(scrollbar: boolean): void;
    close(): void;
}

export interface IH5PEventDispatcher {
    on(eventName: string, callback: (event: any) => void, that?: any);
    off(eventName: string, callback: (event: any) => void, that?: any);
}

export interface IH5P {
    [key: string]: any;
    instances: IH5PInstance[];
    getCopyrights: (
        instance: IH5PInstance,
        parameters,
        contentId,
        metadata
    ) => string;
    triggerXAPI(verb: string, extra: any): void;
    Dialog: IH5PDialog;
    externalDispatcher: IH5PEventDispatcher;
    init(root: any);
    preventInit: boolean;
    jQuery: any;
}

declare global {
    interface Window {
        /**
         * The global H5P "class" of the H5P client core.
         */
        H5P: IH5P;
        /**
         * Used by the H5P core to communicate settings between the server and
         * the H5P core client.
         */
        H5PIntegration: IIntegration;
        /**
         * We keep track of whether h5p is initialized globally to avoid
         * resetting settings when we load another editor component. As the H5P
         * core works with globals and this state must be shared with the player
         * component as well, we have to use a global here, too.
         * Only used in the editor
         */
        h5pIsInitialized: boolean;
    }
}
