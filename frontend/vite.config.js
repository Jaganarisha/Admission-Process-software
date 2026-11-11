
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  // Root path for the Render single-domain deployment.
  base: '/',

  server: {
    host: true,
    port: 5173,

    // Local backend proxy.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
