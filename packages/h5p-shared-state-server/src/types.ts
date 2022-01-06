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
