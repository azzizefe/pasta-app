import type { Page, Request } from '@playwright/test';
import {
  chooseCakeType,
  composerGenerateButton,
  AI_CONSENT_KEY,
  DESIGN_COST,
  ENHANCED_PROMPT,
  expect,
  expectDialog,
  goToBuilderStep,
  readCredits,
  seedCredits,
  signIn,
  test,
} from './helpers';

const isImageRequest = (r: Request) =>
  r.method() === 'POST' && /generativelanguage\.googleapis\.com|\/api\/generate-cake/.test(r.url());

async function pick(page: Page, chip: RegExp, option: string) {
  await page.getByRole('button', { name: chip }).click();
  await page.getByRole('button', { name: option, exact: true }).click();
}

test.describe('F10 ana sayfa istem çubuğu', () => {
  test('F10-H1 yazı, tür, kişi ve kat ile doğrudan 4K üretir', async ({ page }) => {
    await seedCredits(page, 30);
    await signIn(page);

    await page.getByRole('textbox', { name: 'Pastanızı anlatın' }).fill('Lavanta ve beyaz çikolata');
    await chooseCakeType(page, 'Doğum Günü Pastası');
    await pick(page, /^Kişi sayısı:/, '25 Kişi');
    await pick(page, /^Kat sayısı:/, '3 Katlı');
    await expect(page.getByRole('button', { name: 'Kişi sayısı: 25 Kişi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Kat sayısı: 3 Katlı' })).toBeVisible();

    const request = page.waitForRequest(isImageRequest);
    await composerGenerateButton(page).click();
    const body = (await request).postData() ?? '';
    expect(body).toContain('4K');
    expect(body).toContain('Lavanta ve beyaz çikolata');
    expect(body).toContain('25 kişilik');
    expect(body).toContain('3 katlı');

    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    await expect.poll(() => readCredits(page)).toBe(30 - DESIGN_COST);

    // Going back lands on the full form, filled in from the prompt bar.
    await page.getByRole('button', { name: 'Geri' }).first().click();
    await expect(page.getByText('KAÇ KİŞİLİK?')).toBeVisible();
    await goToBuilderStep(page, 'Lezzet');
    await expect(page.getByText('EK İSTEKLERİN')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll('textarea, input')].map((e) => (e as HTMLInputElement).value)))
      .toContain('Lavanta ve beyaz çikolata');
  });

  test('F10-H2 seçenekler tek satırda, 375px genişlikte sığar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await signIn(page);
    await chooseCakeType(page, 'Doğum Günü Pastası');
    await pick(page, /^Kişi sayısı:/, '100 Kişi');
    await pick(page, /^Kat sayısı:/, '5 Katlı');
    const chips = [
      page.getByRole('button', { name: 'İlham fotoğrafı ekle' }),
      page.getByRole('button', { name: /^Pasta türü:/ }),
      page.getByRole('button', { name: /^Kişi sayısı:/ }),
      page.getByRole('button', { name: /^Kat sayısı:/ }),
    ];
    const tops = await Promise.all(chips.map(async (c) => (await c.boundingBox())!.y));
    expect(new Set(tops.map(Math.round)).size).toBe(1);
    await expect(page.getByRole('radio')).toHaveCount(0);
  });

  test('F10-E1 boş istemde uyarı verir, üretim yapılmaz', async ({ page, gemini }) => {
    await signIn(page);
    await expectDialog(page, () => composerGenerateButton(page).click(), /Eksik seçim/);
    await page.waitForTimeout(500);
    expect(gemini.calls).toBe(0);
    await expect(page.getByText('KAÇ KİŞİLİK?')).toBeHidden();
  });

  test('F10-N1 yetersiz kredide uyarı verir, üretim yapılmaz', async ({ page, gemini }) => {
    await seedCredits(page, 0);
    await signIn(page);
    await page.getByRole('textbox', { name: 'Pastanızı anlatın' }).fill('Çilekli pasta');
    await expectDialog(page, () => composerGenerateButton(page).click(), /Yetersiz Kredi/, false);
    await page.waitForTimeout(500);
    expect(gemini.calls).toBe(0);
    expect(await readCredits(page)).toBe(0);
  });

  test.describe('istem iyileştirici', () => {
    const enhanceButton = (page: Page) => page.getByRole('button', { name: 'İstemi yapay zekayla iyileştir' });
    const promptBox = (page: Page) => page.getByRole('textbox', { name: 'Pastanızı anlatın' });

    test('F10-H3 yazıyı iyileştirir, kredi harcamaz ve geri alınabilir', async ({ page, gemini }) => {
      await seedCredits(page, 30);
      await signIn(page);
      await chooseCakeType(page, 'Doğum Günü Pastası');
      await promptBox(page).fill('lavanta pasta altın');

      await enhanceButton(page).click();
      await expect(page.getByText('İyileştiriliyor…')).toBeVisible();
      await expect(promptBox(page)).toHaveValue(ENHANCED_PROMPT);
      expect(gemini.enhance.calls).toBe(1);
      expect(gemini.enhance.bodies[0]).toMatchObject({ prompt: 'lavanta pasta altın', kind: 'birthday', language: 'tr' });
      expect(gemini.calls).toBe(0);
      expect(await readCredits(page)).toBe(30);

      await page.getByRole('button', { name: 'Geri al' }).click();
      await expect(promptBox(page)).toHaveValue('lavanta pasta altın');
      await expect(page.getByRole('button', { name: 'Geri al' })).toHaveCount(0);

      // The enhanced text is what gets generated.
      await enhanceButton(page).click();
      await expect(promptBox(page)).toHaveValue(ENHANCED_PROMPT);
      const request = page.waitForRequest(isImageRequest);
      await composerGenerateButton(page).click();
      expect((await request).postData() ?? '').toContain(ENHANCED_PROMPT);
    });

    test('F10-E2 boş ya da çok kısa yazıda istek gönderilmez', async ({ page, gemini }) => {
      await signIn(page);
      await expect(enhanceButton(page)).toHaveAttribute('aria-disabled', 'true');
      await enhanceButton(page).click({ force: true });
      await promptBox(page).fill('ab');
      await enhanceButton(page).click({ force: true });
      await page.waitForTimeout(600);
      expect(gemini.enhance.calls).toBe(0);
      await promptBox(page).fill('abc');
      await expect(enhanceButton(page)).not.toHaveAttribute('aria-disabled', 'true');
    });

    test('F10-N2 sunucu hatasında uyarı verir, yazı korunur', async ({ page, gemini }) => {
      gemini.enhance.mode = 'error';
      await signIn(page);
      await promptBox(page).fill('Çilekli pasta');
      await expectDialog(page, () => enhanceButton(page).click(), /İyileştirilemedi/);
      await expect(promptBox(page)).toHaveValue('Çilekli pasta');
      await expect(page.getByRole('button', { name: 'Geri al' })).toHaveCount(0);
    });

    test('F10-N3 yapay zeka izni verilmezse istek gönderilmez', async ({ page, gemini }) => {
      await page.addInitScript((key) => window.localStorage.removeItem(key), AI_CONSENT_KEY);
      await signIn(page);
      await promptBox(page).fill('Çilekli pasta');
      await enhanceButton(page).click();
      await expect(page.getByText('Yapay zeka ile tasarım')).toBeVisible();
      await page.getByText('Vazgeç', { exact: true }).click();
      await page.waitForTimeout(500);
      expect(gemini.enhance.calls).toBe(0);
      await expect(promptBox(page)).toHaveValue('Çilekli pasta');
    });
  });
});
