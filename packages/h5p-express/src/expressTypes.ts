import { Request } from 'express';

import { File, IUser } from '@lumieducation/h5p-server';

export interface IRequestWithLanguage extends Request {
    language: string;
}
export interface IRequestWithUser extends Request {
    user: IUser;
}

export interface IActionRequest extends IRequestWithUser {
    files:
        | {
              file: File;
              h5p: File;
          }
        | any;
}
