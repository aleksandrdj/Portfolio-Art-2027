import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function syncLogoDataPlugin() {
  return {
    name: 'sync-logo-data',
    buildStart() {
      try {
        const svgPath = path.resolve(__dirname, 'public/logo/Logo_ArtDeejay.svg');
        const scriptPath = path.resolve(__dirname, 'scripts/extractLogo.mjs');
        if (fs.existsSync(svgPath) && fs.existsSync(scriptPath)) {
          import('./scripts/extractLogo.mjs');
        }
      } catch (err) {
        console.warn('Could not sync logo data:', err);
      }
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [syncLogoDataPlugin(), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
