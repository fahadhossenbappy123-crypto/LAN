import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 4173,
    proxy: {
      '/api': 'http://localhost:2000',
      '/upload': 'http://localhost:2000',
      '/files': 'http://localhost:2000',
      '/socket.io': {
        target: 'http://localhost:2000',
        ws: true,
      },
    },
  }
});
