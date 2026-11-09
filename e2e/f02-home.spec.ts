import { expect, openCreditsStore, signIn, test, WELCOME_CREDITS } from './helpers';

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

  test('F02-H2 Hesabım sekmesindeki Kredi Yükle Kredilerim ekranını açar', async ({ page }) => {
    await openCreditsStore(page);
    await expect(page.getByRole('button', { name: /200 Kredi satın al/ })).toBeVisible();
  });

  test('F02-H6 üstteki kredi rozeti bakiyeyi gösterir ve Kredilerim ekranını açar', async ({ page }) => {
    await page.getByRole('button', { name: `Kredi bakiyesi ${WELCOME_CREDITS}` }).click();
    await expect(page.getByText('Kredilerim')).toBeVisible();
  });

  test('F02-H4 tür seçimi dört türü gösterir', async ({ page }) => {
    await page.getByRole('button', { name: 'Pasta türü: Özel' }).click();
    await expect(page.getByText('Hangi pastayı tasarlayalım?')).toBeVisible();
    for (const type of ['Düğün Pastası', 'Nişan Pastası', 'Doğum Günü Pastası', 'Özel Gün Pastası']) {
      await expect(page.getByRole('button', { name: type })).toBeVisible();
    }
    await expect(page.getByRole('button', { name: 'Kendi Pastanı Yarat' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Doğum Günü Pastası' }).click();
    await expect(page.getByRole('button', { name: 'Pasta türü: Doğum Günü' })).toBeVisible();
  });

  test('F02-H5 tür seçimi kapatılabilir', async ({ page }) => {
    await page.getByRole('button', { name: /^Pasta türü:/ }).click();
    await expect(page.getByText('Hangi pastayı tasarlayalım?')).toBeVisible();
    await page.getByRole('button', { name: 'Kapat' }).last().click();
    await expect(page.getByText('Hangi pastayı tasarlayalım?')).toBeHidden();
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
