// conf.html — holographic conferencing smoke tests
// Verifies Three.js scene mounts, LiveKit panel renders, jarvis lazy-loads.
import { test, expect } from '@playwright/test';

test.describe('conf.html', () => {
  test('mounts Three.js stage + control panel', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

    await page.goto('/conf.html');

    // Top bar pills
    await expect(page.locator('#roomPill')).toContainText('room:');
    await expect(page.locator('#peerPill')).toContainText('peers: 0');
    await expect(page.locator('#connText')).toHaveText(/offline/i);

    // Control panel buttons present + correct disabled state pre-join
    await expect(page.locator('#join')).toBeEnabled();
    await expect(page.locator('#publish')).toBeDisabled();
    await expect(page.locator('#leave')).toBeDisabled();
    await expect(page.locator('#hologramBtn')).toBeDisabled();
    await expect(page.locator('#jarvisToggle')).toBeEnabled();

    // Three.js renderer canvas mounted in #stage
    await expect(page.locator('#stage canvas')).toBeAttached();

    // Scene exposed via window.__conf for assertions
    const sceneInfo = await page.evaluate(() => {
      const c = window.__conf; if (!c) return null;
      return { hasScene: !!c.scene, hasCamera: !!c.camera, seatCount: c.seats.size, hologramMode: c.hologramMode };
    });
    expect(sceneInfo).not.toBeNull();
    expect(sceneInfo.hasScene).toBe(true);
    expect(sceneInfo.hasCamera).toBe(true);
    expect(sceneInfo.seatCount).toBe(0);
    expect(sceneInfo.hologramMode).toBe(false);

    // No JS errors on page load
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('?room= param round-trips into URL + pill', async ({ page }) => {
    await page.goto('/conf.html?room=test-abc');
    await expect(page.locator('#roomPill')).toHaveText(/test-abc/);
    await expect(page).toHaveURL(/room=test-abc/);
  });

  test('paint / screen / mute-all buttons exist + start disabled pre-join', async ({ page }) => {
    await page.goto('/conf.html');
    await expect(page.locator('#paintBtn')).toBeDisabled();
    await expect(page.locator('#screenBtn')).toBeDisabled();
    await expect(page.locator('#muteAllBtn')).toBeDisabled();
  });

  test('xrai:delta CustomEvent applies + would-broadcast (drag/voice contract)', async ({ page }) => {
    await page.goto('/conf.html?doc=examples/14-shared-hologram-conf.xrai.json');
    await page.waitForFunction(() => (window.__conf?.xraiLayer?.children?.length ?? 0) > 0, null, { timeout: 4000 });
    const result = await page.evaluate(() => {
      const c = window.__conf;
      const first = c.xraiLayer.children.find(n => n.userData?.id);
      const id = first.userData.id;
      document.dispatchEvent(new CustomEvent('xrai:delta', { detail: { op: 'move', id, pos: [42, 0.5, 0] } }));
      return { x: first.position.x, y: first.position.y };
    });
    expect(result.x).toBe(42);
    expect(result.y).toBe(0.5);
  });

  test('applyDelta move/remove/add mutates xraiLayer (T1468 contract)', async ({ page }) => {
    await page.goto('/conf.html?doc=examples/14-shared-hologram-conf.xrai.json');
    await page.waitForFunction(() => (window.__conf?.xraiLayer?.children?.length ?? 0) > 0, null, { timeout: 4000 });
    const result = await page.evaluate(() => {
      const c = window.__conf;
      const first = c.xraiLayer.children.find(n => n.userData?.id);
      if (!first) return { error: 'no node with id' };
      const id = first.userData.id; const before = first.position.x;
      // move
      c.applyDelta({ op: 'move', id, pos: [99, 1, 0] });
      const moved = first.position.x;
      // add
      const beforeAdd = c.xraiLayer.children.length;
      c.applyDelta({ op: 'add', id: 'test_added', entity: { id: 'test_added', transform: { position: [0, 2, 0] } } });
      const afterAdd = c.xraiLayer.children.length;
      // remove
      c.applyDelta({ op: 'remove', id: 'test_added' });
      const afterRemove = c.xraiLayer.children.length;
      return { before, moved, beforeAdd, afterAdd, afterRemove };
    });
    expect(result.before).not.toBe(99);
    expect(result.moved).toBe(99);
    expect(result.afterAdd).toBe(result.beforeAdd + 1);
    expect(result.afterRemove).toBe(result.beforeAdd);
  });

  test('?doc= auto-loads XRAI scene into xraiLayer', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('/conf.html?doc=examples/14-shared-hologram-conf.xrai.json');
    // Wait for fetch + render to complete
    await page.waitForFunction(() => (window.__conf?.xraiLayer?.children?.length ?? 0) > 0, null, { timeout: 4000 });
    const layerCount = await page.evaluate(() => window.__conf.xraiLayer.children.length);
    expect(layerCount).toBeGreaterThan(0);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });

  test('jarvis toggle is wired (button click does not error)', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto('/conf.html');
    await page.locator('#jarvisToggle').click();
    // jarvis-web.js loads but mic permission is denied in headless → toast or stay off
    await page.waitForTimeout(400);
    // Anything that throws synchronously would have shown up by now
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
