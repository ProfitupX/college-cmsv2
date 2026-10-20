import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
  }
})

