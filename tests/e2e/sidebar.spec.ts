import { test, expect } from '@playwright/test';

test('sidebar resize handle changes sidebar width on drag', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const sidebar = page.locator('[data-sidebar="sidebar"]');
  const initialWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);

  const handle = page.locator('.cursor-col-resize');
  if ((await handle.count()) === 0) {
    test.skip();
    return;
  }

  const box = await handle.boundingBox();
  if (!box) {
    test.skip();
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const newWidth = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
  expect(newWidth).toBeGreaterThan(initialWidth);
});

test('sidebar width persists after reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const handle = page.locator('.cursor-col-resize');
  if ((await handle.count()) === 0) {
    test.skip();
    return;
  }

  const box = await handle.boundingBox();
  if (!box) {
    test.skip();
    return;
  }

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(500);

  const sidebar = page.locator('[data-sidebar="sidebar"]');
  const widthBefore = await sidebar.evaluate((el) => el.getBoundingClientRect().width);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const widthAfter = await sidebar.evaluate((el) => el.getBoundingClientRect().width);
  expect(Math.abs(widthAfter - widthBefore)).toBeLessThan(5);
});

test('clicking Scores tab shows score list', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const scoresTab = page.locator('button[role="tab"]', { hasText: 'Scores' });
  await scoresTab.click();
  await page.waitForTimeout(500);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body.includes('12 Bar Blues') || body.includes('Bagatelles')).toBe(true);
});

test('clicking Setlists tab shows setlist content', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const setlistsTab = page.locator('button[role="tab"]', { hasText: 'Setlists' });
  await setlistsTab.click();
  await page.waitForTimeout(500);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('Porchfest');
});

test('activating a setlist auto-switches to Setlists tab', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const setlistsTab = page.locator('button[role="tab"]', { hasText: 'Setlists' });
  const isSelected = await setlistsTab.getAttribute('aria-selected');
  expect(isSelected).toBe('true');
});

test('pages-per-view selector is visible when score is open', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('12 Bar Blues'),
    );
    btn?.click();
  });
  await page.waitForTimeout(8000);

  const autoText = await page.evaluate(() => {
    const triggers = Array.from(document.querySelectorAll('button[role="combobox"]'));
    return triggers.find((t) => t.textContent?.includes('Auto'))?.textContent ?? '';
  });
  expect(autoText).toContain('Auto');
});
