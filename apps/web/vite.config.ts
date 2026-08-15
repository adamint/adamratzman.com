import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const nextCompatDirectory = resolve(import.meta.dirname, 'src/compat/next');
const envDir = resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, envDir, '');
  const apiHttpTarget = process.env.API_HTTP ?? loaded.API_HTTP;

  return {
    plugins: [react()],
    envDir,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    resolve: {
      alias: [
        { find: /^next\/dynamic$/, replacement: resolve(nextCompatDirectory, 'dynamic.tsx') },
        { find: /^next\/head$/, replacement: resolve(nextCompatDirectory, 'head.tsx') },
        { find: /^next\/link$/, replacement: resolve(nextCompatDirectory, 'link.tsx') },
        { find: /^next\/router$/, replacement: resolve(nextCompatDirectory, 'router.ts') },
      ],
    },
    server: apiHttpTarget ? {
      proxy: {
        '/api': {
          target: apiHttpTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    } : undefined,
    test: {
      environment: 'jsdom',
      setupFiles: './test/setup.ts',
      css: true,
    },
  };
});
