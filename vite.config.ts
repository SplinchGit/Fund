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
  // Enhanced development server configuration
  server: {
    cors: true,
    host: true, // Allow access from any host (useful for mobile testing)
    port: 5173,
    // Proxy API requests during development if needed
    proxy: {
      // Uncomment and configure if you need to proxy API requests
      // '/api': {
      //   target: 'https://whkpvhuw7j.execute-api.eu-west-2.amazonaws.com',
      //   changeOrigin: true,
      //   secure: true,
      //   rewrite: (path) => path.replace(/^\/api/, '/prod')
      // }
    },
    // Handle fallback for SPA routing
    fs: {
      strict: false
    }
  },
  // Environment variable handling
  define: {
    // Ensure environment variables are available at build time
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'worldcoin': ['@worldcoin/minikit-js', '@worldcoin/idkit-core'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-slot'],
          'utils': ['clsx', 'tailwind-merge', 'class-variance-authority']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    minify: 'terser',
    terserOptions: {
      compress: {
        // Keep console logs for debugging in development
        drop_console: false,
        drop_debugger: true
      }
    }
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
})