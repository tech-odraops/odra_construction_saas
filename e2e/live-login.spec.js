import { expect, test } from '@playwright/test';

const accounts = [
  {
    name: 'manager',
    email: 'amiyamaity7105@gmail.com',
    password: 'asdf1212',
    destination: '/founder/home',
  },
  {
    name: 'site engineer',
    email: "amiyamaity.13051@gmail.com",
    password: 'asdf1212',
    destination: '/site-engineer/home',
  }
];

for (const account of accounts) {
  test(`live login redirects ${account.name} to the correct dashboard`, async ({ page }) => {
    test.skip(
      !account.email || !account.password,
      'Set the account email/password environment variables to enable this test.'
    );

    await page.addInitScript(() => {
      Notification.requestPermission = async () => 'denied';
    });

    await page.goto('/Login', { waitUntil: 'domcontentloaded' });
    await page.locator('input[name="email"]').fill(account.email);
    await page.locator('input[name="password"]').fill(account.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(new RegExp(`${account.destination.replaceAll('/', '\\/')}$`));
  });
}