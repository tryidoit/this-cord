import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// Dev: run `npm run server` (API on :3000) and `npm run dev` (Vite on :5173, proxies /api).
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  build: {
    rollupOptions: {
      output: {
        // Stable vendor chunks: cached across deploys and fetched in parallel.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return 'vendor-react';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('framer-motion') || id.includes('motion-dom')) return 'vendor-motion';
          if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
          if (id.includes('leaflet')) return 'vendor-map';
        },
      },
    },
  },
  server: { proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: false } } },
});
