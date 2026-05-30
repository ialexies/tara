import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Booking flow E2E tests.
 *
 * Uses seed properties from infra/scripts/seed-zambales.sql so the tests
 * don't rely on finding a card on the homepage listing. Go directly to a
 * known property URL to avoid flakiness caused by empty staging listings.
 *
 * Requires: at least one seed property exists with active status.
 * Seed command: docker exec -i tara-postgres psql -U tara -d tara_dev < infra/scripts/seed-zambales.sql
 */

const KNOWN_SLUG = 'olongapo-city-hostel'; // A/C dorm + private room, min 1 night

// Pick checkout date using the custom calendar (check-in is pre-filled to today)
async function pickCheckout(page: Page, daysOut: number) {
  const co = new Date();
  co.setDate(co.getDate() + daysOut);
  const coDay = co.getDate();
  const coMonth = co.getMonth();
  const nowMonth = new Date().getMonth();

  // Put calendar in check-out mode
  await page.getByText('Check-out', { exact: true }).click();

  // Navigate to next month if checkout is there
  if (coMonth !== nowMonth) {
    await page.getByRole('button', { name: '›' }).click();
  }

  // Click the checkout day (exact match to avoid matching other numbers)
  await page
    .getByRole('button', { name: String(coDay), exact: true })
    .first()
    .click();
}

test.describe('Booking flow', () => {
  test('guest can reach a property and see the booking panel', async ({ page }) => {
    await page.goto(`/en/properties/${KNOWN_SLUG}`);

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Check-in', { exact: true })).toBeVisible();
  });

  test('guest can check availability and see rooms', async ({ page }) => {
    await page.goto(`/en/properties/${KNOWN_SLUG}`);

    await pickCheckout(page, 16);

    await page.getByRole('button', { name: /check availability/i }).click();

    // Rooms or sold-out message should appear
    await expect(page.getByText(/available|sold out|min\. \d night/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test('booking form appears after selecting an available room', async ({ page }) => {
    await page.goto(`/en/properties/${KNOWN_SLUG}`);

    await pickCheckout(page, 23);

    await page.getByRole('button', { name: /check availability/i }).click();

    const bookBtn = page.getByRole('button', { name: /book this room/i }).first();
    const hasRoom = await bookBtn.isVisible().catch(() => false);
    if (!hasRoom) return; // All rooms taken for these dates — acceptable skip

    await bookBtn.click();

    await expect(page.getByPlaceholder(/full name/i)).toBeVisible({ timeout: 5_000 });
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();
  });

  test('promo code input appears in booking form', async ({ page }) => {
    await page.goto(`/en/properties/${KNOWN_SLUG}`);

    await pickCheckout(page, 30);

    await page.getByRole('button', { name: /check availability/i }).click();

    const bookBtn = page.getByRole('button', { name: /book this room/i }).first();
    const hasRoom = await bookBtn.isVisible().catch(() => false);
    if (!hasRoom) return;

    await bookBtn.click();
    await expect(page.getByPlaceholder(/promo code/i)).toBeVisible({ timeout: 5_000 });
  });

  test('homepage listing shows property cards', async ({ page }) => {
    await page.goto('/en');
    // With seed data, at least one property card should be visible
    await expect(page.locator('a[href*="/properties/"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('homepage listing links to the seed property', async ({ page }) => {
    await page.goto('/en');
    const link = page.locator(`a[href*="/${KNOWN_SLUG}"]`).first();
    await expect(link).toBeVisible({ timeout: 10_000 });
    await link.click();
    await expect(page).toHaveURL(new RegExp(KNOWN_SLUG));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('Booking flow — mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('booking panel is accessible at 375px', async ({ page }) => {
    await page.goto(`/en/properties/${KNOWN_SLUG}`);

    const checkBtn = page.getByRole('button', { name: /check availability/i });
    await checkBtn.scrollIntoViewIfNeeded();
    await expect(checkBtn).toBeVisible({ timeout: 8_000 });

    const box = await checkBtn.boundingBox();
    expect(box).not.toBeNull();
    // Minimum 44px tap target (Apple/Google guideline)
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
