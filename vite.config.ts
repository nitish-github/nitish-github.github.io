import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (id.includes('@lexical') || id.includes('lexical')) {
            return 'lexical-vendor'
          }

          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'tiptap-vendor'
          }

          if (id.includes('firebase/auth')) {
            return 'firebase-auth-vendor'
          }

          if (id.includes('firebase/firestore')) {
            return 'firebase-firestore-vendor'
          }

          if (id.includes('firebase/app')) {
            return 'firebase-app-vendor'
          }

          if (id.includes('firebase')) {
            return 'firebase-vendor'
          }

          if (id.includes('@mui')) {
            return 'mui-vendor'
          }

          return 'vendor'
        },
      },
    },
  },
})
