import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // server-only는 테스트 환경에서 no-op으로 대체한다.
      'server-only': resolve(__dirname, './__mocks__/server-only.js'),
    },
  },
})