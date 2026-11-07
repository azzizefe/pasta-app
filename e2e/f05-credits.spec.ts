import { expect, readCredits, signIn, test, WELCOME_CREDITS } from './helpers';

test.describe('F05 kredi mağazası', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: `Kredi bakiyesi ${WELCOME_CREDITS}` }).click();
    await expect(page.getByText('Kredilerim')).toBeVisible();
  });

  test('F05-H1 paketler ve tasarruf oranları', async ({ page }) => {
    await expect(page.getByRole('button', { name: '15 Kredi satın al' })).toBeVisible();
    await expect(page.getByRole('button', { name: '200 Kredi satın al, yüzde 24 tasarruf' })).toBeVisible();
    await expect(page.getByRole('button', { name: '1000 Kredi satın al, yüzde 39 tasarruf' })).toBeVisible();
    // Prices follow the app locale (tr-TR in tests), so the decimal separator is a comma.
    await expect(page.getByText('$33,20')).toBeVisible();
    await expect(page.getByText('$166,00')).toBeVisible();
  });

  test('F05-H2 200 kredi satın alma bakiyeye 200 ekler', async ({ page }) => {
    await page.getByRole('button', { name: /^200 Kredi satın al/ }).click();
    await expect.poll(() => readCredits(page), { timeout: 10_000 }).toBe(WELCOME_CREDITS + 200);
  });

  test('F05-E1 çift tıklama tek satın alma yapar', async ({ page }) => {
    await page.getByRole('button', { name: /^200 Kredi satın al/ }).dblclick();
    await expect.poll(() => readCredits(page), { timeout: 10_000 }).toBe(WELCOME_CREDITS + 200);
    await page.waitForTimeout(2500);
    expect(await readCredits(page)).toBe(WELCOME_CREDITS + 200);
  });
});
