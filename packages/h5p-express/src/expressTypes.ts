import { Request } from 'express';

import { H5PFile, IUser } from '@lumieducation/h5p-server';

export interface IRequestWithLanguage extends Request {
    language: string;
}
export interface IRequestWithUser extends Request {
    user: IUser;
}

export interface IActionRequest extends IRequestWithUser {
    files:
        | {
              file: H5PFile;
              h5p: H5PFile;
          }
        | any;
}
