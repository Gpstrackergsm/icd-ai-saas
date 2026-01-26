import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/book-bundle.js`,
        chunkFileNames: `assets/book-bundle-[hash].js`,
        assetFileNames: `assets/book-bundle.[ext]`
      }
    }
  }
})
