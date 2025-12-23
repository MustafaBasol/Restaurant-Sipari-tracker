import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'copy-locales-to-dist',
        closeBundle() {
          try {
            const src = path.resolve(__dirname, 'locales');
            const dest = path.resolve(__dirname, 'dist', 'locales');
            if (fs.existsSync(src)) {
              fs.mkdirSync(dest, { recursive: true });
              fs.cpSync(src, dest, { recursive: true });
            }
          } catch {
            // best-effort
          }
        },
      },
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
