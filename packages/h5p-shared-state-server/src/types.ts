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
    $and?: (ILogicCheck | IComparisonOperator)[];
    $not?: ILogicCheck | IComparisonOperator;
    $nor?: [
        ILogicCheck | IComparisonOperator,
        ILogicCheck | IComparisonOperator
    ];
    $or?: (ILogicCheck | IComparisonOperator)[];
}
