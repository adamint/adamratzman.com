import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const nextCompatDirectory = resolve(import.meta.dirname, 'src/compat/next');
const apiHttpTarget = process.env.API_HTTP;

export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: [
      { find: /^next$/, replacement: resolve(nextCompatDirectory, 'index.ts') },
      { find: /^next\/app$/, replacement: resolve(nextCompatDirectory, 'app.ts') },
      { find: /^next\/document$/, replacement: resolve(nextCompatDirectory, 'document.tsx') },
      { find: /^next\/dynamic$/, replacement: resolve(nextCompatDirectory, 'dynamic.tsx') },
      { find: /^next\/head$/, replacement: resolve(nextCompatDirectory, 'head.tsx') },
      { find: /^next\/link$/, replacement: resolve(nextCompatDirectory, 'link.tsx') },
      { find: /^next\/router$/, replacement: resolve(nextCompatDirectory, 'router.ts') }
    ]
  },
  server: apiHttpTarget ? {
    proxy: {
      '/api': {
        target: apiHttpTarget,
        changeOrigin: true,
        secure: false
      }
    }
  } : undefined,
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    css: true
  }
});
