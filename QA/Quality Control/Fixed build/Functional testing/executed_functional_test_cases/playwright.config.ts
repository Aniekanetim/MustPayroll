import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { applicationDirectory, executionDirectory } from './scripts/build';

export default defineConfig({
  testDir: resolve(executionDirectory, 'test/specs'), testMatch: '**/*.spec.ts', fullyParallel: true,
  workers: 1, retries: 0, timeout: 90000,
  outputDir: resolve(executionDirectory, 'data/playwright/artifacts'),
  reporter: [['line'], ['json', { outputFile: resolve(executionDirectory, 'data/playwright/report.json') }]],
  use: { baseURL: 'http://127.0.0.1:4185', trace: 'off', screenshot: 'off', video: 'off' },
  projects: [
    { name: 'ui-functional', testMatch: '**/ui/*.spec.ts', use: { browserName: 'chromium', channel: 'chromium', viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: `node "${resolve(applicationDirectory, 'server/index.mjs')}"`, cwd: executionDirectory,
    url: 'http://127.0.0.1:4185/api/health', reuseExistingServer: false,
    env: { PAYROLL_DB: resolve(executionDirectory, 'data/payroll-playwright.sqlite'), PORT: '4185', HOST: '127.0.0.1' },
    timeout: 60000,
  },
});
