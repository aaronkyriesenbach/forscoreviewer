import { test, expect } from '@playwright/test';

test('deep-link to library shows that library selected', async ({ page }) => {
  await page.goto('/e2e-library');
  await page.waitForLoadState('networkidle');
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('e2e-library');
});

test('deep-link to score loads the PDF', async ({ page }) => {
  await page.goto('/e2e-library/12%20Bar%20Blues.pdf');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);
  const canvases = await page.locator('canvas').count();
  expect(canvases).toBeGreaterThanOrEqual(1);
});

test('deep-link to score with page preserves page in URL', async ({ page }) => {
  await page.goto('/e2e-library/11%20Bagatelles%2C%20Op.119.pdf/2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(8000);
  const canvases = await page.locator('canvas').count();
  expect(canvases).toBeGreaterThanOrEqual(1);
  expect(page.url()).toContain('/2');
});

test('deep-link to setlist opens setlist view', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('Jack Straw');
  expect(page.url()).toContain('setlist');
});

test('deep-link to setlist with index opens correct item', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest/2');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('Bird Song');
});

test('URL updates when selecting a score from sidebar', async ({ page }) => {
  await page.goto('/e2e-library');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('12 Bar Blues'),
    );
    btn?.click();
  });
  await page.waitForTimeout(2000);
  expect(page.url()).toContain('12%20Bar%20Blues');
});
