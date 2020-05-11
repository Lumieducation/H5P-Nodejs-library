const base = require('./jest.config');

module.exports = {
    ...base,

    // The glob patterns Jest uses to detect test files
    testMatch: ['**/test/**/*.test.ts'],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/test/data',
        '/test/e2e',
        '/db/'
    ]
};
