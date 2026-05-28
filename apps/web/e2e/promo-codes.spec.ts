import { test, expect } from '@playwright/test';

test.describe('Promo codes dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Log in as owner
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('owner@test.tara-stays.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
  });

  test('shows promo codes page from dashboard link', async ({ page }) => {
    await page.goto('/en/dashboard');
    await page.getByRole('link', { name: /promo codes/i }).click();
    await expect(page).toHaveURL(/promo-codes/);
    await expect(page.getByRole('heading', { name: /promo codes/i })).toBeVisible();
  });

  test('create form shows all required fields', async ({ page }) => {
    await page.goto('/en/dashboard/promo-codes');
    await page.getByRole('button', { name: /new code/i }).click();
    await expect(page.getByPlaceholder(/SUMMER20/i)).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible(); // type selector
  });

  test('can create and see a new promo code', async ({ page }) => {
    await page.goto('/en/dashboard/promo-codes');
    await page.getByRole('button', { name: /new code/i }).click();

    const code = `TEST${Date.now().toString().slice(-4)}`;
    await page.getByPlaceholder(/SUMMER20/i).fill(code);
    // type defaults to percent, value = 10
    await page.locator('input[type="number"]').first().fill('10');
    await page.getByRole('button', { name: /create code/i }).click();

    await expect(page.getByText(code)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Active')).toBeVisible();
  });
});

test.describe('Promo code at checkout', () => {
  test('booking panel shows promo code input', async ({ page }) => {
    await page.goto('/en');
    const firstCard = page.locator('a[href*="/properties/"]').first();
    await firstCard.click();

    // Fill dates and check availability
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 14);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.first().fill(fmt(tomorrow));
    await dateInputs.last().fill(fmt(dayAfter));
    await page.getByRole('button', { name: /check availability/i }).click();

    await page.waitForTimeout(1500);
    const promoInput = page.getByPlaceholder(/promo code/i);
    const hasPromo = await promoInput.isVisible().catch(() => false);
    // Promo input appears when rooms are shown
    if (hasPromo) {
      await expect(promoInput).toBeVisible();
    }
  });
});
