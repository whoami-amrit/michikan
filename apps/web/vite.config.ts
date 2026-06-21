import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), svgr(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy:
      mode === 'development'
        ? {
            '^/api/v1/.*': {
              target: `http://localhost:${process.env.API_PORT ?? 5252}`,
              changeOrigin: true,
            },
          }
        : undefined,
  },
}));
