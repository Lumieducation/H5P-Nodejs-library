const base = require('./jest.config');

module.exports = {
    ...base,

    // The glob patterns Jest uses to detect test files
    testMatch: ['**/test/e2e/**/*.test.ts'],
    testPathIgnorePatterns: []
};
