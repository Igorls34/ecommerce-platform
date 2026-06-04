/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: './e2e',
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5500',
    headless: true,
  },
  webServer: [
    {
      command: 'node scripts/serve-frontend.js',
      url: 'http://127.0.0.1:5500/',
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'node scripts/serve-store.js',
      url: 'http://127.0.0.1:5600/',
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
};
