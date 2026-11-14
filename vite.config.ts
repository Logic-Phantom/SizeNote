import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [react()],
  // 앱인토스는 dist 폴더를 그대로 패키징한다 → 상대 경로로 빌드해 어느 경로에서 열려도 에셋을 찾게 한다
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    target: 'es2020',
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
