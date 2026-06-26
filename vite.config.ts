import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    fs: {
      // Allow serving files from the workspace root (e.g. pkg folder or similar)
      allow: ['.']
    }
  },
  resolve: {
    // Bun의 내장 모듈 해석 방식과 Vite의 해석 방식을 더 잘 맞추는 설정
    conditions: ['bun', 'import', 'module'],
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    // 압축을 Bun 환경에 맞춰 더 빠르게 수행
    minify: 'esbuild',
  }
});
