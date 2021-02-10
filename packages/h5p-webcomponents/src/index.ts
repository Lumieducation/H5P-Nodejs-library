import { H5PEditorComponent } from './h5p-editor';
import { H5PPlayerComponent } from './h5p-player';

export { H5PEditorComponent, H5PPlayerComponent };

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
