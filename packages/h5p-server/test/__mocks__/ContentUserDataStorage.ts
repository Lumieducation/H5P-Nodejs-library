export const mockPlaySoundFile = jest.fn();

const mock = jest.fn().mockImplementation(() => {
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
        generateContentUserDataIntegration: jest.fn().mockImplementation(() => {
            return [{ state: 'data' }];
        })
    };
});

export default mock;
