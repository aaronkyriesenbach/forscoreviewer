import { test, expect } from '@playwright/test';

async function openScore(page: import('@playwright/test').Page) {
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
}

test('zoom in button increases zoom percentage', async ({ page }) => {
  await openScore(page);
  const initial = await page.evaluate(() =>
    document.querySelector('[aria-label="Zoom in"]')?.parentElement?.textContent ?? '',
  );
  expect(initial).toContain('100%');

  await page.click('[aria-label="Zoom in"]');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.find((s) => s.textContent?.includes('%'))?.textContent ?? '';
  });
  expect(after).toContain('125%');
});

test('zoom out button decreases zoom percentage', async ({ page }) => {
  await openScore(page);

  await page.click('[aria-label="Zoom out"]');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.find((s) => s.textContent?.includes('%'))?.textContent ?? '';
  });
  expect(after).toContain('75%');
});

test('zoom in button is disabled at max zoom', async ({ page }) => {
  await openScore(page);

  for (let i = 0; i < 10; i++) {
    const disabled = await page.locator('[aria-label="Zoom in"]').isDisabled();
    if (disabled) break;
    await page.click('[aria-label="Zoom in"]');
    await page.waitForTimeout(200);
  }

  expect(await page.locator('[aria-label="Zoom in"]').isDisabled()).toBe(true);
});

test('zoom out button is disabled at min zoom', async ({ page }) => {
  await openScore(page);

  for (let i = 0; i < 10; i++) {
    const disabled = await page.locator('[aria-label="Zoom out"]').isDisabled();
    if (disabled) break;
    await page.click('[aria-label="Zoom out"]');
    await page.waitForTimeout(200);
  }

  expect(await page.locator('[aria-label="Zoom out"]').isDisabled()).toBe(true);
});

test('keyboard Ctrl+= zooms in', async ({ page }) => {
  await openScore(page);

  await page.keyboard.press('Control+=');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.find((s) => s.textContent?.includes('%'))?.textContent ?? '';
  });
  expect(after).toContain('125%');
});

test('keyboard Ctrl+- zooms out', async ({ page }) => {
  await openScore(page);

  await page.keyboard.press('Control+-');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.find((s) => s.textContent?.includes('%'))?.textContent ?? '';
  });
  expect(after).toContain('75%');
});
