import { defineConfig, devices } from '@playwright/test';

const PORT = 4300;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    // Service workers need a real (non-incognito-only) context; Playwright supports this by default.
    serviceWorkers: 'allow',
    launchOptions: process.env['PW_CHROMIUM_PATH']
      ? { executablePath: process.env['PW_CHROMIUM_PATH'] }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Production build served statically, like a real deployment (SW + Cache Storage active).
  webServer: {
    command: `npm run build && npx http-server dist/uidai-credential-wallet-pwa/browser -p ${PORT} -c-1 -s`,
    url: `http://localhost:${PORT}/`,
    timeout: 120_000,
    reuseExistingServer: !process.env['CI'],
  },
});
