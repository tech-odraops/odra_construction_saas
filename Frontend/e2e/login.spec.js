import { expect, test } from '@playwright/test';

test.describe('regular login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
  });

  test('shows the sign-in fields and role choices', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('select[name="role"]')).toHaveValue('');
    await expect(page.locator('select[name="role"] option')).toHaveCount(3);
  });

  test('shows required-field feedback without submitting', async ({ page }) => {
    let requestSent = false;
    await page.route('**/auth/signIn', async (route) => {
      requestSent = true;
      await route.continue();
    });

    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Please enter a valid email.')).toBeVisible();
    await expect(page.getByText('Please select a role.')).toBeVisible();
    expect(requestSent).toBe(false);
  });

  test('shows the API error for rejected credentials', async ({ page }) => {
    await page.route('**/auth/signIn', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.locator('input[name="email"]').fill('worker@example.com');
    await page.locator('select[name="role"]').selectOption('manager');
    await page.locator('input[name="password"]').fill('incorrect-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
  });

  test('logs in a manager and redirects to the contractor dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      Notification.requestPermission = async () => 'denied';
    });

    await page.route('**/auth/signIn', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'eyJhbGciOiJub25lIn0.eyJVc2VyX2lkIjoiY29udHJhY3Rvci0xIiwicm9sZSI6Im1hbmFnZXIifQ.',
          User_id: 'contractor-1',
          name: 'Test Contractor',
          role: 'manager',
        }),
      });
    });

    test.describe('password recovery', () => {
      test('requests a reset link and shows email confirmation', async ({ page }) => {
        await page.goto('/Login', { waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Forgot password?' }).click();
        await page.getByLabel('Email').fill('worker@example.com');

        await page.route('**/auth/forgot-password', async (route) => {
          expect(route.request().postDataJSON()).toEqual({
            email: 'worker@example.com',
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        });
        await page.getByRole('button', { name: 'Send Reset Link' }).click();

        await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
        await expect(
          page.getByText('Check your inbox and follow the link to choose a new password.'),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Back to Sign In' }).click();
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      });

      test('resets the password using the emailed token', async ({ page }) => {
        await page.goto('/reset-password?token=verified-reset-token', {
          waitUntil: 'domcontentloaded',
        });
        await expect(
          page.getByRole('heading', { name: 'Create new password' }),
        ).toBeVisible();
        await page.getByLabel('New password').fill('new-password-123');
        await page.getByLabel('Confirm password').fill('new-password-123');

        await page.route('**/auth/reset-password', async (route) => {
          expect(route.request().postDataJSON()).toEqual({
            token: 'verified-reset-token',
            newPassword: 'new-password-123',
          });
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true }),
          });
        });
        await page.getByRole('button', { name: 'Reset Password' }).click();

        await expect(
          page.getByRole('heading', { name: 'Password reset successfully' }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Go to Sign In' }).click();
        await expect(page.getByRole('heading', { name: 'Welcome Back' })).toBeVisible();
      });
    });
    await page.route('**/subscription/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ plan: 'free' }),
      });
    });

    await page.locator('input[name="email"]').fill('manager@example.com');
    await page.locator('select[name="role"]').selectOption('manager');
    await page.locator('input[name="password"]').fill('correct-password');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/contractor\/home$/);
    await expect(page).toHaveTitle(/ODRAOPS - Construction Management Software/);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('token')))
      .toBe('eyJhbGciOiJub25lIn0.eyJVc2VyX2lkIjoiY29udHJhY3Rvci0xIiwicm9sZSI6Im1hbmFnZXIifQ.');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('name')))
      .toBe('Test Contractor');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('subscription')))
      .toBe(JSON.stringify({ plan: 'free' }));
  });
});