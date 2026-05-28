import { test, expect } from '@playwright/test';

test.describe('Save search alert', () => {
  test('Save alert button appears when filters are active', async ({ page }) => {
    await page.goto('/en');

    // Activate a filter to make "Save alert" appear
    const wifiBtn = page.getByRole('button', { name: 'WiFi' });
    await wifiBtn.click();

    await expect(page.getByRole('button', { name: /save alert/i })).toBeVisible({ timeout: 3_000 });
  });

  test('Save alert button not visible without filters', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('button', { name: /save alert/i })).not.toBeVisible();
  });

  test('clicking Save alert opens email input modal', async ({ page }) => {
    await page.goto('/en');
    const wifiBtn = page.getByRole('button', { name: 'WiFi' });
    await wifiBtn.click();

    await page.getByRole('button', { name: /save alert/i }).click();
    await expect(page.getByPlaceholder(/your@email.com/i)).toBeVisible();
    await expect(page.getByRole('heading', { name: /save search alert/i })).toBeVisible();
  });

  test('Cancel closes the save alert modal', async ({ page }) => {
    await page.goto('/en');
    await page.getByRole('button', { name: 'WiFi' }).click();
    await page.getByRole('button', { name: /save alert/i }).click();

    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByPlaceholder(/your@email.com/i)).not.toBeVisible();
  });
});
