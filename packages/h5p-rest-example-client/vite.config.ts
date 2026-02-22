import { fileURLToPath } from 'url';
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            react: path.resolve(__dirname, 'node_modules/react'),
            'react-dom': path.resolve(__dirname, 'node_modules/react-dom')
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
