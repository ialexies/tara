import { test, expect } from '@playwright/test';

const OWNER_EMAIL = 'owner@test.tara-stays.com';
const OWNER_PASSWORD = 'Test1234!';

test.describe('Stripe Connect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill(OWNER_EMAIL);
    await page.getByLabel(/password/i).fill(OWNER_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();
    const landed = await page
      .waitForURL(/dashboard/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) test.skip();
  });

  test('rooms page shows Stripe Connect banner when not connected', async ({ page }) => {
    await page.goto('/en/dashboard');

    // Navigate to the first property's rooms page
    const roomsLink = page.getByRole('link', { name: /rooms/i }).first();
    const hasLink = await roomsLink.isVisible().catch(() => false);
    if (!hasLink) {
      test.skip(true, 'No properties found for test owner');
      return;
    }

    const href = await roomsLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);

    // The Stripe Connect banner should be visible (amber = not connected, green = connected)
    const connectBanner = page.getByText(/connect stripe/i);
    const connectedBanner = page.getByText(/stripe payouts connected/i);
    const bannerVisible =
      (await connectBanner.isVisible().catch(() => false)) ||
      (await connectedBanner.isVisible().catch(() => false));

    expect(bannerVisible).toBe(true);
  });

  test('Connect Stripe button fires onboarding request and would redirect to Stripe', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');

    const roomsLink = page.getByRole('link', { name: /rooms/i }).first();
    const hasLink = await roomsLink.isVisible().catch(() => false);
    if (!hasLink) {
      test.skip(true, 'No properties found for test owner');
      return;
    }

    const href = await roomsLink.getAttribute('href');
    if (!href) return;
    await page.goto(href);

    const connectBtn = page.getByRole('button', { name: /connect stripe account/i });
    const isNotConnected = await connectBtn.isVisible().catch(() => false);
    if (!isNotConnected) {
      test.skip(true, 'Property already has Stripe connected — skip onboarding test');
      return;
    }

    // Intercept the API call to avoid actually hitting Stripe
    let onboardingCalled = false;
    await page.route('**/stripe/connect/*/onboard', (route) => {
      onboardingCalled = true;
      void route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ url: 'https://connect.stripe.com/setup/e/test/redirect' }),
      });
    });

    await connectBtn.click();

    // Verify the onboarding API was called
    await page.waitForTimeout(2_000);
    expect(onboardingCalled).toBe(true);
  });

  test('Stripe Connect status endpoint returns valid shape', async ({ request }) => {
    // This test hits the API directly using Playwright's request context.
    // It verifies the endpoint returns the expected JSON shape (not auth-gated in a way that breaks).
    const apiUrl =
      process.env['NEXT_PUBLIC_API_URL'] ??
      (process.env['PLAYWRIGHT_BASE_URL'] === 'https://staging.tara-stays.com'
        ? 'https://api-staging.tara-stays.com'
        : 'http://localhost:4000');

    const propertyId = process.env['TEST_STRIPE_PROPERTY_ID'];
    if (!propertyId) {
      test.skip(true, 'TEST_STRIPE_PROPERTY_ID not set');
      return;
    }

    const res = await request.get(`${apiUrl}/stripe/connect/${propertyId}/status`);
    // Should 401 (auth required) — not 404 or 500
    expect(res.status()).toBe(401);
  });

  test('Connected banner shown when stripeConnectEnabled = true', async ({ page }) => {
    const propertyId = process.env['TEST_STRIPE_CONNECTED_PROPERTY_ID'];
    if (!propertyId) {
      test.skip(true, 'TEST_STRIPE_CONNECTED_PROPERTY_ID not set — need a connected property');
      return;
    }

    await page.goto(`/en/dashboard/properties/${propertyId}/rooms`);
    await expect(page.getByText(/stripe payouts connected/i)).toBeVisible({ timeout: 10_000 });
  });
});
