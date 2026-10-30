import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const buildTime = Date.now();

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'generate-version-json',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ buildTime, version: '2.0.' + buildTime })
        });
      }
    }
  ],
  define: {
    __APP_BUILD_TIME__: buildTime
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-reports': ['jspdf', 'jspdf-autotable', 'xlsx', 'exceljs'],
          'vendor-charts': ['recharts'],
          'vendor-ui': ['lucide-react', 'framer-motion']
        }
      }
    }
  }
});
