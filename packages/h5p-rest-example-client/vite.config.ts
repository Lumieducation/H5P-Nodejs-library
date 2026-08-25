import { createRequire } from 'module';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            react: path.dirname(require.resolve('react/package.json')),
            'react-dom': path.dirname(
                require.resolve('react-dom/package.json')
            )
        }
    },
    server: {
        port: 3000,
        proxy: {
            '/h5p': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true
            },
            '/login': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true
            },
            '/logout': {
                target: 'http://127.0.0.1:8080',
                changeOrigin: true
            }
        }
    },
    build: {
        outDir: 'build'
    }
});
