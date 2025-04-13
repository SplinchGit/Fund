import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Use path.resolve for robustness
      '@': path.resolve(__dirname, './src'),
    }
  },
  // Explicitly tell Vite where the entry HTML is
    build: {
      rollupOptions: {
        // Try the simplest relative path from project root
        input: 'index.html' 
      }
    }
  });