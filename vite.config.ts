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
        minify: 'terser', // Keep minification, but adjust terserOptions
        terserOptions: {
          compress: {
            // drop_console: true, // Temporarily comment this out or set to false for debugging
            drop_debugger: true   // You can keep this
          }
        }
        // Or, to be absolutely sure console logs are not dropped by any compression:
        // If the above still drops logs, you could temporarily set minify: false
        // minify: false, // Uncomment this for max debuggability if needed, but it makes files larger
      }
    })
    