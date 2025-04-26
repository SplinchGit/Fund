import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build', 
    rollupOptions: {
      output: {
        manualChunks(id) {
          // More aggressive chunk splitting
          if (id.includes('node_modules')) {
            // Split large libraries into separate chunks
            if (id.includes('@worldcoin')) return 'worldcoin';
            if (id.includes('react')) return 'react';
            if (id.includes('aws-amplify')) return 'aws-amplify';
            return 'vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  }
});