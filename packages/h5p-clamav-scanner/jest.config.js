const base = require('../../jest.config');

module.exports = {
    ...base,

    // The glob patterns Jest uses to detect test files
    roots: ['<rootDir>/test'],
    testPathIgnorePatterns: []
};
