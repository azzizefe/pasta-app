import AxeBuilder from '@axe-core/playwright';
import { expect, openBuilder, signIn, test } from './helpers';

async function scan(page: import('@playwright/test').Page) {
  const result = await new AxeBuilder({ page }).analyze();
  return result.violations.map((v) => `${v.impact} ${v.id}: ${v.help} (${v.nodes.length})`);
}

test.describe('Erişilebilirlik (axe)', () => {
  // BUG-005 is still open for color-contrast, label-content-name-mismatch and region;
  // Playwright flags these as unexpected passes once they are fixed.
  test.fail();

  test('F01-E3 giriş ekranı', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Sign in with Google' })).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });

  test('F02-E2 ana sayfa', async ({ page }) => {
    await signIn(page);
    expect(await scan(page)).toEqual([]);
  });

  test('pasta oluşturma ekranı', async ({ page }) => {
    await signIn(page);
    await openBuilder(page);
    expect(await scan(page)).toEqual([]);
  });

  test('Kredilerim ekranı', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Kredi bakiyesi 30' }).click();
    await expect(page.getByText('Kredilerim')).toBeVisible();
    expect(await scan(page)).toEqual([]);
  });
});
