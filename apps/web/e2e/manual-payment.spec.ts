import { test, expect, type Page } from '@playwright/test';
import path from 'path';

const OWNER_EMAIL = 'owner@test.tara-stays.com';
const OWNER_PASSWORD = 'Test1234!';
const FIXTURE_IMAGE = path.join(__dirname, 'fixtures/test-image.png');

const API_URL =
  process.env['NEXT_PUBLIC_API_URL'] ??
  (process.env['PLAYWRIGHT_BASE_URL'] === 'https://staging.tara-stays.com'
    ? 'https://api-staging.tara-stays.com'
    : 'http://localhost:4000');

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/en/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
  await page.waitForURL(/\/(dashboard|en\/?$)/, { timeout: 15_000 });
}

test.describe('Manual payment flow', () => {
  // All tests in this suite require a manual_pending booking to exist on staging.
  // Set TEST_MANUAL_BOOKING_REF to the booking's reference code before running.
  // The booking must have guestEmail matching TEST_MANUAL_BOOKING_EMAIL.
  const refCode = process.env['TEST_MANUAL_BOOKING_REF'] ?? '';
  const guestEmail = process.env['TEST_MANUAL_BOOKING_EMAIL'] ?? '';

  test('guest sees upload card on manual_pending booking', async ({ page }) => {
    if (!refCode) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF not set');
      return;
    }

    await page.goto(`/en/bookings/ref/${refCode}`);
    await expect(page.getByText(/awaiting payment/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/upload payment screenshot/i)).toBeVisible();
  });

  test('guest can upload payment proof screenshot', async ({ page }) => {
    if (!refCode || !guestEmail) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF or TEST_MANUAL_BOOKING_EMAIL not set');
      return;
    }

    await page.goto(`/en/bookings/ref/${refCode}`);
    await expect(page.getByText(/upload payment screenshot/i)).toBeVisible({ timeout: 10_000 });

    // The file input is hidden; trigger it via setInputFiles on the element directly
    const fileInput = page.locator('input[type="file"][accept*="image"]');
    await fileInput.setInputFiles(FIXTURE_IMAGE);

    // Should show success banner after upload completes
    await expect(page.getByText(/payment screenshot sent/i)).toBeVisible({ timeout: 20_000 });
  });

  test('owner sees payment proof thumbnail in booking card', async ({ page }) => {
    if (!refCode) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF not set');
      return;
    }

    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto('/en/dashboard/bookings');

    // Find the booking by ref code and expand it
    await expect(page.getByText(refCode)).toBeVisible({ timeout: 10_000 });
    await page.getByText(refCode).click();

    // Proof thumbnail should appear when paymentProofUrl is set
    await expect(page.locator('img[alt="Payment proof"]')).toBeVisible({ timeout: 5_000 });
  });

  test('owner can confirm payment and booking transitions to confirmed', async ({ page }) => {
    if (!refCode) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF not set');
      return;
    }

    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);
    await page.goto('/en/dashboard/bookings');

    await expect(page.getByText(refCode)).toBeVisible({ timeout: 10_000 });
    await page.getByText(refCode).click();

    const confirmBtn = page.getByRole('button', { name: /confirm payment/i });
    await expect(confirmBtn).toBeVisible({ timeout: 5_000 });
    await confirmBtn.click();

    // After confirm, the status chip should show Confirmed
    await expect(page.getByText(/confirmed/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test('email mismatch rejects payment proof upload with 403', async ({ request }) => {
    if (!refCode) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF not set');
      return;
    }

    // Resolve the booking ID from the ref code first
    const detailRes = await request.get(`${API_URL}/bookings/ref/${refCode}`);
    if (!detailRes.ok()) {
      test.skip(true, 'Could not resolve booking — may already be confirmed');
      return;
    }
    const { id } = (await detailRes.json()) as { id: string };

    const res = await request.post(`${API_URL}/bookings/${id}/payment-proof-upload-url`, {
      data: { contentType: 'image/png', guestEmail: 'wrong@example.com' },
    });

    expect(res.status()).toBe(403);
  });

  test('upload card meets 44px tap target on mobile', async ({ page }) => {
    if (!refCode) {
      test.skip(true, 'TEST_MANUAL_BOOKING_REF not set');
      return;
    }

    await page.goto(`/en/bookings/ref/${refCode}`);
    await expect(page.getByText(/upload payment screenshot/i)).toBeVisible({ timeout: 10_000 });

    const btn = page.getByRole('button', { name: /upload payment screenshot/i });
    await btn.scrollIntoViewIfNeeded();
    const box = await btn.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
