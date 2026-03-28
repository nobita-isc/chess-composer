import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/**/tests/**/*.test.js'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      include: ['packages/server/src/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**', '**/dist/**'],
      reporter: ['text', 'text-summary']
    }
  }
})
