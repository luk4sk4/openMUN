import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('docx') || id.includes('jspdf') || id.includes('mammoth') || id.includes('pdfjs-dist')) {
              return 'vendor-doc-engine';
            }
            if (id.includes('xlsx')) {
              return 'vendor-excel-engine';
            }
            if (id.includes('qrcode.react')) {
              return 'vendor-qrcode';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            if (id.includes('socket.io-client') || id.includes('engine.io-client')) {
              return 'vendor-socket';
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react-core';
            }
          }
        }
      }
    }
  }
})

