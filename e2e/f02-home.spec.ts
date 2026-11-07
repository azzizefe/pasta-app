import { expect, signIn, test, WELCOME_CREDITS } from './helpers';

test.describe('F02 ana sayfa ve gezinme', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('F02-H1 sekmeler arasında gezinme', async ({ page }) => {
    await page.getByRole('tab', { name: 'Koleksiyon' }).click();
    await expect(page.getByText('Koleksiyonum')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Koleksiyon' })).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Hesabım' }).click();
    await expect(page.getByText('Tasarım Bakiyesi')).toBeVisible();

    await page.getByRole('tab', { name: 'Atölye' }).click();
    await expect(page.getByText(/^(Merhaba|Hoş geldin)/)).toBeVisible();
  });

  test('F02-H2 kredi rozeti Kredilerim ekranını açar', async ({ page }) => {
    await page.getByRole('button', { name: `Kredi bakiyesi ${WELCOME_CREDITS}` }).click();
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
