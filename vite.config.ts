import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    // 1) Dedupe React imports to avoid duplicate instances
    dedupe: ['react', 'react-dom'],
    // 2) Alias React to the root node_modules so all imports point to the same copy
    alias: {
      '@': path.resolve(__dirname, './src'),
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
  },
  optimizeDeps: {
    // 3) Pre-bundle ID Kit and react-shadow by package name only (avoid deep imports)
    include: [
      '@worldcoin/idkit',
      'react-shadow'
    ],
  },
  build: {
    outDir: 'build',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // More aggressive chunk splitting
          if (id.includes('node_modules')) {
            if (id.includes('@worldcoin')) return 'worldcoin';
            if (id.includes('react')) return 'react';
            if (id.includes('aws-amplify')) return 'aws-amplify';
            return 'vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      // 4) Ensure CommonJS modules in ID Kit are transformed so alias/dedupe applies
      include: [/node_modules/, /@worldcoin\/idkit/],
    },
  },
  // Ensure base path is set correctly
  base: '/'
});
