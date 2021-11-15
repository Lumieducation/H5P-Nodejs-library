import { ContentId, IUser } from '../../src/types';

const mock = jest
    .fn()
    .mockImplementation((contentId?: ContentId, user?: IUser) => {
        return {
            deleteContentUserData: jest.fn().mockImplementation(() => {
                return;
            }),
            loadContentUserData: jest.fn().mockImplementation(() => {
                return 'this is some data';
            }),
            saveContentUserData: jest.fn().mockImplementation(() => {
                return;
            }),
            generateContentUserDataIntegration: jest
                .fn()
                .mockImplementation(() => {
                    return [{ state: `${contentId}-${user.id}` }];
                })
        };
    });

export default mock;
