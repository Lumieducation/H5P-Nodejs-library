import React from 'react';

// We reference the build directory (which contains a .d.ts file) to avoid
// including the whole server part of the library in the build of the client.
import type { ILibraryAdministrationOverviewItem } from '@lumieducation/h5p-server';

// The .js references are necessary for requireJs to work in the browser.
import LibraryDetails from './LibraryDetailsComponent.js';
import {
    ILibraryViewModel,
    LibraryAdministrationService
} from './LibraryAdministrationService.js';

/**
 * The components displays a list with the currently installed libraries. It
 * offers basic administration functions like deleting libraries, showing more
 * details of an installed library and uploading new libraries.
 *
 * It uses Bootstrap 4 to layout the component. You can override or replace the
 * render() method to customize looks.
 */
export default class LibraryAdmin extends React.Component {
    /**
     * @param endpointUrl the URL of the REST library administration endpoint.
     */
    constructor(props: { endpointUrl: string }) {
        super(props);

        this.state = {
            isUploading: false,
            libraries: null,
            message: null
        };
        this.librariesService = new LibraryAdministrationService(
            props.endpointUrl
        );
    }

    public state: {
        isUploading: boolean;
        libraries: ILibraryViewModel[];
        message: {
            text: string;
            type: 'primary' | 'success' | 'danger';
        };
    };

    protected librariesService: LibraryAdministrationService;

    public async componentDidMount(): Promise<void> {
        return this.updateList();
    }

    public render(): React.ReactNode {
        return (
            <div>
                <h2>
                    <span className="fa fa-book-open"></span> Installed
                    libraries
                </h2>
                <form>
                    <div className="form-group">
                        <label
                            className={`btn btn-primary ${
                                this.state.isUploading ? 'disabled' : ''
                            }`}
                        >
                            {this.state.isUploading ? (
                                <div
                                    className="spinner-border spinner-border-sm m-2 align-middle"
                                    role="status"
                                ></div>
                            ) : (
                                <span className="fa fa-upload m-2"></span>
                            )}{' '}
                            Upload libraries
                            <input
                                disabled={this.state.isUploading}
                                type="file"
                                id="file2"
                                hidden
                                onChange={(e) =>
                                    this.fileSelected(e.target.files)
                                }
                            ></input>
                        </label>
                    </div>
                </form>
                {this.state.message ? (
                    <div className={`alert alert-${this.state.message.type}`}>
                        {this.state.message.text}
                    </div>
                ) : null}
                {this.state.libraries === null ? (
                    <div>
                        <div
                            className="spinner-grow spinner-grow-sm text-primary align-middle mr-2"
                            role="status"
                        >
                            <span className="sr-only"></span>
                        </div>
                        <span className="align-middle">
                            Loading installed libraries from REST endpoint ...
                        </span>
                    </div>
                ) : (
                    <div>
                        <p>
                            The following libraries are installed in the library
                            storage:
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
                                {this.state.libraries?.map((info) => (
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
                                                            this.restrict(info)
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
                                                        this.showDetails(info)
                                                    }
                                                >
                                                    <span
                                                        className="fa fa-info m-2"
                                                        style={{
                                                            display: 'inline'
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
                                                        details={info.details}
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
        );
    }

    protected closeDetails(library: ILibraryViewModel): void {
        this.updateLibraryState(library, { isShowingDetails: false });
    }

    protected async deleteLibrary(library: ILibraryViewModel): Promise<void> {
        const newState = this.updateLibraryState(library, {
            isDeleting: true
        });

        try {
            await this.librariesService.deleteLibrary(library);
            const libraryIndex = this.state.libraries.indexOf(newState);
            this.setState({
                libraries: this.state.libraries
                    .slice(0, libraryIndex)
                    .concat(this.state.libraries.slice(libraryIndex + 1))
            });
            this.displayMessage(
                `Successfully deleted library ${library.title} (${library.majorVersion}.${library.minorVersion}).`
            );
            await this.updateList();
        } catch {
            this.displayMessage(
                `Error deleting library ${library.title} (${library.majorVersion}.${library.minorVersion}).`,
                'danger'
            );
            this.updateLibraryState(newState, { isDeleting: false });
            await this.updateList();
        }
    }

    protected async fileSelected(files: FileList): Promise<void> {
        if (!files[0]) {
            return;
        }
        try {
            this.setState({ isUploading: true });
            const { installed, updated } =
                await this.librariesService.postPackage(files[0]);
            if (installed + updated === 0) {
                this.displayMessage(
                    'Upload successful, but no libraries were installed or updated. The content type is probably already installed on the system.'
                );
                return;
            }
            this.displayMessage(
                `Successfully installed ${installed} and updated ${updated} libraries.`,
                'success'
            );
        } catch {
            this.displayMessage(`Error while uploading package.`, 'danger');
            return;
        } finally {
            this.setState({ isUploading: false });
        }
        this.setState({ libraries: null });
        const libraries = await this.librariesService.getLibraries();
        this.setState({ libraries });
    }

    protected async restrict(
        library: ILibraryAdministrationOverviewItem
    ): Promise<void> {
        try {
            const newLibrary = await this.librariesService.patchLibrary(
                library,
                {
                    restricted: !library.restricted
                }
            );
            this.updateLibraryState(library, newLibrary);
            this.displayMessage(
                `Successfully set restricted property of library ${library.title} (${library.majorVersion}.${library.minorVersion}) to ${newLibrary.restricted}.`,
                'success'
            );
        } catch {
            this.displayMessage(
                `Error setting restricted proeprty of library ${library.title} (${library.majorVersion}.${library.minorVersion}).`,
                'danger'
            );
        }
    }

    protected async showDetails(library: ILibraryViewModel): Promise<void> {
        const newState = this.updateLibraryState(library, {
            isShowingDetails: true
        });

        if (!library.details) {
            try {
                const details = await this.librariesService.getLibrary(library);
                this.updateLibraryState(newState, {
                    details
                });
            } catch {
                this.displayMessage(
                    `Error getting detailed information about library ${library.title} (${library.majorVersion}.${library.minorVersion}).`,
                    'danger'
                );
            }
        }
    }

    public async updateList(): Promise<void> {
        const libraries = await this.librariesService.getLibraries();
        this.setState({ libraries });
    }

    protected displayMessage(
        text: string,
        type: 'primary' | 'success' | 'danger' = 'primary'
    ): void {
        this.setState({
            message: {
                text,
                type
            }
        });
    }

    protected updateLibraryState(
        library: ILibraryViewModel,
        changes: Partial<ILibraryViewModel>
    ): ILibraryViewModel {
        const libraryIndex = this.state.libraries.indexOf(library);
        const newState = {
            ...library,
            ...changes
        };
        this.setState({
            libraries: [
                ...this.state.libraries.slice(0, libraryIndex),
                newState,
                ...this.state.libraries.slice(libraryIndex + 1)
            ]
        });
        return newState;
    }
}
