// tslint:disable-next-line: no-implicit-dependencies
import React from 'react';

// We reference the build directory here directly referencing the TS index
// file would include the whole library in the build for the client
import type { ILibraryAdministrationOverviewItem } from '../../build/src';

import LibraryDetails from './LibraryDetailsComponent.js';
import {
    ILibraryViewModel,
    LibraryAdministrationService
} from './LibraryAdministrationService.js';
import ContentTypeCacheService from './ContentTypeCacheService.js';

export default class LibraryAdmin extends React.Component {
    constructor(props: any) {
        super(props);

        this.state = {
            lastCacheUpdate: null,
            libraryInfo: null,
            updatingCache: null
        };
        this.librariesService = new LibraryAdministrationService(
            'h5p/libraries'
        );
        this.contentTypeCacheService = new ContentTypeCacheService(
            'h5p/content-type-cache'
        );
    }

    public state: {
        lastCacheUpdate: Date;
        libraryInfo: ILibraryViewModel[];
        updatingCache: boolean;
    };

    private contentTypeCacheService: ContentTypeCacheService;
    private librariesService: LibraryAdministrationService;

    public closeDetails(library: ILibraryViewModel): void {
        this.updateLibraryState(library, { isShowingDetails: false });
    }

    public async componentDidMount(): Promise<void> {
        const lastCacheUpdate = await this.contentTypeCacheService.getCacheUpdate();
        this.setState({ lastCacheUpdate });
        const libraryInfo = await this.librariesService.getLibraries();
        this.setState({ libraryInfo });
    }

    public async deleteLibrary(library: ILibraryViewModel): Promise<void> {
        const newState = this.updateLibraryState(library, {
            isDeleting: true
        });

        try {
            await this.librariesService.deleteLibrary(library);
            const libraryIndex = this.state.libraryInfo.indexOf(newState);
            this.setState({
                libraryInfo: this.state.libraryInfo
                    .slice(0, libraryIndex)
                    .concat(this.state.libraryInfo.slice(libraryIndex + 1))
            });
        } catch {
            this.updateLibraryState(newState, { isDeleting: false });
        }
    }

    public fileSelected(): void {
        return;
    }

    public render(): React.ReactNode {
        return (
            <div>
                <div>
                    <h2>
                        <span className="fa fa-globe"></span> H5P Hub content
                        type list
                    </h2>
                    <p>
                        The list of content types displayed in the editor must
                        regularly be fetched from the H5P Hub. If the list is
                        outdated, you can manually fetch it here.
                    </p>
                    <div>
                        Last update:{' '}
                        {this.state.lastCacheUpdate
                            ? this.state.lastCacheUpdate.toString()
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
                <hr />
                <div>
                    <h2>
                        <span className="fa fa-book-open"></span> Installed
                        libraries
                    </h2>
                    <form>
                        <div className="form-group">
                            <label className="btn btn-primary">
                                <span className="fa fa-upload m-2"></span>{' '}
                                Upload libraries
                                <input
                                    type="file"
                                    id="file2"
                                    hidden
                                    onChange={(e) => this.fileSelected()}
                                ></input>
                            </label>
                        </div>
                    </form>
                    {this.state.libraryInfo === null ? (
                        <div>
                            <div
                                className="spinner-grow spinner-grow-sm text-primary align-middle mr-2"
                                role="status"
                            >
                                <span className="sr-only"></span>
                            </div>
                            <span className="align-middle">
                                Loading installed libraries from REST endpoint
                                ...
                            </span>
                        </div>
                    ) : (
                        <div>
                            <p>
                                The following libraries are installed in the
                                library storage:
                            </p>
                            <table className="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Title</th>
                                        <th>Restricted</th>
                                        <th># used directly</th>
                                        <th># used in other content types</th>
                                        <th># dependent libraries</th>
                                        <th></th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.state.libraryInfo?.map((info) => (
                                        <React.Fragment
                                            key={`${info.machineName}-${info.majorVersion}.${info.minorVersion}`}
                                        >
                                            <tr>
                                                <td>
                                                    {info.title} (
                                                    {info.majorVersion}.
                                                    {info.minorVersion}.
                                                    {info.patchVersion})
                                                </td>
                                                <td>
                                                    {info.runnable ? (
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                info.restricted
                                                            }
                                                            onChange={() =>
                                                                this.restrict(
                                                                    info
                                                                )
                                                            }
                                                        ></input>
                                                    ) : null}
                                                </td>
                                                <td>{info.instancesCount}</td>
                                                <td>
                                                    {
                                                        info.instancesAsDependencyCount
                                                    }
                                                </td>
                                                <td>{info.dependentsCount}</td>
                                                <td>
                                                    <button
                                                        className="btn btn-info"
                                                        onClick={() =>
                                                            this.showDetails(
                                                                info
                                                            )
                                                        }
                                                    >
                                                        <span
                                                            className="fa fa-info m-2"
                                                            style={{
                                                                display:
                                                                    'inline'
                                                            }}
                                                        ></span>
                                                        <span>details</span>
                                                    </button>
                                                </td>
                                                <td>
                                                    {info.canBeDeleted ? (
                                                        <button
                                                            className="btn btn-danger"
                                                            disabled={
                                                                info.isDeleting
                                                            }
                                                            onClick={() =>
                                                                this.deleteLibrary(
                                                                    info
                                                                )
                                                            }
                                                        >
                                                            <span
                                                                className="fa fa-trash-alt m-2"
                                                                style={{
                                                                    display:
                                                                        'inline'
                                                                }}
                                                            ></span>
                                                            <span>delete</span>
                                                        </button>
                                                    ) : (
                                                        <div></div>
                                                    )}
                                                </td>
                                            </tr>
                                            {info.isShowingDetails ? (
                                                <tr>
                                                    <td colSpan={7}>
                                                        <LibraryDetails
                                                            details={
                                                                info.details
                                                            }
                                                            onClose={() =>
                                                                this.closeDetails(
                                                                    info
                                                                )
                                                            }
                                                        ></LibraryDetails>
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    public async restrict(
        library: ILibraryAdministrationOverviewItem
    ): Promise<void> {
        const newLibrary = await this.librariesService.patchLibrary(library, {
            restricted: !library.restricted
        });
        this.updateLibraryState(library, newLibrary);
    }

    public async showDetails(library: ILibraryViewModel): Promise<void> {
        const newState = this.updateLibraryState(library, {
            isShowingDetails: true
        });

        if (!library.details) {
            const details = await this.librariesService.getLibrary(library);
            this.updateLibraryState(newState, {
                details
            });
        }
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

    private updateLibraryState(
        library: ILibraryViewModel,
        changes: Partial<ILibraryViewModel>
    ): ILibraryViewModel {
        const libraryIndex = this.state.libraryInfo.indexOf(library);
        const newState = {
            ...library,
            ...changes
        };
        this.setState({
            libraryInfo: [
                ...this.state.libraryInfo.slice(0, libraryIndex),
                newState,
                ...this.state.libraryInfo.slice(libraryIndex + 1)
            ]
        });
        return newState;
    }
}
