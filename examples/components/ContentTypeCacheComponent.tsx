// tslint:disable-next-line: no-implicit-dependencies
import React from 'react';

import ContentTypeCacheService from './ContentTypeCacheService.js';

export default class ContentTypeCacheComponent extends React.Component {
    constructor(props: any) {
        super(props);

        this.state = {
            lastCacheUpdate: undefined,
            updatingCache: null
        };
        this.contentTypeCacheService = new ContentTypeCacheService(
            'h5p/content-type-cache'
        );
    }

    public state: {
        lastCacheUpdate: Date;
        updatingCache: boolean;
    };

    private contentTypeCacheService: ContentTypeCacheService;

    public async componentDidMount(): Promise<void> {
        const lastCacheUpdate = await this.contentTypeCacheService.getCacheUpdate();
        this.setState({ lastCacheUpdate });
    }

    public render(): React.ReactNode {
        return (
            <div>
                <h2>
                    <span className="fa fa-globe"></span> H5P Hub content type
                    list
                </h2>
                <p>
                    The list of content types displayed in the editor must
                    regularly be fetched from the H5P Hub. If the list is
                    outdated, you can manually fetch it here.
                </p>
                <div>
                    Last update:{' '}
                    {this.state.lastCacheUpdate !== undefined
                        ? this.state.lastCacheUpdate === null
                            ? 'never'
                            : this.state.lastCacheUpdate.toString()
                        : 'Loading...'}
                </div>
                <button
                    onClick={() => this.updateCache()}
                    className="btn btn-primary my-2"
                    disabled={this.state.updatingCache}
                >
                    {this.state.updatingCache ? (
                        <div
                            className="spinner-border spinner-border-sm m-2 align-middle"
                            role="status"
                        ></div>
                    ) : (
                        <span className="fa fa-sync m-2"></span>
                    )}
                    <span className="align-middle">Update now</span>
                </button>
            </div>
        );
    }

    public async updateCache(): Promise<void> {
        this.setState({ updatingCache: true });
        try {
            const lastUpdate = await this.contentTypeCacheService.postUpdateCache();
            this.setState({
                lastCacheUpdate: lastUpdate,
                updatingCache: false
            });
        } catch {
            this.setState({
                updatingCache: false
            });
        }
    }
}
