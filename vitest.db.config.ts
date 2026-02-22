import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: Number(process.env.TEST_TIMEOUT) || 45000,
        clearMocks: true,
        include: ['packages/h5p-mongos3/test/**/*.test.ts'],
        exclude: ['**/node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            reportsDirectory: './coverage'
        }
    }
});
