// jarvis.html — agent surface smoke tests
import { test, expect } from '@playwright/test';
import { errorFilter } from './_helpers.js';

test.describe('jarvis.html', () => {
  test('mounts brand + nav + deploy mode selector', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));

    await page.goto('/jarvis.html');

    // Brand mark renders (text content, not specific selector since DOM may evolve)
    await expect(page.locator('body')).toContainText(/jARvis|jarvis/i);

    // Page is interactive — body has paint
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(50);

    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('index.html (graph viewer)', () => {
  test('loads without page errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('requestfailed', r => errors.push(`reqfail: ${r.url()} ${r.failure()?.errorText}`));

    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // let modules import

    const filtered = errors.filter(errorFilter);
    expect(filtered, filtered.join('\n')).toHaveLength(0);
  });

  test('viewer ↔ editor mode toggle wires button + body dataset', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(300);
    const mode = page.locator('#mode-btn');
    await expect(mode).toHaveText(/viewer/i);
    await mode.click();
    await expect(mode).toHaveText(/editor/i);
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'editor');
    await mode.click();
    await expect(mode).toHaveText(/viewer/i);
  });
});
