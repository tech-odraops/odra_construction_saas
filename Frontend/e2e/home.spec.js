import { expect, test } from '@playwright/test';

test('homepage mounts the application', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/ODRAOPS - Construction Management Software/);
  await expect(page.locator('#root')).not.toBeEmpty();
});