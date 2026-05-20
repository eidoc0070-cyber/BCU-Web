import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    fs: {
      // Allow serving files from the workspace root (e.g. pkg folder or similar)
      allow: ['.']
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist'
  }
});
