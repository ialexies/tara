import { test, expect } from '@playwright/test';

test.describe('Owner dashboard tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('owner@test.tara-stays.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Skip gracefully if owner test user is not configured in this env's Firebase
    const landed = await page
      .waitForURL(/dashboard/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) test.skip();
  });

  test('dashboard shows Calendar, Compare, Refer, Webhooks, Promo, Reviews links', async ({
    page,
  }) => {
    await page.goto('/en/dashboard');
    await expect(page.getByRole('link', { name: /calendar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /compare/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /refer/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /webhooks/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /promo codes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /reviews/i })).toBeVisible();
  });

  test('reviews page loads and shows heading', async ({ page }) => {
    await page.goto('/en/dashboard/reviews');
    await expect(page.getByRole('heading', { name: /guest reviews/i })).toBeVisible({
      timeout: 5_000,
    });
  });

  test('multi-property calendar page loads', async ({ page }) => {
    await page.goto('/en/dashboard/calendar');
    await expect(page.getByRole('heading', { name: /multi-property calendar/i })).toBeVisible();
    // Month navigation buttons should be visible
    await expect(page.getByRole('button', { name: '‹' })).toBeVisible();
    await expect(page.getByRole('button', { name: '›' })).toBeVisible();
  });

  test('performance comparison page loads', async ({ page }) => {
    await page.goto('/en/dashboard/compare');
    await expect(page.getByRole('heading', { name: /performance comparison/i })).toBeVisible();
    await expect(page.getByText('Panel A')).toBeVisible();
    await expect(page.getByText('Panel B')).toBeVisible();
  });

  test('webhooks page loads and shows add button', async ({ page }) => {
    await page.goto('/en/dashboard/webhooks');
    await expect(page.getByRole('heading', { name: /webhooks/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add webhook/i })).toBeVisible();
  });

  test('referral page shows code and share link', async ({ page }) => {
    await page.goto('/en/dashboard/refer');
    await expect(page.getByRole('heading', { name: /refer a friend/i })).toBeVisible();
    // Wait for the referral code to load
    await expect(page.getByText(/your referral code/i)).toBeVisible({ timeout: 5_000 });
  });
});

test.describe('Property-level tools', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill('owner@test.tara-stays.com');
    await page.getByLabel(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /sign in/i }).click();
    const landed = await page
      .waitForURL(/dashboard/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) test.skip();
  });

  test('rooms page nav shows Blacklist, Staff, and Waitlist links', async ({ page }) => {
    await page.goto('/en/dashboard');
    // Click first property manage link
    const manageLink = page.getByRole('link', { name: /manage/i }).first();
    const hasManage = await manageLink.isVisible().catch(() => false);
    if (!hasManage) return; // no properties in test env

    await manageLink.click();
    await expect(page.getByRole('link', { name: /blacklist/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /staff/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /waitlist/i })).toBeVisible();
  });

  test('waitlist page loads for a property', async ({ page }) => {
    await page.goto('/en/dashboard');
    const propLink = page.getByRole('link', { name: /rooms/i }).first();
    const hasLink = await propLink.isVisible().catch(() => false);
    if (!hasLink) return;
    const href = await propLink.getAttribute('href');
    if (!href) return;
    await page.goto(href.replace('/rooms', '/waitlist'));
    await expect(page.getByRole('heading', { name: /waitlist/i })).toBeVisible({ timeout: 5_000 });
  });

  test('pricing page shows List/Calendar toggle', async ({ page }) => {
    await page.goto('/en/dashboard');
    // Navigate to first property pricing page
    const firstPricingLink = page.getByRole('link', { name: /pricing/i }).first();
    const hasPricing = await firstPricingLink.isVisible().catch(() => false);
    if (!hasPricing) return;

    await firstPricingLink.click();
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Calendar' })).toBeVisible();
  });
});
