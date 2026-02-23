import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        testTimeout: Number(process.env.TEST_TIMEOUT) || 45000,
        clearMocks: true,
        include: [
            'packages/h5p-server/test/**/*.test.ts',
            'packages/h5p-express/test/**/*.test.ts',
            'packages/h5p-shared-state-server/test/**/*.test.ts',
            'packages/h5p-svg-sanitizer/test/**/*.test.ts'
        ],
        exclude: [
            '**/node_modules/**',
            '**/h5p-mongos3/**',
            '**/h5p-html-exporter/**',
            '**/h5p-examples/**',
            '**/integration/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['lcov', 'text'],
            reportsDirectory: './coverage'
        }
    }
});
