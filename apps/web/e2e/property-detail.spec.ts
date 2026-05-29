import { test, expect } from '@playwright/test';

/**
 * Property detail page E2E tests.
 *
 * These tests use the seed properties from infra/scripts/seed-zambales.sql.
 * They run against whatever base URL Playwright is configured for (staging or local).
 * On staging, the seed properties must exist — run the seed SQL against the staging DB
 * if they're missing.
 */

const SEED_SLUGS = [
  'anawangin-cove-backpackers',
  'liwliwa-surf-house',
  'subic-bay-dive-stay',
  'nagsasa-cove-eco-camp',
  'olongapo-city-hostel',
  'pundaquit-beach-resort',
] as const;

test.describe('Property detail page', () => {
  test('cover image renders for a seed property', async ({ page }) => {
    await page.goto('/en/properties/liwliwa-surf-house');

    // Cover image should be visible (loaded from Unsplash via next/image)
    const coverImg = page.locator('img').first();
    await expect(coverImg).toBeVisible({ timeout: 8_000 });

    // Property name should be in an h1
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Liwliwa Surf House');
  });

  test('property description is shown', async ({ page }) => {
    await page.goto('/en/properties/liwliwa-surf-house');
    await expect(page.getByText(/surf/i)).toBeVisible({ timeout: 8_000 });
  });

  test('room list shows at least one room with a price', async ({ page }) => {
    await page.goto('/en/properties/subic-bay-dive-stay');
    // Rooms are shown in the booking panel
    await expect(page.getByText(/Diver Dorm|Bay View|Family Suite/i)).toBeVisible({
      timeout: 8_000,
    });
    // At least one price should appear (₱ sign)
    await expect(page.getByText(/₱/)).toBeVisible();
  });

  test('amenity chips are displayed', async ({ page }) => {
    await page.goto('/en/properties/olongapo-city-hostel');
    // Olongapo has wifi=true and parking=true
    await expect(page.getByText(/WiFi|Parking|Gym/i)).toBeVisible({ timeout: 8_000 });
  });

  test('check-in/check-out times are visible', async ({ page }) => {
    await page.goto('/en/properties/pundaquit-beach-resort');
    await expect(page.getByText(/check.in|2:00 PM/i)).toBeVisible({ timeout: 8_000 });
  });

  test('house rules section is visible', async ({ page }) => {
    await page.goto('/en/properties/pundaquit-beach-resort');
    await expect(page.getByText(/house rules|Pool area closes/i)).toBeVisible({ timeout: 8_000 });
  });

  test('all seed property pages return 200 without throttle errors', async ({ page }) => {
    for (const slug of SEED_SLUGS) {
      const response = await page.goto(`/en/properties/${slug}`);
      expect(response?.status(), `${slug} returned non-200`).toBe(200);
      // None should show a 429/rate-limit error
      await expect(page.getByText(/too many requests/i)).not.toBeVisible();
    }
  });

  test('gallery thumbnails appear for properties with multiple images', async ({ page }) => {
    await page.goto('/en/properties/pundaquit-beach-resort');
    // Pundaquit has 5 gallery images; cover + at least 1 thumbnail should render
    const firstImg = page.locator('img').first();
    await expect(firstImg).toBeVisible({ timeout: 8_000 });
    const imgCount = await page.locator('img').count();
    expect(imgCount).toBeGreaterThanOrEqual(2);
  });

  test('booking panel shows date inputs', async ({ page }) => {
    await page.goto('/en/properties/liwliwa-surf-house');
    await expect(page.locator('input[type="date"]').first()).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Property detail — mobile layout', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('property page renders correctly at 375px', async ({ page }) => {
    await page.goto('/en/properties/anawangin-cove-backpackers');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 8_000 });
    // No horizontal overflow — page width stays at 375
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(375);
  });

  test('cover image fills width on mobile', async ({ page }) => {
    await page.goto('/en/properties/anawangin-cove-backpackers');
    const coverImg = page.locator('img').first();
    await expect(coverImg).toBeVisible({ timeout: 8_000 });
    const box = await coverImg.boundingBox();
    // On mobile, image should be close to full width
    expect(box?.width).toBeGreaterThan(300);
  });
});

test.describe('Property detail — not found', () => {
  test('returns 404 page for unknown slug', async ({ page }) => {
    const response = await page.goto('/en/properties/this-does-not-exist-xyz-abc');
    expect(response?.status()).toBe(404);
  });
});
