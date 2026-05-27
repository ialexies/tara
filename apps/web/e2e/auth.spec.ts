import { test, expect } from '@playwright/test';

/**
 * Email/password auth flow against real Firebase.
 * Each run uses a unique email to avoid colliding with previous runs.
 * Note: this leaves a test user in Firebase Auth — clean up periodically via console.
 *
 * Google OAuth is not covered here — automating Google's sign-in page is unreliable
 * due to bot detection. Verify manually.
 */
const TEST_EMAIL = `e2e-${Date.now()}@tara-test.ph`;
const TEST_PASSWORD = 'e2etestpass';
const TEST_NAME = 'E2E Tester';

test.describe('Email/password registration', () => {
  test('registers as guest and lands on home signed in', async ({ page }) => {
    await page.goto('/en/register');
    await expect(page.getByRole('heading', { name: 'Join Tara' })).toBeVisible();

    // Default role is guest
    await expect(page.getByRole('radio', { name: /book hostels/i })).toBeChecked();

    await page.getByLabel(/full name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    // After successful registration we redirect to /en
    await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
    // Logged-in guests see "My bookings" and "Sign out"
    await expect(page.getByRole('link', { name: /my bookings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('rejects duplicate email', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).not.toHaveURL(/\/en$/);
  });
});

test.describe('Email/password login', () => {
  test('can sign in and sign out', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page).toHaveURL(/\/en$/, { timeout: 15_000 });
    await expect(page.getByRole('link', { name: /my bookings/i })).toBeVisible();

    await page.getByRole('button', { name: /sign out/i }).click();
    await expect(page).toHaveURL(/\/en\/login$/);

    await page.goto('/en');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /^sign in$/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Auth UI elements', () => {
  test('login page has Google button and password reset link', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
  });

  test('register page has Google button and role picker', async ({ page }) => {
    await page.goto('/en/register');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /book hostels/i })).toBeVisible();
    await expect(page.getByRole('radio', { name: /list a property/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('login page links to register', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/en\/register$/);
  });

  test('register page links to login', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByRole('link', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});
