import { IPlayerModel } from '@lumieducation/h5p-server';

import { mergeH5PIntegration, removeUnusedContent } from './h5p-utils';
import { addScripts, addStylesheets } from './dom-utils';

declare global {
    interface Window {
        /**
         * The global H5P "class" of the H5P client core.
         */
        H5P: any;
        /**
         * Used by the H5P core to communicate settings between the server and
         * the H5P core client.
         */
        H5PIntegration: any;
    }
}

export interface IxAPIEvent {
    data: {
        statement: any;
    };
}

export interface IContext {
    contentId: string;
}

/**
 * A Web Component displaying H5P content.
 */
export class H5PPlayerComponent extends HTMLElement {
    get contentId(): string {
        return this.getAttribute('content-id');
    }

    set contentId(contentId: string) {
        this.setAttribute('content-id', contentId);
    }

    /**
     * Called when the component needs to load data about content. The endpoint
     * called in here should call H5PPlayer.render() and send back the player
     * model.
     *
     * Should throw an error with a message in the message property if something
     * goes wrong.
     */
    public get loadContentCallback(): (
        contentId: string
    ) => Promise<IPlayerModel> {
        return this.privateLoadContentCallback;
    }

    public set loadContentCallback(
        callback: (contentId: string) => Promise<IPlayerModel>
    ) {
        const mustRender = this.privateLoadContentCallback !== callback;
        this.privateLoadContentCallback = callback;
        if (mustRender) {
            this.render(this.contentId);
        }
    }

    /**
     * Indicates changes to which attributes should trigger calls to
     * attributeChangedCallback.
     * @memberof H5PPlayerComponent
     */
    static get observedAttributes(): string[] {
        return ['content-id'];
    }
    constructor() {
        super();

        H5PPlayerComponent.initTemplate();
    }

    private static template: HTMLTemplateElement;
    private playerModel: IPlayerModel;
    private privateLoadContentCallback: (
        contentId: string
    ) => Promise<IPlayerModel>;
    private resizeObserver: ResizeObserver;
    private root: HTMLElement;

    private static initTemplate(): void {
        // We create the static template only once
        if (!H5PPlayerComponent.template) {
            H5PPlayerComponent.template = document.createElement('template');
            H5PPlayerComponent.template.innerHTML = `
                <style>
                    .h5p-iframe {
                        font-family: Sans-Serif;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                    .h5p-iframe .h5p-container {
                        overflow: hidden;
                    }
                    .h5p-iframe .h5p-content {
                        font-size: 16px;
                        line-height: 1.5em;
                        width: 100%;
                        height: auto;
                    }
                    .h5p-iframe .h5p-fullscreen .h5p-content,
                    .h5p-fullscreen .h5p-iframe,
                    .h5p-iframe .h5p-semi-fullscreen .h5p-content {
                        height: 100%;
                    }
                </style>
                <div class="h5p-player-component-root"></div>
                `;
        }
    }

    /**
     * Called when one of the attributes in observedAttributes changes.
     */
    async attributeChangedCallback(
        name: string,
        oldVal: any,
        newVal: any
    ): Promise<void> {
        if (name === 'content-id') {
            if (oldVal) {
                removeUnusedContent(oldVal);
            }
            await this.render(newVal);
        }
    }

    /**
     * Called when the component is added to the DOM.
     */
    connectedCallback(): void {
        this.appendChild(H5PPlayerComponent.template.content.cloneNode(true));
        this.root = this.querySelector('.h5p-player-component-root');

        // We must notify the H5P content inside the player that the size of the
        // component has changed. Otherwise some content types won't resize
        // properly.
        this.resizeObserver = new ResizeObserver(() => {
            if (window.H5P?.instances) {
                window.H5P.instances.forEach((instance) => {
                    instance.trigger('resize');
                });
            }
        });
        this.resizeObserver.observe(this);
    }

    /**
     * Called when the component is removed from the DOM.
     */
    disconnectedCallback(): void {
        if (this.contentId) {
            removeUnusedContent(this.contentId);
        }
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (window.H5P.externalDispatcher) {
            window.H5P.externalDispatcher.off(
                'initialized',
                this.onContentInitialized
            );
        }
    }

