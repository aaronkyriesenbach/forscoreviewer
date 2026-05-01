import { test, expect } from '@playwright/test';

test('dark mode toggle adds dark class to html element', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const initialDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );

  const toggleLabel = initialDark ? 'Switch to light mode' : 'Switch to dark mode';
  await page.click(`[aria-label="${toggleLabel}"]`);
  await page.waitForTimeout(500);

  const afterToggle = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  expect(afterToggle).toBe(!initialDark);
});

test('theme persists after page reload', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  const initialDark = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  const toggleLabel = initialDark ? 'Switch to light mode' : 'Switch to dark mode';
  await page.click(`[aria-label="${toggleLabel}"]`);
  await page.waitForTimeout(500);

  const expectedDark = !initialDark;

  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const afterReload = await page.evaluate(() =>
    document.documentElement.classList.contains('dark'),
  );
  expect(afterReload).toBe(expectedDark);
});
