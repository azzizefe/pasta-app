import { expect, signIn, test } from './helpers';

test.describe('F01 giriş', () => {
  test('F01-H1 Google ile giriş ana sayfayı açar', async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole('tab', { name: 'Home' })).toBeVisible();
  });

  test('F01-E1 çift tıklama tek oturum açar', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign in with Google' }).dblclick();
    await expect(page.getByText('Merhaba Amélie,')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Home' })).toHaveCount(1);
  });

  test('F01-E2 yenileme sonrası oturum korunur', async ({ page }) => {
    await signIn(page);
    await page.reload();
    await expect(page.getByText('Merhaba Amélie,')).toBeVisible();
  });
});
