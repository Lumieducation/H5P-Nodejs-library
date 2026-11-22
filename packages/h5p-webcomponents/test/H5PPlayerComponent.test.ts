// @vitest-environment jsdom
import type { IPlayerModel } from '@lumieducation/h5p-server';

import { defineElements } from '../src';
import type { IH5PInstance } from '../src/h5p-types';

vi.mock('../src/dom-utils', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../src/dom-utils')>()),
    addScripts: vi.fn(async () => undefined),
    addStylesheets: vi.fn()
}));

function instance(contentId: string, state: unknown): IH5PInstance {
    return {
        contentId,
        contentData: { metadata: {}, standalone: false },
        params: {},
        trigger: () => undefined,
        getCurrentState: () => state
    };
}

function playerModel(contentId: string): IPlayerModel {
    return {
        contentId,
        embedTypes: ['div'],
        integration: { contents: { [`cid-${contentId}`]: {} } },
        scripts: [],
        styles: []
    } as unknown as IPlayerModel;
}

/**
 * Puts the component in the state it is in once H5P has initialized the
 * content, without loading h5p.js.
 */
function showing(player: HTMLElement, running: IH5PInstance): void {
    (player as any).h5pInstanceInternal = running;
    (player as any).h5pObjectInternal = window.H5P;
}

describe('H5PPlayerComponent', () => {
    beforeAll(() => {
        vi.stubGlobal(
            'ResizeObserver',
            class {
                observe(): void {}
                disconnect(): void {}
            }
        );
        defineElements('h5p-player');
    });

    beforeEach(() => {
        window.H5P = {
            instances: [],
            init: vi.fn(),
            externalDispatcher: { on: vi.fn(), off: vi.fn() }
        } as any;
        document.body.innerHTML = '';
    });

    it('stops the content saving its state once the player is removed from the page', () => {
        const player = document.createElement('h5p-player');
        document.body.appendChild(player);
        const running = instance('1', { answers: [0] });
        window.H5P.instances.push(running);
        showing(player, running);

        player.remove();

        expect(running.getCurrentState()).toBeUndefined();
        expect(window.H5P.instances).not.toContain(running);
        expect((player as any).h5pInstance).toBeUndefined();
    });

    it('stops the previous content saving its state when another one is rendered', async () => {
        const player = document.createElement('h5p-player') as any;
        document.body.appendChild(player);
        player.loadContentCallback = vi.fn(async (contentId: string) =>
            playerModel(contentId)
        );
        const previous = instance('1', { answers: [0] });
        const unrelated = instance('3', { answers: [1] });
        window.H5P.instances.push(previous, unrelated);
        showing(player, previous);

        player.setAttribute('content-id', '2');
        await vi.waitFor(() => expect(window.H5P.init).toHaveBeenCalled());

        expect(previous.getCurrentState()).toBeUndefined();
        expect(window.H5P.instances).toEqual([unrelated]);
        expect(unrelated.getCurrentState()).toEqual({ answers: [1] });
    });

    it('stops the previous content saving its state when the next one fails to load', async () => {
        const player = document.createElement('h5p-player') as any;
        document.body.appendChild(player);
        player.loadContentCallback = vi.fn(async () => {
            throw new Error('offline');
        });
        const previous = instance('1', { answers: [0] });
        window.H5P.instances.push(previous);
        showing(player, previous);

        player.setAttribute('content-id', '2');
        await vi.waitFor(() =>
            expect(player.textContent).toContain('Error loading H5P content')
        );

        expect(previous.getCurrentState()).toBeUndefined();
        expect(window.H5P.instances).toEqual([]);
    });
});
