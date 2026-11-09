import { expect, expectBalance, expectDialog, generateButton, choosePalette, openBuilder, signIn, test, WELCOME_CREDITS } from './helpers';

test.describe('F08 profil', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
  });

  test('F08-H1 Yardım Merkezi araması filtreler', async ({ page }) => {
    await page.getByRole('tab', { name: 'Hesabım' }).click();
    await page.getByRole('button', { name: 'Yardım Merkezi' }).click();
    await page.getByPlaceholder('Ne öğrenmek istersin?').fill('bildirim');
    await expect(page.getByText('Hatırlatma bildirimi ne zaman gelir?')).toBeVisible();
    await expect(page.getByText('Hesabımı nasıl silerim?')).toBeHidden();
  });

  test('F08-H2 Sorun Bildir 10 karakterden sonra aktifleşir', async ({ page }) => {
    await page.getByRole('tab', { name: 'Hesabım' }).click();
    await page.getByRole('button', { name: 'Sorun Bildir' }).click();
    const send = page.getByRole('button', { name: 'E-posta ile Gönder' });
    await expect(send).toHaveAttribute('aria-disabled', 'true');
    await page.getByPlaceholder(/Düğün pastası oluştururken/).fill('Görsel yüklenmedi bugün');
    await expect(send).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('F08-H3 Çıkış Yap giriş ekranına döner', async ({ page }) => {
    await page.getByRole('tab', { name: 'Hesabım' }).click();
    await page.getByRole('button', { name: 'Çıkış Yap' }).click();
    await expect(page.getByRole('button', { name: 'Google ile Giriş Yap' })).toBeVisible();
  });

  test('F08-N1 Hesabı Sil verileri gerçekten siler', async ({ page }) => {
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    await page.getByRole('button', { name: 'Geri' }).click();
    await page.getByRole('button', { name: 'Geri' }).click();

    await page.getByRole('tab', { name: 'Hesabım' }).click();
    // Account deletion lives in the Profil & Hesap sheet.
    await page.getByRole('button', { name: /Profil & Hesap/ }).click();
    await expectDialog(page, () => page.getByRole('button', { name: 'Hesabı Sil' }).click(), /sil/i);
    await expect(page.getByRole('button', { name: 'Google ile Giriş Yap' })).toBeVisible();

    await page.getByRole('button', { name: 'Google ile Giriş Yap' }).click();
    await expect(page.getByText(/^(Merhaba|Hoş geldin)/)).toBeVisible();
    await expectBalance(page, WELCOME_CREDITS);
    await page.getByRole('tab', { name: 'Koleksiyon' }).click();
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeVisible();
  });
});
