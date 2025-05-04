import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-shadow'],
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    sourcemap: true,
    // Split vendor chunks
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'worldcoin': ['@worldcoin/minikit-js', '@worldcoin/idkit-core'],
          'aws': ['@aws-sdk/client-lambda'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-slot'],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    },
    // Increase chunk size warning limit slightly
    chunkSizeWarningLimit: 600,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})