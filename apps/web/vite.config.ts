import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const envDir = resolve(import.meta.dirname, '../..');

export default defineConfig(({ mode }) => {
  const loaded = loadEnv(mode, envDir, '');
  const apiHttpTarget = process.env.API_HTTP ?? loaded.API_HTTP;

  return {
    plugins: [react()],
    envDir,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
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
