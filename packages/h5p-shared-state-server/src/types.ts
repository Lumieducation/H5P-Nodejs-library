import type {
    ContentId,
    ContentParameters,
    IContentMetadata,
    ILibraryMetadata,
    ILibraryName,
    IUser
} from '@lumieducation/h5p-server';

// The logic check typing
export interface ILogicCheck {
    [query: `$.${string}`]:
        | IComparisonOperator
        | number
        | string
        | boolean
        | any[]
        | IQuery;
}

export interface IComparisonOperator {
    $eq?: any[] | number | string | boolean | IQuery;
    $gt?: number | IQuery;
    $gte?: number | IQuery;
    $in?: any[] | IQuery;
    $lt?: number | IQuery;
    $lte?: number | IQuery;
    $ne?: any[] | number | string | boolean | IQuery;
    $nin?: any[] | IQuery;
}

export interface IQuery {
    $query: string;
}

export interface ILogicalOperator {
    $and?: (ILogicCheck | IComparisonOperator | ILogicalOperator)[];
    $not?: ILogicCheck | IComparisonOperator | ILogicalOperator;
    $nor?: [
        ILogicCheck | IComparisonOperator | ILogicalOperator,
        ILogicCheck | IComparisonOperator | ILogicalOperator
    ];
    $or?: (ILogicCheck | IComparisonOperator | ILogicalOperator)[];
    $defined?: IQuery;
}

export type ILogicCheckSchema = (ILogicCheck | ILogicalOperator)[];

// Callback functions

export type GetLibraryMetadataFunction = (
    library: ILibraryName,
    language?: string
) => Promise<ILibraryMetadata>;
export type GetLibraryFileAsJsonFunction = (
    libraryName: ILibraryName,
    filename: string
) => Promise<any>;
export type RequestToUserFunction = (req: any) => Promise<IUser>;
export type GetPermissionForUserFunction = (
    user: IUser,
    contentId: string
) => Promise<'privileged' | 'user' | undefined>;
export type GetContentMetadataFunction = (
    contentId: ContentId,
    user: IUser
) => Promise<IContentMetadata>;
export type GetContentParametersFunction = (
    contentId: ContentId,
    user: IUser
) => Promise<ContentParameters>;

/**
 * Internal data passed through the sharedb middleware
 */
export interface ISharedStateAgent {
    user: IUser;
    fromServer: boolean;
    permission: 'privileged' | 'user';
    params: any;
    ubername: string;
    libraryMetadata: ILibraryMetadata;
}
