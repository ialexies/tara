import { test, expect } from '@playwright/test';

// Use a unique email per test run so staging re-runs don't conflict
const TEST_EMAIL = `e2e-${Date.now()}@tara-test.ph`;
const TEST_PASSWORD = 'e2etestpass';
const TEST_NAME = 'E2E Tester';

test.describe('Registration flow', () => {
  test('can register as a guest and sees "Signed in as" on home', async ({ page }) => {
    await page.goto('/en/register');

    // Form should be visible at 375px
    await expect(page.getByRole('heading', { name: 'Join Tara' })).toBeVisible();

    // Fill in the form
    await page.getByLabel(/full name/i).fill(TEST_NAME);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);

    // "Book hostels" radio should be selected by default
    await expect(page.getByRole('radio', { name: /book hostels/i })).toBeChecked();

    // Submit
    await page.getByRole('button', { name: /create account/i }).click();

    // Should redirect to home
    await expect(page).toHaveURL(/\/en$/);

    // "Signed in as" should appear
    await expect(page.getByText(/signed in as/i)).toBeVisible();
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('shows error for duplicate email', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    // Should show error (not redirect)
    await expect(page.getByText(/already registered/i)).toBeVisible();
  });

  test('shows validation error for short password', async ({ page }) => {
    await page.goto('/en/register');
    await page.getByLabel(/email/i).fill(`short-${Date.now()}@tara-test.ph`);
    await page.getByLabel(/password/i).fill('short');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});

test.describe('Login flow', () => {
  test('can log in and sees "Signed in as" on home', async ({ page }) => {
    await page.goto('/en/login');

    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByText(/signed in as/i)).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
  });

  test('can sign out and sees login/register buttons', async ({ page }) => {
    // Log in first
    await page.goto('/en/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/en$/);

    // Sign out
    await page.getByRole('button', { name: /sign out/i }).click();

    // Should be redirected to login
    await expect(page).toHaveURL(/\/en\/login$/);

    // Back on home, should see sign in / create account
    await page.goto('/en');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /create account/i })).toBeVisible();
  });
});

test.describe('Navigation between auth pages', () => {
  test('login page has link to register', async ({ page }) => {
    await page.goto('/en/login');
    await expect(page.getByRole('link', { name: /create one/i })).toBeVisible();
    await page.getByRole('link', { name: /create one/i }).click();
    await expect(page).toHaveURL(/\/en\/register$/);
  });

  test('register page has link to login', async ({ page }) => {
    await page.goto('/en/register');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/en\/login$/);
  });
});
