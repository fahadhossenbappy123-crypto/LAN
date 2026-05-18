import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    hmr: {
      host: '0.0.0.0'
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:2000',
        changeOrigin: true
      },
      '/upload': {
        target: 'http://127.0.0.1:2000',
        changeOrigin: true
      },
      '/files': {
        target: 'http://127.0.0.1:2000',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://127.0.0.1:2000',
        changeOrigin: true,
        ws: true
      }
    }
  }
});
