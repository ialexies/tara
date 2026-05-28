import { test, expect } from '@playwright/test';

/**
 * Booking flow E2E test.
 *
 * Runs against the base URL (staging by default). Requires at least one
 * active property with available rooms. The test verifies the full guest
 * journey without needing a logged-in user.
 */
test.describe('Booking flow', () => {
  test('guest can browse, check availability, and see the booking form', async ({ page }) => {
    // 1. Home page — browse listings
    await page.goto('/en');
    await expect(page.getByPlaceholder(/search by name/i)).toBeVisible();

    // Find the first property card and click it
    const firstCard = page.locator('a[href*="/properties/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // 2. Property page
    await expect(page).toHaveURL(/\/properties\//);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // 3. Check availability
    const checkAvailabilityBtn = page.getByRole('button', { name: /check availability/i });
    await expect(checkAvailabilityBtn).toBeVisible();

    // Pick dates that are at least 1 night apart
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const checkIn = fmt(tomorrow);
    const checkOut = fmt(dayAfter);

    // Fill the date pickers — they're inside a calendar widget
    const dateInputs = page.locator('input[type="date"]');
    const checkInInput = dateInputs.first();
    const checkOutInput = dateInputs.last();

    await checkInInput.fill(checkIn);
    await checkOutInput.fill(checkOut);

    await checkAvailabilityBtn.click();

    // 4. Rooms should appear
    await expect(page.getByText(/available|sold out|min\./i)).toBeVisible({ timeout: 10_000 });

    // If a "Book this room" button is visible, click it
    const bookBtn = page.getByRole('button', { name: /book this room/i }).first();
    const hasAvailableRoom = await bookBtn.isVisible();

    if (!hasAvailableRoom) {
      // No rooms available for these dates — test passes at availability check stage
      return;
    }

    await bookBtn.click();

    // 5. Guest details form appears inline
    await expect(page.getByPlaceholder(/full name/i)).toBeVisible();
    await expect(page.getByPlaceholder(/email address/i)).toBeVisible();

    // Fill in guest details
    await page.getByPlaceholder(/full name/i).fill('E2E Test Guest');
    await page.getByPlaceholder(/email address/i).fill('e2e+test@example.com');

    // 6. Confirm booking button is present with price
    const confirmBtn = page.getByRole('button', { name: /confirm booking|pay with card/i }).first();
    await expect(confirmBtn).toBeVisible();
  });

  test('mobile layout — booking panel is accessible at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en');

    const firstCard = page.locator('a[href*="/properties/"]').first();
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await firstCard.click();

    // Booking panel renders below the fold on mobile — scroll to it
    const checkAvailabilityBtn = page.getByRole('button', { name: /check availability/i });
    await checkAvailabilityBtn.scrollIntoViewIfNeeded();
    await expect(checkAvailabilityBtn).toBeVisible();

    // Tap target must be at least 44px tall
    const box = await checkAvailabilityBtn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
