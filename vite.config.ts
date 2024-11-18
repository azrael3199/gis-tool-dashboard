import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cesium from 'vite-plugin-cesium';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cesium()],
  server: {
    // proxy: {
    //   '/upload': 'http://localhost:5000',
    //   '/files': 'http://localhost:5000',
    //   '/tileset': 'http://localhost:5000',
    // },
    port: 3000,
  },
});
