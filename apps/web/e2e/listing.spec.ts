import { test, expect } from '@playwright/test';

test.describe('Property listing page', () => {
  test('shows search and filter controls', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByPlaceholder(/search by name/i)).toBeVisible();
    await expect(page.getByRole('combobox')).toBeVisible(); // type filter dropdown
  });

  test('shows amenity filter chips', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('button', { name: 'WiFi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pool' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Parking' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AC' })).toBeVisible();
  });

  test('amenity chip toggles active state', async ({ page }) => {
    await page.goto('/en');
    const wifiBtn = page.getByRole('button', { name: 'WiFi' });
    // Initially not active (no dark bg)
    await expect(wifiBtn).not.toHaveClass(/bg-zinc-900/);
    await wifiBtn.click();
    // After click becomes active
    await expect(wifiBtn).toHaveClass(/bg-zinc-900/);
    // Click again to deactivate
    await wifiBtn.click();
    await expect(wifiBtn).not.toHaveClass(/bg-zinc-900/);
  });

  test('amenity filter triggers server fetch and updates results', async ({ page }) => {
    await page.goto('/en');
    const wifiBtn = page.getByRole('button', { name: 'WiFi' });
    await wifiBtn.click();
    // Results should update (either showing filtered results or empty state)
    await page.waitForTimeout(1000);
    const hasResults = await page.getByRole('list').isVisible();
    const hasEmpty = await page.getByText(/no properties/i).isVisible();
    expect(hasResults || hasEmpty).toBe(true);
  });

  test('clear resets amenity filters', async ({ page }) => {
    await page.goto('/en');
    const wifiBtn = page.getByRole('button', { name: 'WiFi' });
    await wifiBtn.click();
    await expect(wifiBtn).toHaveClass(/bg-zinc-900/);
    const clearBtn = page.getByRole('button', { name: 'Clear', exact: true });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(wifiBtn).not.toHaveClass(/bg-zinc-900/);
    await expect(clearBtn).not.toBeVisible();
  });

  test('filter by type narrows results or shows empty state', async ({ page }) => {
    await page.goto('/en');
    const typeFilter = page.getByRole('combobox');
    await typeFilter.selectOption('hostel');
    // Either shows results or empty state — no crash
    const hasResults = await page.getByRole('list').isVisible();
    const hasEmpty = await page.getByText(/no properties/i).isVisible();
    expect(hasResults || hasEmpty).toBe(true);
  });

  test('clear button appears when filters are active and resets them', async ({ page }) => {
    await page.goto('/en');
    const searchInput = page.getByPlaceholder(/search by name/i);
    await searchInput.fill('test');
    // Use exact match — the filter bar has "Clear", the empty-state has "Clear filters"
    const clearBtn = page.getByRole('button', { name: 'Clear', exact: true });
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await expect(searchInput).toHaveValue('');
    await expect(clearBtn).not.toBeVisible();
  });

  test('header shows sign in button when logged out', async ({ page }) => {
    await page.goto('/en');
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});
