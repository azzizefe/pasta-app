import { expect, expectDialog, generateButton, choosePalette, openBuilder, signIn, test } from './helpers';

test.describe('F06 koleksiyon', () => {
  test('F06-E1 yeni kullanıcıda boş durum', async ({ page }) => {
    await signIn(page);
    await page.getByRole('tab', { name: 'Saved' }).click();
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeVisible();
    await expect(page.getByText('İlk Pastanı Tasarla')).toBeVisible();
  });

  test('F06-H1 ve F06-H2 üretilen tasarım listede görünür ve silinir', async ({ page }) => {
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();

    await page.getByRole('button', { name: 'Geri' }).click();
    await page.getByRole('button', { name: 'Geri' }).click();
    await page.getByRole('tab', { name: 'Saved' }).click();
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeHidden();

    await page.getByText('Düğün Pastası').last().click();
    await expectDialog(page, () => page.getByRole('button', { name: 'Sil' }).click(), /sil/i);
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeVisible();
  });
});
