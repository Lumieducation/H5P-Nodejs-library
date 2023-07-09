import { ContentId } from '../../src/types';

let mockData;
const mock = jest.fn().mockImplementation(() => {
    return {
        deleteAllContentUserDataByUser: jest.fn().mockImplementation(() => {
            return;
        }),
        deleteAllContentUserDataByContentId: jest
            .fn()
            .mockImplementation(() => {
                return;
            }),
        deleteInvalidatedContentUserData: jest.fn().mockImplementation(() => {
            return;
        }),
        getContentUserData: jest.fn().mockImplementation(() => {
            return 'this is some data';
        }),
        createOrUpdateContentUserData: jest.fn().mockImplementation(() => {
            return;
        }),
        createOrUpdateFinishedData: jest.fn().mockImplementation(() => {
            return;
        }),
        setMockData: (m) => (mockData = m),
        getContentUserDataByContentIdAndUser: jest
            .fn()
            .mockImplementation((contentId: ContentId, userId: string) => {
                return (
                    mockData || [
                        {
                            contentId,
                            userId: userId,
                            dataType: 'state',
                            subContentId: '0',
                            userState: `${contentId}-${userId}`,
                            preload: true
                        }
                    ]
                );
            })
    };
});

export default mock;
