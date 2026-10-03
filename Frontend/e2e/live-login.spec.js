import { expect, test } from '@playwright/test';

const liveTestsEnabled = process.env.E2E_LIVE_AUTH === 'true';

const accounts = [
  {
    name: 'manager',
    email: process.env.E2E_MANAGER_EMAIL,
    password: process.env.E2E_MANAGER_PASSWORD,
    role: 'manager',
    destination: '/contractor/home',
  },
  {
    name: 'site engineer',
    email: process.env.E2E_ENGINEER_EMAIL,
    password: process.env.E2E_ENGINEER_PASSWORD,
    role: 'site engineer',
    destination: '/engineer/home',
  },
  {
    name: 'admin',
    email: process.env.E2E_ADMIN_EMAIL,
    password: process.env.E2E_ADMIN_PASSWORD,
    destination: '/admin/dashboard',
  },
];

for (const account of accounts) {
  test(`live login redirects ${account.name} to the correct dashboard`, async ({ page }) => {
    test.skip(
      !liveTestsEnabled || !account.email || !account.password,
      'Set E2E_LIVE_AUTH=true and the account email/password environment variables to enable live login tests.'
    );

    await page.addInitScript(() => {
      Notification.requestPermission = async () => 'denied';
    });

    if (account.role) {
      await page.goto('/Login', { waitUntil: 'domcontentloaded' });
      await page.locator('input[name="email"]').fill(account.email);
      await page.locator('select[name="role"]').selectOption(account.role);
      await page.locator('input[name="password"]').fill(account.password);
      await page.getByRole('button', { name: 'Sign In' }).click();
    } else {
      await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
      await page.locator('#email').fill(account.email);
      await page.locator('#password').fill(account.password);
      await page.getByRole('button', { name: 'Login' }).click();
    }

    await expect(page).toHaveURL(new RegExp(`${account.destination.replaceAll('/', '\\/')}$`));
  });
}