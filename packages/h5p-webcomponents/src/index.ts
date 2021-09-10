import { H5PEditorComponent } from './h5p-editor';
import { H5PPlayerComponent, IxAPIEvent, IContext } from './h5p-player';
import {
    IH5P,
    IH5PDialog,
    IH5PEventDispatcher,
    IH5PInstance
} from './h5p-types';

export {
    H5PEditorComponent,
    H5PPlayerComponent,
    IxAPIEvent,
    IContext,
    IH5P,
    IH5PInstance,
    IH5PDialog,
    IH5PEventDispatcher
};

export function defineElements(element?: string | string[]): void {
    if (
        (!element ||
            (typeof element === 'string' && element === 'h5p-player') ||
            (Array.isArray(element) && element.includes('h5p-player'))) &&
        !window.customElements.get('h5p-player')
    ) {
        window.customElements.define('h5p-player', H5PPlayerComponent);
    }
    if (
        (!element ||
            (typeof element === 'string' && element === 'h5p-editor') ||
            (Array.isArray(element) && element.includes('h5p-editor'))) &&
        !window.customElements.get('h5p-editor')
    ) {
        window.customElements.define('h5p-editor', H5PEditorComponent);
    }
}
