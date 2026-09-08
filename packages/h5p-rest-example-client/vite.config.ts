import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

// The REST example server's port defaults to 8080, but can be overridden
// with H5P_REST_SERVER_PORT - the h5p-e2e package's Playwright config does
// this to run it on 8081 instead, since 8080 is already used by
// packages/h5p-examples and both servers need to be up at the same time
// during the `rest-example` E2E project's run.
const h5pServerPort = process.env.H5P_REST_SERVER_PORT ?? '8080';
const h5pServerTarget = `http://127.0.0.1:${h5pServerPort}`;

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            react: path.dirname(require.resolve('react/package.json')),
            'react-dom': path.dirname(require.resolve('react-dom/package.json'))
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/h5p': {
                target: h5pServerTarget,
                changeOrigin: true
            },
            '/login': {
                target: h5pServerTarget,
                changeOrigin: true
            },
            '/logout': {
                target: h5pServerTarget,
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'build'
    }
});
