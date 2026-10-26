import { expect, generateButton, choosePalette, openBuilder, readCredits, seedCredits, signIn, test } from './helpers';

test.describe('F04 sonuç işlemleri', () => {
  test.beforeEach(async ({ page }) => {
    await seedCredits(page, 40);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
  });

  test('F04-H1 düzenle ve yeniden üret', async ({ page, gemini }) => {
    await page.getByRole('button', { name: 'Düzenle' }).click();
    await page.getByPlaceholder(/Üst kattaki süslemeleri/).fill('Üst kata beyaz güller ekle');
    await page.getByRole('button', { name: 'Düzenlemeyi Uygula' }).click();
    await expect(page.getByText(/DÜZENLEME TALİMATI/)).toBeVisible();
    expect(gemini.calls).toBe(2);
    // 40 - 20 (ilk tasarım) - 20 (düzenleme) = 0
    expect(await readCredits(page)).toBe(0);
  });

  test('F04-H2 tam ekran görüntüleyici açılır ve kapanır', async ({ page }) => {
    await page.getByRole('button', { name: 'Fotoğrafı Büyüt' }).click();
    const close = page.getByRole('button', { name: 'Kapat' });
    await expect(close).toBeVisible();
    await close.click();
    await expect(close).toBeHidden();
  });

  test('F04-H3 Kaydet favoriye ekler', async ({ page }) => {
    await page.getByRole('button', { name: 'Kaydet', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Kaydedildi' })).toBeVisible();
  });

  test('F04-E1 boş düzenleme notu kredi harcatmaz', async ({ page, gemini }) => {
    await page.getByRole('button', { name: 'Düzenle' }).click();
    await expect(page.getByRole('button', { name: 'Düzenlemeyi Uygula' })).toHaveAttribute('aria-disabled', 'true');
    expect(gemini.calls).toBe(1);
    // 40 - 20 (ilk tasarım); boş düzenleme kredi harcatmaz
    expect(await readCredits(page)).toBe(20);
  });
});
