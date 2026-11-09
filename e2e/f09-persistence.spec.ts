import { DESIGN_COST, expect, expectBalance, generateButton, choosePalette, openBuilder, readCredits, seedCredits, signIn, test } from './helpers';

test.describe('F09 kalıcılık', () => {
  test('F09-H1 bakiye ve koleksiyon yenileme sonrası korunur', async ({ page }) => {
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();

    await page.reload();
    const signInButton = page.getByRole('button', { name: 'Google ile Giriş Yap' });
    if (await signInButton.isVisible()) await signInButton.click();
    await expect(page.getByText(/^(Merhaba|Hoş geldin)/)).toBeVisible();
    await expectBalance(page, 30 - DESIGN_COST);
    await page.getByRole('tab', { name: 'Koleksiyon' }).click();
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeHidden();
  });

  test('F03-E6 üretim sürerken geri dönmek bakiyeyi ve kaydı tutarlı bırakır', async ({ page, gemini }) => {
    gemini.mode = 'slow';
    await seedCredits(page, 30);
    await signIn(page);
    await openBuilder(page);
    await choosePalette(page);
    await generateButton(page).click();
    await expect(page.getByText('Pastan fırında yükseliyor')).toBeVisible();
    await page.getByRole('button', { name: 'Geri' }).click();
    await page.waitForTimeout(6_500);

    expect(await readCredits(page)).toBe(30 - DESIGN_COST);
    await page.getByRole('button', { name: 'Geri' }).click();
    await page.getByRole('tab', { name: 'Koleksiyon' }).click();
    await expect(page.getByText('Koleksiyonun Henüz Boş')).toBeHidden();
  });

  test('F09-E1 iki sekmede harcama birbirini ezmez', async ({ page, context }) => {
    await seedCredits(page, 40);
    await signIn(page);
    const second = await context.newPage();
    await second.route('**/generativelanguage.googleapis.com/**', (route) =>
      route.fulfill({ status: 200, json: { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } }] } }] } }),
    );
    await signIn(second);

    for (const tab of [page, second]) {
      await openBuilder(tab);
      await choosePalette(tab);
      await generateButton(tab).click();
      await expect(tab.getByRole('button', { name: 'Fotoğrafı Büyüt' })).toBeVisible();
    }

    // Two designs from 40 must both be charged, not just the last one.
    expect(await readCredits(page)).toBe(40 - 2 * DESIGN_COST);
  });
});