    /**
     * Called when any H5P content signals that it was initialized
     */
    private onContentInitialized = (): void => {
        if (
            this.playerModel.embedTypes.includes('div')
                ? window.H5P.instances[0]
                : (document.getElementById(
                      `h5p-iframe-${this.playerModel.contentId}`
                  ) as HTMLIFrameElement).contentWindow.H5P?.instances
                      ?.length >= 1
        ) {
            this.dispatchEvent(
                new CustomEvent('initialized', {
                    detail: { contentId: this.contentId }
                })
            );
            if (window.H5P.externalDispatcher) {
                window.H5P.externalDispatcher.off(
                    'initialized',
                    this.onContentInitialized
                );
            }
        }
    };

    /**
     * Displays content.
     * @param {string} contentId
     */
    private async render(contentId: string): Promise<void> {
        if (!this.loadContentCallback) {
            return;
        }
        // Get data from H5P server
        try {
            this.playerModel = await this.loadContentCallback(contentId);
        } catch (error) {
            this.root.innerHTML = `<p>Error loading H5P content from server: ${error.message}</p>`;
            return;
        }

        // Reset the component's DOM
        this.root.innerHTML = '';

        // We have to prevent H5P from initializing when the h5p.js file is
        // loaded.
        if (!window.H5P) {
            window.H5P = {};
        }
        window.H5P.preventInit = true;

        // We merge the H5P integration we received from the server with the one
        // that already exists in the window globally to allow for several H5P
        // content objects on a single page.
        mergeH5PIntegration(
            this.playerModel.integration,
            this.playerModel.contentId
        );

        // The server has already told us which embed types are generally
        // acceptable for the content type, but we prefer div if possible to
        // avoid too many iframes.
        if (this.playerModel.embedTypes.includes('div')) {
            await this.renderDiv(this.playerModel);
        } else {
            await this.renderIframe(this.playerModel);
        }

        // Initialize H5P with the component as root
        window.H5P.preventInit = false;
        window.H5P.externalDispatcher.on(
            'initialized',
            this.onContentInitialized,
            this
        );
        window.H5P.preventInit = false;

        // attach xAPI listener
        window.H5P.externalDispatcher.on('xAPI', (event: IxAPIEvent) => {
            const context: IContext = {
                contentId: this.playerModel.contentId
            };
            this.dispatchEvent(
                new CustomEvent('xAPI', {
                    detail: {
                        statement: event.data.statement,
                        context,
                        event
                    }
                })
            );
        });

        window.H5P.init(this.root);
    }

    /**
     * Creates a new DOM for the H5P using a div as container.
     */
    private async renderDiv(playerModel: IPlayerModel): Promise<void> {
        addStylesheets(
            playerModel.styles,
            document.getElementsByTagName('head')[0]
        );
        await addScripts(
            playerModel.scripts,
            document.getElementsByTagName('head')[0]
        );

        const h5pContainerDiv = document.createElement('div');
        h5pContainerDiv.className = 'h5p-iframe';
        this.root.appendChild(h5pContainerDiv);

        const h5pContentDiv = document.createElement('div');
        h5pContentDiv.className = 'h5p-content';
        h5pContentDiv.dataset.contentId = playerModel.contentId;
        h5pContainerDiv.appendChild(h5pContentDiv);
    }

    /**
     * Creates a new DOM for the H5P using an iframe as container.
     * @param {IPlayerModel} playerModel
     */
    private async renderIframe(playerModel: IPlayerModel): Promise<void> {
        // We don't need to load styles, as they are all loaded within the
        // iframe.
        await addScripts(
            window.H5PIntegration.core.scripts,
            document.getElementsByTagName('head')[0]
        );

        const h5pIFrameWrapper = document.createElement('div');
        h5pIFrameWrapper.className = `h5p-iframe-wrapper`;
        h5pIFrameWrapper.innerHTML = `<iframe id="h5p-iframe-${playerModel.contentId}"
        class="h5p-iframe" data-content-id="${playerModel.contentId}"
        style="height:1px" src="about:blank" frameBorder="0" scrolling="no"
        title="H5P"></iframe>`;
        this.root.appendChild(h5pIFrameWrapper);
    }
}
