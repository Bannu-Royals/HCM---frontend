import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: process.env.PORT || 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'https://hcm-backend-uihn.onrender.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}); 