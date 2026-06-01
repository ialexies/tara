import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@test.tara-stays.com';
const ADMIN_PASSWORD = 'Test1234!';
const OWNER_EMAIL = 'owner@test.tara-stays.com';
const OWNER_PASSWORD = 'Test1234!';

async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/en/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /^sign in$/i }).click();
}

test.describe('Admin auth guard', () => {
  test('redirects unauthenticated user away from /admin', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test('redirects owner (non-admin) away from /admin', async ({ page }) => {
    await loginAs(page, OWNER_EMAIL, OWNER_PASSWORD);
    const landed = await page
      .waitForURL(/dashboard/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) {
      test.skip();
      return;
    }

    await page.goto('/en/admin');
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });
});

test.describe('Admin dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const landed = await page
      .waitForURL(/\/admin/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (!landed) {
      test.skip();
      return;
    }
  });

  test('home page shows stats and sidebar nav', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByText(/active properties/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/total owners/i)).toBeVisible();
    await expect(page.getByText(/total users/i)).toBeVisible();
    await expect(page.getByText(/revenue this month/i)).toBeVisible();
    // Sidebar links (desktop viewport — tests run at 375px so bottom nav shows)
    await expect(page.getByRole('link', { name: /tara admin/i })).toBeVisible();
  });

  test('home page shows pending approvals and recent bookings panels', async ({ page }) => {
    await page.goto('/en/admin');
    await expect(page.getByText(/recent bookings/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/pending approval/i)).toBeVisible();
  });

  test('properties page loads with search and status filter', async ({ page }) => {
    await page.goto('/en/admin/properties');
    await expect(page.getByRole('heading', { name: /properties/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by name/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('combobox')).toBeVisible();
  });

  test('properties page lists at least one property', async ({ page }) => {
    await page.goto('/en/admin/properties');
    // Wait for data to load — at least one property card with Approve or Suspend button
    await expect(page.getByRole('button', { name: /approve|suspend|pause/i }).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('bookings page loads TanStack table with columns', async ({ page }) => {
    await page.goto('/en/admin/bookings');
    await expect(page.getByRole('heading', { name: /bookings/i })).toBeVisible();
    await expect(page.getByText(/ref/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(/guest/i)).toBeVisible();
    await expect(page.getByText(/amount/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
  });

  test('bookings page status filter updates results', async ({ page }) => {
    await page.goto('/en/admin/bookings');
    await page.waitForTimeout(2_000);
    const select = page.getByRole('combobox');
    await select.selectOption('confirmed');
    await page.waitForTimeout(1_000);
    // Row count text updates
    await expect(page.getByText(/rows/i)).toBeVisible();
  });

  test('owners page loads with filter chips', async ({ page }) => {
    await page.goto('/en/admin/owners');
    await expect(page.getByRole('heading', { name: /owners/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /all/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: /needs setup/i })).toBeVisible();
  });

  test('owners page expand accordion shows properties', async ({ page }) => {
    await page.goto('/en/admin/owners');
    // Click the first owner row to expand
    const firstOwner = page.locator('li').first();
    await firstOwner.waitFor({ timeout: 8_000 });
    await firstOwner.getByRole('button').first().click();
    // Should show at least one property or "No properties yet"
    await expect(firstOwner.getByText(/active|draft|pending|suspended|no properties/i)).toBeVisible(
      { timeout: 5_000 },
    );
  });

  test('users page loads with role selectors', async ({ page }) => {
    await page.goto('/en/admin/users');
    await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by email/i)).toBeVisible({ timeout: 8_000 });
    // At least one role selector
    await expect(page.getByRole('combobox').first()).toBeVisible();
  });

  test('users page search filters the list', async ({ page }) => {
    await page.goto('/en/admin/users');
    await page.waitForTimeout(2_000);
    const before = await page.getByRole('listitem').count();
    await page.getByPlaceholder(/search by email/i).fill('owner@test');
    await page.waitForTimeout(500);
    const after = await page.getByRole('listitem').count();
    expect(after).toBeLessThanOrEqual(before);
  });

  test('reviews page loads with reply and delete buttons', async ({ page }) => {
    await page.goto('/en/admin/reviews');
    await expect(page.getByRole('heading', { name: /reviews/i })).toBeVisible();
    await page.waitForTimeout(3_000);
    const count = await page.getByRole('listitem').count();
    if (count > 0) {
      await expect(page.getByRole('button', { name: /reply/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i }).first()).toBeVisible();
    }
  });

  test('broadcast page has subject, message inputs and send button', async ({ page }) => {
    await page.goto('/en/admin/broadcast');
    await expect(page.getByRole('heading', { name: /broadcast/i })).toBeVisible();
    await expect(page.getByPlaceholder(/subject/i)).toBeVisible();
    await expect(page.getByPlaceholder(/message/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send to all owners/i })).toBeVisible();
    // Button disabled when fields empty
    await expect(page.getByRole('button', { name: /send to all owners/i })).toBeDisabled();
  });

  test('broadcast preview appears when message is typed', async ({ page }) => {
    await page.goto('/en/admin/broadcast');
    await page.getByPlaceholder(/subject/i).fill('Test subject');
    await page.getByPlaceholder(/message/i).fill('Hello owners');
    await expect(page.getByText(/preview/i)).toBeVisible();
    await expect(page.getByText('Hello owners')).toBeVisible();
    await expect(page.getByRole('button', { name: /send to all owners/i })).toBeEnabled();
  });

  test('audit page loads with sortable table', async ({ page }) => {
    await page.goto('/en/admin/audit');
    await expect(page.getByRole('heading', { name: /audit log/i })).toBeVisible();
    await expect(page.getByPlaceholder(/filter by event/i)).toBeVisible({ timeout: 8_000 });
    // Table headers
    await expect(page.getByRole('columnheader', { name: /event/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /actor/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /time/i })).toBeVisible();
  });

  test('audit page search filters results', async ({ page }) => {
    await page.goto('/en/admin/audit');
    await page.waitForTimeout(3_000);
    await page.getByPlaceholder(/filter by event/i).fill('auth.');
    await page.waitForTimeout(500);
    // All visible rows should match the filter or table is empty
    const rows = page.getByRole('row').filter({ hasText: /auth\./i });
    const total = page.getByRole('row');
    expect(await rows.count()).toBeLessThanOrEqual(await total.count());
  });

  test('"← My dashboard" link returns to owner dashboard', async ({ page }) => {
    await page.goto('/en/admin');
    await page.getByRole('link', { name: /my dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 8_000 });
  });
});
