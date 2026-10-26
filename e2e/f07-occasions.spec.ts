import { expect, expectDialog, signIn, test } from './helpers';

test.describe('F07 özel gün takvimi', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Özel Gün Takvimi ve Hatırlatıcılar' }).click();
    await page.getByRole('button', { name: 'Yeni özel gün ekle' }).click();
  });

  test('F07-H1 yeni özel gün listeye eklenir', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    await page.getByPlaceholder('Örn: Ayşe, Mehmet, Annem').fill('Zeynep');
    await page.getByRole('button', { name: 'Hatırlatıcıyı Kaydet' }).click();
    await expect(page.getByText('Zeynep', { exact: true })).toBeVisible();
  });

  test('F07-N1 boş adla kaydetme uyarı verir', async ({ page }) => {
    await expectDialog(page, () => page.getByRole('button', { name: 'Hatırlatıcıyı Kaydet' }).click(), /Eksik Bilgi/);
  });

  test('F07-H2 seçilen hatırlatma süresi kaydedilir', async ({ page }) => {
    await page.getByPlaceholder('Örn: Ayşe, Mehmet, Annem').fill('Deniz');
    await page.getByRole('button', { name: 'Hatırlatma: 1 hafta önce' }).click();
    await expect(page.getByText('1 hafta önce hatırlatılırsın')).toBeVisible();
    await expectDialog(
      page,
      () => page.getByRole('button', { name: 'Hatırlatıcıyı Kaydet' }).click(),
      /(1 hafta önce|yakın olduğu için).*bildirim gelecek/,
    );
    await expect(page.getByText('Deniz', { exact: true })).toBeVisible();
  });

  test('F07-E1 Şubat seçilince 30-31 sunulmaz, gün geçerli güne çekilir', async ({ page }) => {
    await page.getByRole('button', { name: 'Ocak', exact: true }).click();
    await page.getByRole('button', { name: /^31 Ocak,/ }).click();
    await page.getByRole('button', { name: 'Şubat', exact: true }).click();
    await expect(page.getByRole('button', { name: /^3[01] Şubat,/ })).toHaveCount(0);
    await expect(page.getByText(/^2[89] Şubat/)).toBeVisible();
  });
});
