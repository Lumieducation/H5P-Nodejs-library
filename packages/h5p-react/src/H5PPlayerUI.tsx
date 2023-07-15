import * as React from 'react';
import { Component, createRef, ReactNode, RefObject } from 'react';

import {
    defineElements,
    H5PPlayerComponent,
    IxAPIEvent,
    IContext,
    IH5PInstance,
    IH5P
} from '@lumieducation/h5p-webcomponents';
import type { IPlayerModel } from '@lumieducation/h5p-server';

defineElements('h5p-player');

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'h5p-player': {
                'content-id'?: string;
                'context-id'?: string;
                'read-only-state'?: boolean;
                'as-user-id'?: string;
                ref?: any;
            };
        }
    }
}

interface IH5PPlayerUIProps {
    contentId: string;
    contextId?: string;
    asUserId?: string;
    readOnlyState?: boolean;
    loadContentCallback: (
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ) => Promise<IPlayerModel>;
    onInitialized?: (contentId: string) => void;
    onxAPIStatement?: (statement: any, context: any, event: IxAPIEvent) => void;
}

export default class H5PPlayerUI extends Component<IH5PPlayerUIProps> {
    constructor(props: IH5PPlayerUIProps) {
        super(props);
        this.h5pPlayer = createRef();
    }

    private h5pPlayer: RefObject<H5PPlayerComponent>;

    public componentDidMount(): void {
        this.registerEvents();
        this.setServiceCallbacks();
    }

    public componentDidUpdate(): void {
        this.registerEvents();
        this.setServiceCallbacks();
    }

    public componentWillUnmount(): void {
        this.unregisterEvents();
    }

    /**
     * The internal H5P instance object of the H5P content.
     *
     * Only available after the `initialized` event was fired. Important: This
     * object is only partially typed and there are more properties and methods
     * on it!
     */
    public get h5pInstance(): IH5PInstance | undefined {
        return this.h5pPlayer.current?.h5pInstance;
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
    public get h5pObject(): IH5P | undefined {
        return this.h5pPlayer.current?.h5pObject;
    }

    /**
     * Returns the copyright notice in HTML that you can insert somewhere to
     * display it. Undefined if there is no copyright information.
     */
    public getCopyrightHtml(): string {
        return this.h5pPlayer.current?.getCopyrightHtml() ?? '';
    }

    public getSnapshotBeforeUpdate(): void {
        // Should the old editor instance be destroyed, we unregister from it...
        this.unregisterEvents();
        return null;
    }

    /**
     * @returns true if there is copyright information to be displayed.
     */
    public hasCopyrightInformation(): boolean {
        return this.h5pPlayer.current?.hasCopyrightInformation();
    }

    public render(): ReactNode {
        return (
            <h5p-player
                ref={this.h5pPlayer}
                content-id={this.props.contentId}
                context-id={this.props.contextId}
                as-user-id={this.props.asUserId}
                read-only-state={this.props.readOnlyState}
            />
        );
    }

    /**
     * Displays the copyright notice in the regular H5P way.
     */
    public showCopyright(): void {
        this.h5pPlayer.current?.showCopyright();
    }

    /**
     * Asks the H5P content to resize itself inside the dimensions of the
     * container.
     *
     * Has no effect until the H5P object has fully initialized.
     */
    public resize(): void {
        this.h5pPlayer.current?.resize();
    }

    private loadContentCallbackWrapper = (
        contentId: string,
        contextId?: string,
        asUserId?: string,
        readOnlyState?: boolean
    ): Promise<IPlayerModel> =>
        this.props.loadContentCallback(
            contentId,
            contextId,
            asUserId,
            readOnlyState
        );

    private onInitialized = (
        event: CustomEvent<{ contentId: string }>
    ): void => {
        if (this.props.onInitialized) {
            this.props.onInitialized(event.detail.contentId);
        }
    };

    private onxAPIStatement = (
        event: CustomEvent<{
            context: IContext;
            event: IxAPIEvent;
            statement: any;
        }>
    ): void => {
        if (this.props.onxAPIStatement) {
            this.props.onxAPIStatement(
                event.detail.statement,
                event.detail.context,
                event.detail.event
            );
        }
    };

    private registerEvents(): void {
        this.h5pPlayer.current?.addEventListener(
            'initialized',
            this.onInitialized
        );
        if (this.props.onxAPIStatement) {
            this.h5pPlayer.current?.addEventListener(
                'xAPI',
                this.onxAPIStatement
            );
        }
    }

    private setServiceCallbacks(): void {
        if (this.h5pPlayer.current) {
            this.h5pPlayer.current.loadContentCallback =
                this.loadContentCallbackWrapper;
        }
    }

    private unregisterEvents(): void {
        this.h5pPlayer.current?.removeEventListener(
            'initialized',
            this.onInitialized
        );
        if (this.props.onxAPIStatement) {
            this.h5pPlayer.current?.removeEventListener(
                'xAPI',
                this.onxAPIStatement
            );
        }
    }
}
