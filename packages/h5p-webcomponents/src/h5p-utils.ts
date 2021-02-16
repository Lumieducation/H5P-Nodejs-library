import { IIntegration } from '@lumieducation/h5p-server';

/**
 * Merges the new IIntegration object with the global one.
 * @param newIntegration
 * @param contentId
 */
export function mergeH5PIntegration(
    newIntegration: IIntegration,
    contentId: string
): void {
    if (!window.H5PIntegration) {
        window.H5PIntegration = newIntegration;
        return;
    }
    if (
        contentId &&
        newIntegration.contents &&
        newIntegration.contents[`cid-${contentId}`]
    ) {
        if (!window.H5PIntegration.contents) {
            window.H5PIntegration.contents = {};
        }
        window.H5PIntegration.contents[`cid-${contentId}`] =
            newIntegration.contents[`cid-${contentId}`];
    }

    // The editor doesn't include core script and style lists
    if (!window.H5PIntegration.core && newIntegration.core) {
        window.H5PIntegration.core = newIntegration.core;
    }
    if (newIntegration.editor && !window.H5PIntegration.editor) {
        window.H5PIntegration.editor = newIntegration.editor;
    }
}

/**
 * Removes the data about the content from the global H5PIntegration object.
 * @param contentId
 */
export function removeUnusedContent(contentId: string): void {
    if (
        window.H5PIntegration?.contents &&
        window.H5PIntegration.contents[`cid-${contentId}`]
    ) {
        delete window.H5PIntegration.contents[`cid-${contentId}`];
    }
}
