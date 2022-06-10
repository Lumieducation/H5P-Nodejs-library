import { Request } from 'express';

import { IUser } from '@lumieducation/h5p-server';

export interface IRequestWithLanguage extends Request {
    language: string;
}
export interface IRequestWithUser extends Request {
    user: IUser;
}

export interface IActionRequest extends IRequestWithUser {
    files:
        | {
              file: {
                  data?: Buffer;
                  mimetype: string;
                  name: string;
                  size: number;
                  tempFilePath?: string;
              };
              h5p: {
                  data?: Buffer;
                  mimetype: string;
                  name: string;
                  size: number;
                  tempFilePath?: string;
              };
          }
        | any;
}
