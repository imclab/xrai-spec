// xrai-website — laser-focused browser visual tests
// Boots a static http server, runs Chromium-only smoke tests against
// conf.html, jarvis.html, index.html. Output JSON for CI gate.
const { defineConfig, devices } = require('@playwright/test');

const PORT = process.env.XRAI_TEST_PORT || 8765;

module.exports = defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.{js,cjs,mjs}',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'results/last.json' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `python3 -m http.server ${PORT}`,
    cwd: '..',
    port: Number(PORT),
    reuseExistingServer: true,
    timeout: 10_000,
  },
});
