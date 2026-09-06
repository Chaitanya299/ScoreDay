import { defineConfig } from '@playwright/test'

// E2E only: unit tests live in *.test.ts and run under vitest.
export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
  },
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
})
