import {
  expect,
  expectDialog,
  generateButton,
  goToBuilderStep,
  choosePalette,
  DESIGN_COST,
  openBuilder,
  readCredits,
  seedCredits,
  signIn,
  test,
} from './helpers';

test.describe('F03 pasta tasarla ve üret', () => {
  test('F03-H1 üretim: görsel, tarif ve 15 kredi kesinti', async ({ page, gemini }) => {
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();

    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    await expect(page.getByText(/^Fildişi & altın renklerinde bir düğün pastası tasarla/)).toBeVisible();
    expect(gemini.calls).toBe(1);
    expect(await readCredits(page)).toBe(30 - DESIGN_COST);
  });

  test('F03-E1 boş form uyarı verir ve kredi düşmez', async ({ page, gemini }) => {
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await expectDialog(page, () => generateButton(page).click(), /Eksik seçim/);
    expect(gemini.calls).toBe(0);
    expect(await readCredits(page)).toBe(30);
  });

  test('F03-E2 2.000 karakterlik ek istekle üretim çalışır', async ({ page, gemini }) => {
    await signIn(page);
    await openBuilder(page);
    await goToBuilderStep(page, 'Lezzet');
    const long = 'çilekli '.repeat(250);
    await page.getByPlaceholder('Örneğin: çilekli iç harç, üzerinde isim yazısı...').fill(long);
    await generateButton(page).click();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    expect(gemini.calls).toBe(1);
  });

  test('F03-E3 emoji ve Türkçe karakterler tarifte korunur', async ({ page }) => {
    await signIn(page);
    await openBuilder(page);
    await goToBuilderStep(page, 'Lezzet');
    await page.getByPlaceholder('Örneğin: çilekli iç harç, üzerinde isim yazısı...').fill('İyi ki doğdun Şule 🎂');
    await generateButton(page).click();
    await expect(page.getByText(/Ek istek: İyi ki doğdun Şule 🎂/)).toBeVisible();
  });

  test('F03-E4 çift tıklama tek üretim ve tek kesinti yapar', async ({ page, gemini }) => {
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).dblclick();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    await page.waitForTimeout(1500);
    expect(gemini.calls).toBe(1);
    expect(await readCredits(page)).toBe(30 - DESIGN_COST);
  });

  test('F03-E5 yavaş ağda yükleme ekranı görünür', async ({ page, gemini }) => {
    gemini.mode = 'slow';
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByText('Pastan fırında yükseliyor')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible({ timeout: 20_000 });
  });

  test('F03-N1 yetersiz kredide uyarı verir, kesinti yok', async ({ page, gemini }) => {
    await seedCredits(page, 10);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await expectDialog(page, () => generateButton(page).click(), /Yetersiz Kredi/, false);
    expect(gemini.calls).toBe(0);
    expect(await readCredits(page)).toBe(10);
  });

  test('F03-N2 Gemini 500 hatasında kredi iade edilir (bakiye 30 kalır)', async ({ page, gemini }) => {
    gemini.mode = 'error';
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByText('Görsel Oluşturulamadı')).toBeVisible();
    expect(await readCredits(page)).toBe(30);
  });

  test('F03-N3 çevrimdışıyken kredi iade edilir (bakiye 30 kalır)', async ({ page, gemini }) => {
    gemini.mode = 'offline';
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByText('Görsel Oluşturulamadı')).toBeVisible();
    expect(await readCredits(page)).toBe(30);
  });
});
