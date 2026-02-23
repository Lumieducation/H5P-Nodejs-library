import { ContentId } from '../../src/types';

let mockData;
const mock = vi.fn().mockImplementation(function () {
    return {
        deleteAllContentUserDataByUser: vi.fn().mockImplementation(() => {
            return;
        }),
        deleteAllContentUserDataByContentId: vi.fn().mockImplementation(() => {
            return;
        }),
        deleteInvalidatedContentUserData: vi.fn().mockImplementation(() => {
            return;
        }),
        getContentUserData: vi.fn().mockImplementation(() => {
            return 'this is some data';
        }),
        createOrUpdateContentUserData: vi.fn().mockImplementation(() => {
            return;
        }),
        createOrUpdateFinishedData: vi.fn().mockImplementation(() => {
            return;
        }),
        setMockData: (m) => (mockData = m),
        getContentUserDataByContentIdAndUser: vi
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
