import merge from 'deepmerge';
import type { IIntegration } from '@lumieducation/h5p-server';

import type { IH5P, IH5PInstance } from './h5p-types';

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

    // We don't want to mutate the newIntegration parameter, so we shallow clone
    // it.
    const newIntegrationDup = { ...newIntegration };
    // We don't merge content object information, as there might be issues with
    // this.
    delete newIntegrationDup.contents;

    window.H5PIntegration = merge(window.H5PIntegration, newIntegrationDup);
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

/**
 * Stops an H5P instance from saving its user state and removes it from the
 * list of running instances.
 *
 * h5p.js saves the state of every instance that implements getCurrentState on
 * a timer it never clears (H5PIntegration.saveFreq) and again on unload and
 * pagehide for every entry of H5P.instances. Removing the content's DOM
 * doesn't stop either, so a player that was removed or re-rendered keeps
 * posting the state it last had: it overwrites the state saved by a new player
 * of the same content, or state the host application deleted on purpose.
 *
 * h5p.js skips an instance whose getCurrentState returns undefined, so that is
 * what the retired instance reports from now on.
 * @param h5pObject the H5P object the instance runs in (the iframe's H5P
 * object for iframe embeds)
 * @param instance the instance to retire; nothing happens if undefined
 */
export function retireInstance(
    h5pObject: IH5P | undefined,
    instance: IH5PInstance | undefined
): void {
    if (!instance) {
        return;
    }
    instance.getCurrentState = (): undefined => undefined;

    const instances = h5pObject?.instances;
    if (Array.isArray(instances)) {
        const index = instances.indexOf(instance);
        if (index !== -1) {
            instances.splice(index, 1);
        }
    }
}
