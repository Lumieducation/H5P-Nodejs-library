import React from 'react';

import {
    defineElements,
    H5PPlayerComponent
} from '@lumieducation/h5p-webcomponents';
import { IPlayerModel } from '@lumieducation/h5p-server';

defineElements('h5p-player');

declare global {
    namespace JSX {
        interface IntrinsicElements {
            'h5p-player': {
                'content-id'?: string;
                ref?: any;
            };
        }
    }
}

export default class H5PPlayerUI extends React.Component<{
    contentId: string;
    loadContentCallback: (contentId: string) => Promise<IPlayerModel>;
    onInitialized?: (contentId: string) => void;
}> {
    constructor(props: {
        contentId: string;
        loadContentCallback: (contentId: string) => Promise<IPlayerModel>;
        onInitialized?: (contentId: string) => void;
    }) {
        super(props);
        this.h5pPlayer = React.createRef();
    }

    private h5pPlayer: React.RefObject<H5PPlayerComponent>;

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

    public getSnapshotBeforeUpdate(): void {
        // Should the old editor instance be destroyed, we unregister from it...
        this.unregisterEvents();
        return null;
    }

    public render(): React.ReactNode {
        return (
            <h5p-player
                ref={this.h5pPlayer}
                content-id={this.props.contentId}
            ></h5p-player>
        );
    }

    private loadContentCallbackWrapper = (
        contentId: string
    ): Promise<IPlayerModel> => {
        return this.props.loadContentCallback(contentId);
    };

    private onInitialized = (event: CustomEvent<{ contentId: string }>) => {
        if (this.props.onInitialized) {
            this.props.onInitialized(event.detail.contentId);
        }
    };

    private registerEvents(): void {
        this.h5pPlayer.current?.addEventListener(
            'initialized',
            this.onInitialized
        );
    }

    private setServiceCallbacks(): void {
        if (this.h5pPlayer.current) {
            this.h5pPlayer.current.loadContentCallback = this.loadContentCallbackWrapper;
        }
    }

    private unregisterEvents(): void {
        this.h5pPlayer.current?.removeEventListener(
            'initialized',
            this.onInitialized
        );
    }
}
