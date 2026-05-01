import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src/client',
  plugins: [react()],
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, 'src')}/`,
      'pdfjs-dist': path.resolve(__dirname, 'node_modules/react-pdf/node_modules/pdfjs-dist'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/data': 'http://localhost:3000',
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
  },
});
