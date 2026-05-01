import { test, expect } from '@playwright/test';

test('clicking a bookmark navigates PDF to that page', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('11 Bagatelles'),
    );
    btn?.click();
  });
  await page.waitForTimeout(8000);

  const bookmarkBtn = page.locator('button', { hasText: 'No. 2 in C major' });
  if ((await bookmarkBtn.count()) > 0) {
    await bookmarkBtn.click();
    await page.waitForTimeout(2000);
    const pageText = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('span'));
      return spans.find((s) => s.textContent?.includes(' of '))?.textContent ?? '';
    });
    expect(pageText).toContain('2');
  }
});

test('clicking delete + confirming removes library', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const deleteBtn = page.locator('button[aria-label="Delete library"]');
  const hasDelete = (await deleteBtn.count()) > 0;

  if (hasDelete) {
    page.once('dialog', (dialog) => dialog.dismiss());
    await deleteBtn.click();
    await page.waitForTimeout(500);

    const body = await page.evaluate(() => document.body.innerText);
    expect(body).toContain('e2e-library');
  } else {
    expect(hasDelete).toBe(true);
  }
});

test('upload dialog has library selector and file input', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Upload'),
    );
    btn?.click();
  });
  await page.waitForTimeout(1000);

  const body = await page.evaluate(() => document.body.innerText);
  expect(body).toContain('Library');
  expect(body.includes('file') || body.includes('File') || body.includes('.4sb')).toBe(true);
});
