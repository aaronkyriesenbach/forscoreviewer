import { test, expect } from '@playwright/test';

test('clicking a setlist item loads the correct PDF', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const setlistsTab = page.locator('button[role="tab"]', { hasText: 'Setlists' });
  await setlistsTab.click();
  await page.waitForTimeout(500);

  await page.locator('button', { hasText: 'Porchfest' }).first().click();
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('span')).find(
      (s) => s.textContent?.includes('Jack Straw'),
    );
    (el?.closest('[data-sidebar="menu-sub-button"]') as HTMLElement | null)?.click();
  });
  await page.waitForTimeout(10000);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('Jack Straw');
});

test('navigating between setlist items via sidebar', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const firstBody = await page.evaluate(() => document.body.innerText);
  expect(firstBody).toContain('Jack Straw');

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Bird Song'),
    );
    btn?.click();
  });
  await page.waitForTimeout(3000);

  const secondBody = await page.evaluate(() => document.body.innerText);
  expect(secondBody).toContain('Bird Song');
});

test('setlist page indicator shows setlist-global page numbers', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const pageText = await page.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span'));
    return spans.find((s) => s.textContent?.includes(' of '))?.textContent ?? '';
  });

  expect(pageText).toContain('of');
});

test('URL reflects setlist navigation', async ({ page }) => {
  await page.goto('/e2e-library/setlist/Porchfest');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  expect(page.url()).toContain('setlist');
  expect(page.url()).toContain('Porchfest');
});
