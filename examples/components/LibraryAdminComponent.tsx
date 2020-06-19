// tslint:disable-next-line: no-implicit-dependencies
import React from 'react';

// We reference the build directory here directly referencing the TS index
// file would include the whole library in the build for the client
import type {
    IInstalledLibrary,
    ILibraryManagementOverviewItem
} from '../../build/src';

import LibraryDetails from './LibraryDetailsComponent.js';
import {
    ILibraryViewModel,
    LibraryManagementService
} from './LibraryManagementService.js';

export default class LibraryAdmin extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            lastCacheUpdate: new Date(),
            libraryInfo: null,
            updatingCache: null
        };
        this.service = new LibraryManagementService('h5p/libraries');
    }

    public state: {
        lastCacheUpdate: Date;
        libraryInfo: ILibraryViewModel[];
        updatingCache: boolean;
    };

    private service: LibraryManagementService;

    public closeDetails(
        library: ILibraryManagementOverviewItem & {
            isShowingDetails?: boolean;
        }
    ) {
        const libraryIndex = this.state.libraryInfo.indexOf(library);
        this.setState({
            libraryInfo: [
                ...this.state.libraryInfo.slice(0, libraryIndex),
                {
                    ...library,
                    isShowingDetails: false
                },
                ...this.state.libraryInfo.slice(libraryIndex + 1)
            ]
        });
    }

    public async componentDidMount() {
        try {
            const libraries = await this.service.getLibraries();
            this.setState({ libraryInfo: libraries });
        } catch {
            this.setState({ libraryInfo: null });
        }
    }

    public deleteLibrary(
        library: ILibraryManagementOverviewItem & {
            isDeleting?: boolean;
        }
    ) {
        const libraryIndex = this.state.libraryInfo.indexOf(library);
        this.setState({
            libraryInfo: [
                ...this.state.libraryInfo.slice(0, libraryIndex),
                {
                    ...library,
                    isDeleting: true
                },
                ...this.state.libraryInfo.slice(libraryIndex + 1)
            ]
        });

        const xhttp = new XMLHttpRequest();
        xhttp.open(
            'DELETE',
            `h5p/libraries/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
            true
        );
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4 && xhttp.status === 204) {
                this.setState({
                    libraryInfo: this.state.libraryInfo
                        .slice(0, libraryIndex)
                        .concat(this.state.libraryInfo.slice(libraryIndex + 1))
                });
            } else {
                this.setState({
                    libraryInfo: [
                        ...this.state.libraryInfo.slice(0, libraryIndex),
                        {
                            ...library,
                            isDeleting: false
                        },
                        ...this.state.libraryInfo.slice(libraryIndex + 1)
                    ]
                });
            }
        };
        xhttp.send();
    }

    public fileSelected(event) {}

    public render() {
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
                        Last update: {this.state.lastCacheUpdate.toString()}
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
                                    onChange={(e) => this.fileSelected(e)}
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

    public restrict(library: ILibraryManagementOverviewItem) {
        const xhttp = new XMLHttpRequest();
        xhttp.open(
            'PATCH',
            `h5p/libraries/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
            true
        );
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4 && xhttp.status === 204) {
                const libraryIndex = this.state.libraryInfo.indexOf(library);
                this.setState({
                    libraryInfo: [
                        ...this.state.libraryInfo.slice(0, libraryIndex),
                        { ...library, restricted: !library.restricted },
                        ...this.state.libraryInfo.slice(libraryIndex + 1)
                    ]
                });
            }
        };
        xhttp.setRequestHeader(
            'Content-Type',
            'application/json;charset=UTF-8'
        );
        xhttp.send(JSON.stringify({ restricted: !library.restricted }));
    }

    public showDetails(
        library: ILibraryManagementOverviewItem & {
            details?: IInstalledLibrary & {
                dependentsCount: number;
                instancesAsDependencyCount: number;
                instancesCount: number;
                isAddon: boolean;
            };
            isShowingDetails?: boolean;
        }
    ) {
        const libraryIndex = this.state.libraryInfo.indexOf(library);
        this.setState({
            libraryInfo: [
                ...this.state.libraryInfo.slice(0, libraryIndex),
                {
                    ...library,
                    isShowingDetails: true
                },
                ...this.state.libraryInfo.slice(libraryIndex + 1)
            ]
        });

        if (!library.details) {
            const xhttp = new XMLHttpRequest();
            xhttp.open(
                'GET',
                `h5p/libraries/${library.machineName}-${library.majorVersion}.${library.minorVersion}`,
                true
            );
            xhttp.onreadystatechange = (ev) => {
                if (xhttp.readyState === 4 && xhttp.status === 200) {
                    this.setState({
                        libraryInfo: [
                            ...this.state.libraryInfo.slice(0, libraryIndex),
                            {
                                ...library,
                                isShowingDetails: true,
                                details: JSON.parse(xhttp.responseText)
                            },
                            ...this.state.libraryInfo.slice(libraryIndex + 1)
                        ]
                    });
                }
            };
            xhttp.send();
        }
    }

    public updateCache() {
        this.setState({ updatingCache: true });
        const xhttp = new XMLHttpRequest();
        xhttp.open('POST', 'h5p/libraries/content-type-cache/update', true);
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState === 4 && xhttp.status === 200) {
                this.setState({
                    lastCacheUpdate: new Date(
                        JSON.parse(xhttp.responseText).lastUpdate
                    ),
                    updatingCache: false
                });
            } else {
                this.setState({
                    updatingCache: false
                });
            }
        };
        xhttp.send();
    }
}
