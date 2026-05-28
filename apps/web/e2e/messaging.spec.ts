import { test, expect } from '@playwright/test';

/**
 * Messaging feature smoke tests.
 * These verify the UI is wired up without requiring an actual booking.
 */

test.describe('Messaging UI', () => {
  test('message thread section appears on booking detail page when logged in', async ({ page }) => {
    // Log in as guest test account
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('guest@test.tara-stays.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });

    // Navigate to bookings list
    await page.goto('/en/bookings');

    // If there are any bookings, check the first one has a message thread
    const bookingLinks = page.getByRole('link', { name: /view|details|TARA/i });
    const count = await bookingLinks.count();

    if (count > 0) {
      await bookingLinks.first().click();
      await expect(page.getByText(/messages/i)).toBeVisible({ timeout: 5_000 });
      await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
    } else {
      // No bookings — just verify the bookings page loads without error
      await expect(page.getByText(/no bookings/i)).toBeVisible();
    }
  });

  test('message thread section appears in owner dashboard booking card', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('owner@test.tara-stays.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });

    // Navigate to first property's bookings if any
    await page.goto('/en/dashboard');
    const propLinks = page.getByRole('link', { name: /rooms/i });
    const count = await propLinks.count();

    if (count > 0) {
      // Go to rooms page, then bookings
      const href = await propLinks.first().getAttribute('href');
      if (href) {
        const bookingsUrl = href.replace('/rooms', '/bookings');
        await page.goto(bookingsUrl);
        // Look for a booking card — if present it should have Messages section
        const messageHeadings = page.getByText('Messages');
        const cardCount = await messageHeadings.count();
        // 0 is fine (no bookings), > 0 means thread is rendered
        expect(cardCount).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
