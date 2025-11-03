import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    environment: 'jsdom',
    globals: true,
    // 테스트 전 초기화 스크립트 (msw server 등)
    setupFiles: 'src/setupTests.ts',
    // 리포터를 추가: 기본 출력과 JSON(머신 파싱용)
    reporters: ['default', 'json'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
});
