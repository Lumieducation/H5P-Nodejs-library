const base = require('./jest.config');

module.exports = {
    ...base,

    // The glob patterns Jest uses to detect test files
    roots: ['<rootDir>/packages/h5p-mongo-gridfs/test'],
    testPathIgnorePatterns: []
};
