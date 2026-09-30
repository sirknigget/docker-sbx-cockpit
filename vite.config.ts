import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  root: 'web',
  build: { outDir: '../dist/web', emptyOutDir: true },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9876',
        changeOrigin: true,
        headers: { Origin: 'http://127.0.0.1:9876' },
      },
    },
  },
});
