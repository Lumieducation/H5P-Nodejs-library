import { defineConfig } from 'vitest/config';

export default defineConfig({
    root: import.meta.dirname,
    test: {
        globals: true,
        environment: 'node',
        testTimeout: Number(process.env.TEST_TIMEOUT) || 45000,
        clearMocks: true,
        include: ['test/**/*.test.ts'],
        exclude: ['**/node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            reportsDirectory: './coverage'
        }
    }
});
