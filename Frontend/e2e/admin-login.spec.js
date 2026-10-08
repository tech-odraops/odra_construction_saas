import { expect, test } from '@playwright/test';

test.describe('admin login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/login');
  });

  test('shows the admin sign-in form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
  });

  test('shows the API error for rejected admin credentials', async ({ page }) => {
    await page.route('**/admin/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid admin credentials' }),
      });
    });

    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('incorrect-password');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page.getByText('Invalid admin credentials')).toBeVisible();
  });
});