import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    // Treat PNG/JPEG/SVG/WebP imports as simple URL strings (returns the
    // file path) so tests that indirectly import asset modules do not fail.
    assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg', '**/*.webp'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Matches the @assets alias in vite.config.ts so tests that
      // transitively import from affinityMeta.ts can resolve image paths.
      '@assets': path.resolve(__dirname, '../../attached_assets'),
    },
  },
});
