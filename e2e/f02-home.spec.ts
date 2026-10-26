import { expect, signIn, test } from './helpers';

test.describe('F02 ana sayfa ve gezinme', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('F02-H1 sekmeler arasında gezinme', async ({ page }) => {
    await page.getByRole('tab', { name: 'Saved' }).click();
    await expect(page.getByText('Koleksiyonum')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Saved' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Profile' }).click();
    await expect(page.getByText('Mevcut Bakiyem')).toBeVisible();

    await page.getByRole('tab', { name: 'Home' }).click();
    await expect(page.getByText('Merhaba Amélie,')).toBeVisible();
  });

  test('F02-H2 kredi rozeti Kredilerim ekranını açar', async ({ page }) => {
    await page.getByRole('button', { name: 'Kredi bakiyesi 30' }).click();
    await expect(page.getByText('Kredilerim')).toBeVisible();
    await expect(page.getByRole('button', { name: /200 Kredi satın al/ })).toBeVisible();
  });

  test('F02-H3 takvim butonu Özel Gün Takvimini açar', async ({ page }) => {
    await page.getByRole('button', { name: 'Özel Gün Takvimi ve Hatırlatıcılar' }).click();
    await expect(page.getByText('Özel Gün Takvimi')).toBeVisible();
  });

  test('F02-E1 375px genişlikte yatay taşma yok', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    const overflow = await page.evaluate(
      () => document.scrollingElement!.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
