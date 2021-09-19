import React from 'react';
import { IInstalledLibrary } from '@lumieducation/h5p-server';

const yesNo = (value: boolean | 0 | 1) =>
    value ? (
        <span className="fa fa-check text-success"></span>
    ) : (
        <span className="fa fa-times text-danger"></span>
    );
export default (props: {
    details: IInstalledLibrary & {
        dependentsCount: number;
        instancesAsDependencyCount: number;
        instancesCount: number;
        isAddon: boolean;
    };
    onClose: () => void;
}) => (
    <div>
        {props.details === undefined ? (
            <div>
                <div
                    className="spinner-grow spinner-grow-sm text-primary align-middle mr-2"
                    role="status"
                >
                    <span className="sr-only"></span>
                </div>
                <span className="align-middle">
                    Loading library details from REST endpoint ...
                </span>
            </div>
        ) : (
            <div>
                <button
                    className="btn btn-secondary float-right"
                    onClick={() => props.onClose()}
                >
                    Close
                </button>
                <div>
                    <table className="table-sm table-borderless">
                        <thead></thead>
                        <tbody>
                            <tr>
                                <th>Author</th>
                                <td>{props.details.author || '-'}</td>
                            </tr>
                            <tr>
                                <th>Description</th>
                                <td>{props.details.description || '-'}</td>
                            </tr>
                            <tr>
                                <th>License</th>
                                <td>{props.details.license || '-'}</td>
                            </tr>
                            <tr>
                                <th>Standalone content type</th>
                                <td>{yesNo(props.details.runnable)}</td>
                            </tr>
                            <tr>
                                <th>
                                    Restricted (can only be used with privilege)
                                </th>
                                <td>{yesNo(props.details.restricted)}</td>
                            </tr>
                            <tr>
                                <th>Supports fullscreen</th>
                                <td>{yesNo(props.details.fullscreen)}</td>
                            </tr>
                            <tr>
                                <th>Addon</th>
                                <td>{yesNo(props.details.isAddon)}</td>
                            </tr>
                            <tr>
                                <th>Allowed embed types</th>
                                <td>
                                    {props.details.embedTypes?.join(' ') || '-'}
                                </td>
                            </tr>
                            <tr>
                                <th>
                                    Number of libraries that use the library
                                </th>
                                <td>{props.details.dependentsCount}</td>
                            </tr>
                            <tr>
                                <th>
                                    Objects created with this library as the
                                    main content type
                                </th>
                                <td>{props.details.instancesCount}</td>
                            </tr>
                            <tr>
                                <th>
                                    Objects in which this library is used by
                                    another library
                                </th>
                                <td>
                                    {props.details.instancesAsDependencyCount}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);
