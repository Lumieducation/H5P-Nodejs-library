import type { IPlayerModel } from '@lumieducation/h5p-server';

import { mergeH5PIntegration, removeUnusedContent } from './h5p-utils';
import { addScripts, addStylesheets } from './dom-utils';
import { IH5P, IH5PInstance } from './h5p-types';

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

    get contextId(): string {
        return this.getAttribute('context-id');
    }

    set contextId(contextId: string) {
        this.setAttribute('context-id', contextId);
    }

    get asUserId(): string {
        return this.getAttribute('as-user-id');
    }

    set asUserId(asUserId: string) {
        this.setAttribute('as-user-id', asUserId);
    }

    get readOnlyState(): string {
        return this.getAttribute('read-only-state');
    }

    set readOnlyState(readOnlyState: string) {
        this.setAttribute('read-only-state', readOnlyState);
    }

    /**
     * The internal H5P instance object of the H5P content.
     *
     * Only available after the `initialized` event was fired. Important: This
     * object is only partially typed and there are more properties and methods
     * on it!
     */
    get h5pInstance(): IH5PInstance {
        return this.h5pInstanceInternal;
    }
    private set h5pInstance(value: IH5PInstance) {
        this.h5pInstanceInternal = value;
    }

    /**
     * The global H5P object / namespace (normally accessible through "H5P..."
     * or "window.H5P") of the content type. Depending on the embed type this
     * can be an object from the internal iframe, so you can use it to break the
     * barrier of the iframe and execute JavaScript inside the iframe.
     *
     * Only available after the `initialized` event was fired. Important: This
     * object is only partially typed and there are more properties and methods
     * on it!
     */
    get h5pObject(): IH5P {
        return this.h5pObjectInternal;
    }
    private set h5pObject(value: IH5P) {
        this.h5pObjectInternal = value;
    }

    /**
     * The window object in which the H5P object exists and is rendered in. This
     * is the iframe's contentWindow or the parent's window, depending on the
     * embed type.
     */
    get h5pWindow(): any {
        return this.h5pWindowInternal;
    }
    private set h5pWindow(value: any) {
        this.h5pWindowInternal = value;
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
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ) => Promise<IPlayerModel> {
        return this.privateLoadContentCallback;
    }

    public set loadContentCallback(
        callback: (
            contentId: string,
            contextId?: string,
            asUserId?: string,
            readOnlyState?: boolean
        ) => Promise<IPlayerModel>
    ) {
        const mustRender = this.privateLoadContentCallback !== callback;
        this.privateLoadContentCallback = callback;
        if (mustRender) {
            this.render(
                this.contentId,
                this.contextId,
                this.asUserId,
                this.readOnlyState
            );
        }
    }

    /**
     * Indicates changes to which attributes should trigger calls to
     * attributeChangedCallback.
     * @memberof H5PPlayerComponent
     */
    static get observedAttributes(): string[] {
        return ['content-id', 'context-id', 'as-user-id', 'read-only-state'];
    }
    constructor() {
        super();

        H5PPlayerComponent.initTemplate();
    }

    private static template: HTMLTemplateElement;
    private playerModel: IPlayerModel;
    private privateLoadContentCallback: (
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ) => Promise<IPlayerModel>;
    private resizeObserver: ResizeObserver;
    private root: HTMLElement;
    private h5pInstanceInternal: IH5PInstance;
    private h5pObjectInternal: IH5P;
    private h5pWindowInternal: any;

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
            await this.render(
                newVal,
                this.contextId,
                this.asUserId,
                this.readOnlyState
            );
        } else if (name === 'context-id') {
            if (oldVal) {
                removeUnusedContent(this.contentId);
            }
            await this.render(
                this.contentId,
                newVal,
                this.asUserId,
                this.readOnlyState
            );
        } else if (name === 'as-user-id') {
            if (oldVal) {
                removeUnusedContent(this.contentId);
            }
            await this.render(
                this.contentId,
                this.contextId,
                newVal,
                this.readOnlyState
            );
        } else if (name === 'read-only-state') {
            if (oldVal) {
                removeUnusedContent(this.contentId);
            }
            await this.render(
                this.contentId,
                this.contextId,
                this.asUserId,
                newVal
            );
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
        if (window.H5P?.externalDispatcher) {
            window.H5P.externalDispatcher.off(
                'initialized',
                this.onContentInitialized
            );
            window.H5P.externalDispatcher.off('xAPI', this.onxAPI);
        }
    }

    /**
     * Returns the copyright notice in HTML that you can insert somewhere to
     * display it. Undefined if there is no copyright information.
     */
    public getCopyrightHtml(): string | undefined {
        if (!this.h5pInstance) {
            console.error(
                'Cannot show copyright as H5P instance is undefined. The H5P object might not be initialized yet.'
            );
            return undefined;
        }
        if (!this.h5pObject) {
            console.error(
                'H5P object undefined. This typically means H5P has not been initialized yet.'
            );
            return undefined;
        }

        let metadata = this.h5pInstance.contentData?.metadata;
        if (!metadata) {
            metadata =
                this.playerModel.integration.contents[
                    `cid-${this.playerModel.contentId}`
                ].metadata;
            if (!metadata) {
                return undefined;
            }
        }

        let parameters: any;
        // We need to call JSON.parse in the context of the window the H5P
        // content exists in. The reason is that H5P.getCopyrights compares
        // object prototypes when traversing the parameters and the object
        // prototypes are not identical across windows.  (Cp.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/instanceof#instanceof_and_multiple_context_e.g._frames_or_windows)
        try {
            parameters = this.h5pWindow.JSON.parse(
                this.playerModel.integration.contents[
                    `cid-${this.playerModel.contentId}`
                ].jsonContent
            );
        } catch (error: any) {
            console.error(
                'Could not get parameters for content object with id ',
                this.playerModel.contentId,
                '. The copyright text might be incomplete. Details: ',
                error
            );
        }

        return this.h5pObject.getCopyrights(
            this.h5pInstance,
            parameters,
            this.playerModel.contentId,
            metadata
        );
    }

    /**
     * @returns true if there is copyright information to be displayed.
     */
    public hasCopyrightInformation(): boolean {
        return !!this.getCopyrightHtml();
    }

    /**
     * Asks the H5P content to resize itself inside the dimensions of the
     * container.
     *
     * Has no effect until the H5P object has fully initialized.
     */
    public resize(): void {
        if (!this.h5pInstance || !this.h5pInstance.trigger) {
            return;
        }
        this.h5pInstance.trigger('resize');
    }

    /**
     * Displays the copyright notice in the regular H5P way.
     */
    public showCopyright(): void {
        const copyrightHtml = this.getCopyrightHtml();
        const dialog = new this.h5pObject.Dialog(
            'copyrights',
            this.h5pObject.t('copyrightInformation'),
            copyrightHtml,
            this.h5pObject.jQuery('.h5p-container')
        );
        dialog.open(true);
    }

    /**
     * Called when any H5P content signals that it was initialized
     */
    private onContentInitialized = (): void => {
        const divMode = this.playerModel.embedTypes.includes('div');
        this.h5pObject = divMode
            ? window.H5P
            : (
                  document.getElementById(
                      `h5p-iframe-${this.playerModel.contentId}`
                  ) as HTMLIFrameElement
              ).contentWindow.H5P;
        this.h5pWindow = divMode
            ? window
            : (
                  document.getElementById(
                      `h5p-iframe-${this.playerModel.contentId}`
                  ) as HTMLIFrameElement
              ).contentWindow;
        this.h5pInstance = this.h5pObject?.instances?.find(
            // H5P converts our string contentId into number, so we don't use ===
            // eslint-disable-next-line eqeqeq
            (i) => i.contentId == this.contentId
        );
        if (this.h5pInstance) {
            this.dispatchEvent(
                new CustomEvent('initialized', {
                    detail: { contentId: this.contentId }
                })
            );
            if (window.H5P?.externalDispatcher) {
                window.H5P.externalDispatcher.off(
                    'initialized',
                    this.onContentInitialized
                );
            }
        }
    };

    private onxAPI = (event: IxAPIEvent): void => {
        if (
            `${event.data?.statement?.object?.definition?.extensions['http://h5p.org/x-api/h5p-local-content-id']}` ===
            `${this.playerModel.contentId}`
        ) {
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
        }
    };

    /**
     * Displays content.
     * @param {string} contentId
     */
    private async render(
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: string
    ): Promise<void> {
        if (!this.loadContentCallback) {
            return;
        }
        // Get data from H5P server
        try {
            console.log('readOnlyState', readOnlyState);
            this.playerModel = await this.loadContentCallback(
                contentId,
                contextId,
                asUserId,
                readOnlyState === 'true'
            );
        } catch (error) {
            this.root.innerHTML = `<p>Error loading H5P content from server: ${error.message}</p>`;
            return;
        }

        // Reset the component's DOM
        this.root.innerHTML = '';

        // We have to prevent H5P from initializing when the h5p.js file is
        // loaded.
        if (!window.H5P) {
            window.H5P = {} as any;
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
        if (window.H5P.externalDispatcher) {
            window.H5P.externalDispatcher.on(
                'initialized',
                this.onContentInitialized,
                this
            );
        }
        window.H5P.preventInit = false;

        if (window.H5P.externalDispatcher) {
            // detach xAPI listener first to avoid having multiple listeners on the
            // same content (can safely be done even if it hasn't been attached
            // before)
            window.H5P.externalDispatcher.off('xAPI', this.onxAPI);
            // attach xAPI listener
            window.H5P.externalDispatcher.on('xAPI', this.onxAPI);
        }

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
